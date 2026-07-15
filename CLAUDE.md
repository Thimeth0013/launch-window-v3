# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server on http://localhost:3000
- `npm run build` — production build (runs `generateStaticParams` against MongoDB, so a reachable `MONGODB_URI` is required at build time)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` and `next/typescript`)

There is no test framework configured.

## Required environment (`.env.local`)

- `MONGODB_URI` — Mongoose connection string
- `YOUTUBE_API_KEY` — YouTube Data API v3 key (stream matching silently skips if absent)
- `NASA_API_KEY` — api.nasa.gov key for the homepage APOD block (skips silently if absent — the block falls back to a placeholder)
- `N2YO_API_KEY` — n2yo.com key for the `/tracker` satellite position feed; `fetchN2yoLocations()` throws if absent, so `/api/satellites/positions` will 500 until it's set
- `CRON_SECRET` — shared secret for the `/api/cron/prefetch` endpoint. Required for the route to do any work. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically; external pingers (UptimeRobot etc.) must be configured to send the same header.
- `NEXT_PUBLIC_API_URL` — base URL used by client components when hitting our own API routes

## Architecture

The app is a Next.js 16 App Router project (React 19, Tailwind v4, Mongoose 9). It tracks upcoming launches from The Space Devs Launch Library 2 API (`https://ll.thespacedevs.com/2.3.0`), spaceflight news articles from SNAPI v4 (`https://api.spaceflightnewsapi.net/v4`), and YouTube livestreams. The non-obvious parts are the **caching/sync strategy** and the **id vs. slug discipline**.

### Sync model (lazy, layered)

We never run a cron — sync is triggered by request traffic. Six layers, each with its own cadence:

1. **Global launch manifest sync (normal mode)** (`GET /api/launches`, plus `ensureFreshLaunches()` called from `/launches/[slug]`): if `LaunchSync.GLOBAL_LAUNCH_SYNC.lastUpdated` is older than 1 hour, call `fetchUpcomingLaunches()` (`app/lib/services/launchService.ts`), which pulls `launches/upcoming/?mode=normal&limit=30` — **normal mode, not detailed**. Normal mode brings `launch_service_provider`, `pad`, `mission`, and `rocket.configuration` (which the list cards need) but skips the heavy launcher/spacecraft stages, timelines, mission patches, and agency history that detailed mode bundles. Roughly 5× smaller than detailed and stays comfortably inside the API's 15-call/hour rate limit. On sync failure the route still serves stale Mongo data. If `detectSignificantChanges` (>24h slip or Go→TBD/TBC regression) fires on an existing doc, the associated `StreamSync` **and** `LaunchDetailed` cache are both invalidated so the next opening of that launch re-fetches fresh.
2. **Per-launch detailed fetch (on demand)** (`GET /api/launches/[slug]` and the `/launches/[slug]` page, via `getOrFetchLaunchDetailedBySlug()`): looks up the id from the list manifest, then reads `LaunchDetailed` (separate collection). If the cache is missing or stale, calls `fetchLaunchDetailed(id)` → `launches/upcoming/{id}/?mode=detailed`. Freshness TTL is **1h normally, 5 min inside the T-2h → T+10min critical window** so scrubs propagate quickly without hammering the API. The detailed fetch also pushes the latest date/status back into the `Launch` list doc so the manifest stays accurate without waiting on the hourly sync. Falls back to the list doc if the detailed fetch fails outright — slug page still renders rather than 404-ing on a transient upstream error. Cache header drops to `s-maxage=300` inside the critical window, `s-maxage=1800` otherwise.

   **Idle-time prefetch** (`GET /api/cron/prefetch`, `maxDuration: 60`): a dedicated cron endpoint that calls `prefetchDetailedLaunches()`. The function hits `/2.3.0/api-throttle/` (which does **not** count against the budget), subtracts `PREFETCH_RESERVE_CALLS` (default 5) from the remaining budget, then spends up to `PREFETCH_MAX_PER_RUN` (default 10) calls warming the `LaunchDetailed` cache for the upcoming launches closest to T-0. Launches whose cache is already inside the 1h TTL are skipped. This soaks up budget that would otherwise expire at the hour boundary and reduces the chance of a real-traffic spike hitting the 15-call/hour limit. The reserve keeps headroom for user-triggered detail fetches during the rest of the hour. Tune via `PREFETCH_RESERVE_CALLS`, `PREFETCH_MAX_PER_RUN`, and `PREFETCH_INTER_CALL_MS` at the top of `launchService.ts`. The endpoint requires an `Authorization: Bearer <CRON_SECRET>` header — Vercel Cron sends it automatically; external pingers (UptimeRobot, etc.) must be configured to send it too.
3. **Stream sync** (`GET /api/launches/[slug]/streams`): `getOrSyncStreams` in `youtubeService.ts` has a **proximity gate** — launches more than `PROXIMITY_WINDOW_HOURS` (48) out skip the YouTube API entirely and return whatever is cached, since channels rarely schedule streams that early. Inside the window, an adaptive TTL applies: 30 min when launch is within ±24h, 12 h otherwise. `?force=true` bypasses both the proximity gate and the TTL. Results are stored in the `StreamSync` collection keyed by `launchId`.
4. **Article sync** (`GET /api/articles`, plus `ensureFreshArticles()` called from `/` and `/articles`): if `ArticleSync.GLOBAL_ARTICLE_SYNC.lastUpdated` is older than 1 hour, call `fetchLatestArticles()` (`app/lib/services/articleService.ts`), which pulls `/v4/articles/?ordering=-published_at&limit=25` from SNAPI and upserts every article. **The sync timestamp is advanced even on failure** — this enforces a real 1h cool-down on rate-limit (429) responses instead of every page request hammering SNAPI. `Article.id` is a numeric integer (not a UUID) — SNAPI uses sequential IDs. There is **no internal article detail page**: both the homepage's carousel article slide (`LandingCarousel.tsx`) and the `ArticlesFeed.tsx` rows on `/articles` link directly to the external `article.url` in a new tab. SNAPI doesn't expose full article bodies, only summaries, so all reading happens on the source site. (`components/ui/ArticleCard.tsx` still exists but is unused — nothing imports it.)
5. **Starship dashboard sync** (`getStarshipDashboard()` in `app/lib/services/starshipService.ts`, called from `/starship`): hits `/2.3.0/dashboard/starship/` and caches the full payload (updates, live streams, road closures, notices, vehicles/boosters, orbiters/ships, upcoming + previous launches and events) into the `StarshipDashboard` singleton collection. Refresh TTL is **30 minutes**. On fetch failure the page falls back to whatever's already in the cache. The dashboard endpoint counts against the 15-call/hour TSD budget — the 30-min cache keeps it at ~2 calls/hour worst case. The payload is stored with `strict: false` so the upstream shape lands at the doc's top level without mirroring the schema field-by-field.
6. **Satellite position sync** (`GET /api/satellites/positions`, plus `ensureFreshSatellites()` called from `/tracker`): unrelated to the Launch Library — pulls live XYZ positions from **N2YO** (`https://api.n2yo.com/rest/v1/satellite`), not TSD. `ensureFreshSatellites()` in `app/lib/services/n2yoService.ts` checks the `SatellitePositions` collection per satellite in `SATELLITE_CONFIGS` (ISS, Hubble, Tiangong, etc., keyed by NORAD id) and refetches any whose cache is older than 3.5 min or whose 5-minute position window (N2YO's max) ends in under a minute. Geodetic lat/lon/alt samples are converted to ECEF x/y/z (WGS-84) for `SatelliteScene.tsx` (Three.js) to plot directly. A satellite whose fetch fails keeps serving its last-known samples with `stale: true` rather than blocking the page. The route's own `revalidate = 180` roughly matches the service TTL.

`lightCheckService.ts` defines a smarter pattern (`LaunchPhase` = STANDBY/APPROACH/TERMINAL, light `mode=list` check before a heavy `mode=detailed` fetch, in-memory 15-calls/hour rate-limit guard) but is **not currently wired into any route**. Prefer extending it over adding a new ad-hoc fetcher if you need finer-grained sync. Likewise, `scrubDetectionScheduler.ts` (a per-launch `checkForScrub()` helper) has no caller anywhere in `app/` — the live scrub-detection path is `detectSignificantChanges` inside `launchService.ts`'s manifest sync, not this file.

When `launchService.detectSignificantChanges` sees a >24h slip or a Go→TBD/TBC status regression, it **deletes the associated `StreamSync` document** so stale livestream cards don't linger after a scrub. Preserve this behaviour if you touch the upsert path.

### id vs. slug — get this right

- The Space Devs API is keyed by **`id`** (UUID). All upstream calls use `launches/{id}/`.
- Our own URLs and Mongo queries (everywhere user-facing) are keyed by **`slug`**.
- `Launch.id` is `unique` in the schema; `slug` is not. Pages route by slug, but services that re-fetch from the upstream API must use `launch.id`. Crossing these wires is the most common bug class here.

### Data layer

- `app/lib/db/mongodb.ts` caches the Mongoose connection on `globalThis.mongooseCache` to survive Next.js dev HMR.
- `next.config.ts` declares `mongoose` in `experimental.serverComponentsExternalPackages` — keep it there or RSC builds break.
- `app/lib/db/models/Launch.ts` mirrors the full Space Devs detailed payload (nested `Mixed` for payloads/timeline/programs). When upserting, dates (`net`, `window_start`, `window_end`, `last_updated`) **must be converted to `Date` objects** — Mongo will reject the upsert otherwise, and the legacy top-level `provider: string` field is derived from `launch_service_provider.name`.

### Client time sync

`app/lib/hooks/useServerTime.ts` calls `/api/time` (force-dynamic, no cache) and computes a client/server offset using half the round-trip time, re-syncing every 5 min. Mission clocks and the `TimelineEngine` rely on `getServerTime()` for countdowns — do not substitute `Date.now()` directly in countdown logic or clocks will drift on misconfigured clients.

### Homepage layout

`app/page.tsx` is a thin server component: it fetches the next launch (`getUpcomingLaunches`, falling back to a live `fetchUpcomingLaunches()` sync if Mongo is empty), the latest article (`ensureFreshArticles()` + `getLatestArticles`), and NASA's APOD (`getApod()`, Next.js fetch cache `revalidate: 3600`) in parallel, JSON-round-trips each to strip Mongoose documents down to plain objects, and hands them to the client component `LandingClientView.tsx`. All layout, copy, and animation live in that client component — `page.tsx` has no markup of its own beyond `AppHeader`.

`LandingClientView` is a **full scrolling marketing page** driven by GSAP + ScrollTrigger (`useGSAP`, scope-cleaned on unmount), not the old single-viewport data-block grid:
- **Hero**: full-height section that auto-cycles every ~5.6s through 5 hardcoded sentence/description/background-image sets (Launches, News, Starship, Satellite Tracker, Streams) — this copy is static marketing text, unrelated to the fetched `launch`/`article`/`apod` props. A sidebar "Telemetry" panel does surface live data (upcoming launch name, provider, last-sync time) via a scramble-in-place text effect (`ScrambledText`).
- **Featured Intel carousel** (`LandingCarousel`, slides built by `buildCarouselSlides(apod, launch, article)`): this is where the actual fetched APOD/launch/article payloads render. Pinned briefly via `ScrollTrigger` (`pin: true, pinSpacing: false`) so it holds the viewport for one full scroll before releasing.
- **Capabilities grid**: a `ScrollTrigger`-pinned section with a `+=200%` scroll runway; four cards (`/launches`, `/starship`, `/articles`, `/tracker`) animate from off-screen into a stacked, depth-scaled deck as the user scrolls through the pin.
- **Liftoff**: closing parallax CTA section linking back to `/launches`.

If you're touching hero/carousel/capabilities behavior, the GSAP timelines are all defined in one `useGSAP` block in `LandingClientView.tsx` — read the whole block before adding a new `ScrollTrigger`, since several triggers key off each other's `data-*` attribute selectors and section boundaries.

### Frontend

- App Router under `app/`. Server components fetch via the service layer directly (not via our own HTTP routes) — see `app/page.tsx` and `app/launches/[slug]/page.tsx`. The `/api/*` routes exist for client-side and external consumption.
- `app/launches/[slug]/page.tsx` uses `generateStaticParams` against the 50 nearest launches with `export const revalidate = 270` — new slugs become reachable after the next ISR revalidation.
- `components/ui/` holds shadcn-style primitives (configured for the `base-luma` style, `@react-bits` registry). `components/sections/` holds page-level composites. `components/sections/SatelliteScene.tsx` (rendered by `/tracker`) is the only Three.js consumer; `components/Particles.tsx` uses `ogl` for a separate WebGL particle effect. `components/ui/TimelineEngine.tsx` (the launch-detail mission timeline, driven by `useServerTime`) is plain DOM/CSS, not a canvas.
- Path alias: `@/*` → repo root. Use `@/components/...`, `@/lib/utils`, `@/app/lib/...`.

### External image domains

`next.config.ts` whitelists `thespacedevs-prod.nyc3.digitaloceanspaces.com`, `spacelaunchnow-prod-east.nyc3.digitaloceanspaces.com`, and `i.ytimg.com`. New launch image sources need to be added here before `next/image` will render them.

**Article images use plain `<img>` tags** (`components/sections/ArticlesFeed.tsx`, rendered on `/articles`) — SNAPI articles come from arbitrary news sites (SpaceNews, Ars Technica, NASASpaceflight.com, etc.) with image URLs on each outlet's own CDN. Maintaining an allow-list there is infeasible, so we bypass `next/image` for article visuals. Same precedent as `StreamsSection.tsx`, which uses `<img>` for YouTube thumbnails. Don't migrate these to `next/image` without adding the appropriate `remotePatterns` first.

## YouTube matcher notes

`youtubeService.ts` hardcodes a channel allow-list (`CHANNEL_CONFIGS`) and applies special-case logic for ISRO missions, Starlink groups, Starship flight numbers, and "high-profile" rockets (SLS/Starship/New Glenn/Falcon Heavy/Ariane 6/Vulcan), where matching falls back to mission/payload names with roman-numeral ↔ digit fuzzing (e.g. Artemis II ↔ Artemis 2). Two YouTube searches are issued per channel (`eventType=upcoming` and `eventType=live`), each filtered by `liveBroadcastContent` to exclude completed VODs. Per-run quota is soft-capped at 50 calls via `API_QUOTA_TRACKER`.
