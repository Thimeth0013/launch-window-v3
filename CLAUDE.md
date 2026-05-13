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
- `NEXT_PUBLIC_API_URL` — base URL used by client components when hitting our own API routes

## Architecture

The app is a Next.js 16 App Router project (React 19, Tailwind v4, Mongoose 9). It tracks upcoming launches from The Space Devs Launch Library 2 API (`https://ll.thespacedevs.com/2.3.0`), spaceflight news articles from SNAPI v4 (`https://api.spaceflightnewsapi.net/v4`), and YouTube livestreams. The non-obvious parts are the **caching/sync strategy** and the **id vs. slug discipline**.

### Sync model (lazy, layered)

We never run a cron — sync is triggered by request traffic. Four layers, each with its own cadence:

1. **Global launch manifest sync** (`GET /api/launches`, plus `ensureFreshLaunches()` called from `/launches/[slug]`): if `LaunchSync.GLOBAL_LAUNCH_SYNC.lastUpdated` is older than 1 hour, call `fetchUpcomingLaunches()` (`app/lib/services/launchService.ts`), which pulls `launches/upcoming/?mode=detailed&limit=30` and upserts every launch. On sync failure the route still serves stale Mongo data — never error out the user.
2. **Per-launch scrub detection** (`GET /api/launches/[slug]`): when the launch is in the T-2h → T+10min window, dynamically import `checkForScrub` (`scrubDetectionScheduler.ts`) and re-fetch that single launch by id. Cache header drops to `s-maxage=300` inside the critical window, `s-maxage=1800` otherwise.
3. **Stream sync** (`GET /api/launches/[slug]/streams`): `getOrSyncStreams` in `youtubeService.ts` has a **proximity gate** — launches more than `PROXIMITY_WINDOW_HOURS` (48) out skip the YouTube API entirely and return whatever is cached, since channels rarely schedule streams that early. Inside the window, an adaptive TTL applies: 30 min when launch is within ±24h, 12 h otherwise. `?force=true` bypasses both the proximity gate and the TTL. Results are stored in the `StreamSync` collection keyed by `launchId`.
4. **Article sync** (`GET /api/articles`, plus `ensureFreshArticles()` called from `/` and `/articles`): if `ArticleSync.GLOBAL_ARTICLE_SYNC.lastUpdated` is older than 1 hour, call `fetchLatestArticles()` (`app/lib/services/articleService.ts`), which pulls `/v4/articles/?ordering=-published_at&limit=25` from SNAPI and upserts every article. **The sync timestamp is advanced even on failure** — this enforces a real 1h cool-down on rate-limit (429) responses instead of every page request hammering SNAPI. `Article.id` is a numeric integer (not a UUID) — SNAPI uses sequential IDs. There is **no internal article detail page**: both `ArticleCard` on the homepage and the rows on `/articles` link directly to the external `article.url` in a new tab. SNAPI doesn't expose full article bodies, only summaries, so all reading happens on the source site.

`lightCheckService.ts` defines a smarter pattern (`LaunchPhase` = STANDBY/APPROACH/TERMINAL, light `mode=list` check before a heavy `mode=detailed` fetch, in-memory 15-calls/hour rate-limit guard) but is **not currently wired into any route**. Prefer extending it over adding a new ad-hoc fetcher if you need finer-grained sync.

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

`app/page.tsx` is a **single-viewport brutalist 3-block grid**, not a scrolling marketing page. The intent is a "mission control terminal" — three independent data blocks visible without scroll:
- **Block 01** (left, spans 2 rows): NASA Astronomy Picture of the Day (`getApod()` in `nasaService.ts`).
- **Block 02** (right top): next upcoming launch with a live `MiniCountdown` and "Mission Intel" CTA.
- **Block 03** (right bottom): latest news article, with an external "Read" CTA opening SNAPI's source URL.

The grid is `h-screen` with `md:overflow-hidden`. On mobile (`<md`) the grid collapses to a vertical stack and scroll is allowed. Each block has corner-tick accents, an index label (`[01]`, `[02]`, `[03]`), and degrades to a `BlockEmpty` placeholder if its data source fails. APOD uses Next.js fetch caching (`revalidate: 3600`) so the cosmic image only re-fetches once per hour — it changes daily anyway.

### Frontend

- App Router under `app/`. Server components fetch via the service layer directly (not via our own HTTP routes) — see `app/page.tsx` and `app/launches/[slug]/page.tsx`. The `/api/*` routes exist for client-side and external consumption.
- `app/launches/[slug]/page.tsx` uses `generateStaticParams` against the 50 nearest launches with `export const revalidate = 270` — new slugs become reachable after the next ISR revalidation.
- `components/ui/` holds shadcn-style primitives (configured for the `base-luma` style, `@react-bits` registry). `components/sections/` holds page-level composites. `components/LightPillar.tsx` and `TimelineEngine.tsx` use Three.js.
- Path alias: `@/*` → repo root. Use `@/components/...`, `@/lib/utils`, `@/app/lib/...`.

### External image domains

`next.config.ts` whitelists `thespacedevs-prod.nyc3.digitaloceanspaces.com`, `spacelaunchnow-prod-east.nyc3.digitaloceanspaces.com`, and `i.ytimg.com`. New launch image sources need to be added here before `next/image` will render them.

**Article images use plain `<img>` tags** (`components/ui/ArticleCard.tsx`, `app/articles/[id]/page.tsx`) — SNAPI articles come from arbitrary news sites (SpaceNews, Ars Technica, NASASpaceflight.com, etc.) with image URLs on each outlet's own CDN. Maintaining an allow-list there is infeasible, so we bypass `next/image` for article visuals. Same precedent as `StreamsSection.tsx`, which uses `<img>` for YouTube thumbnails. Don't migrate these to `next/image` without adding the appropriate `remotePatterns` first.

## YouTube matcher notes

`youtubeService.ts` hardcodes a channel allow-list (`CHANNEL_CONFIGS`) and applies special-case logic for ISRO missions, Starlink groups, Starship flight numbers, and "high-profile" rockets (SLS/Starship/New Glenn/Falcon Heavy/Ariane 6/Vulcan), where matching falls back to mission/payload names with roman-numeral ↔ digit fuzzing (e.g. Artemis II ↔ Artemis 2). Two YouTube searches are issued per channel (`eventType=upcoming` and `eventType=live`), each filtered by `liveBroadcastContent` to exclude completed VODs. Per-run quota is soft-capped at 50 calls via `API_QUOTA_TRACKER`.
