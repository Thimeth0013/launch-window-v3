import TimelineEngine from '@/components/ui/TimelineEngine';
import CrewRoster from './CrewRoster';
import {
  BarRow,
  D,
  Label,
  Rows,
  Stat,
  formatDate,
  formatLocalTime,
  formatNumber,
  formatShortDate,
  formatTMinus,
  formatUtcTime,
  humanDuration,
  inSentence,
  joinNodes,
  ordinal,
  parseRelativeTime,
} from './primitives';
import type { ChapterSpec, StoryContext } from './types';
import { FlightDots, OrbitLadder, RecoveryPaths, TrackRecord, WindowTimeline, type RecoveryKind, type RecoveryPath } from './visuals';

// Chapter builders. Each takes the launch and returns a ChapterSpec, or null
// when the launch has no data for that step — the story then simply skips it
// and renumbers. Every fact appears in exactly one chapter.

/* eslint-disable @typescript-eslint/no-explicit-any */

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const launchTime = (launch: any) => launch.net ?? launch.date ?? launch.window_start;

/* The mission — the briefing that opens the story ------------------------- */

export function missionChapter({ launch }: StoryContext): ChapterSpec | null {
  const m = launch.mission;
  if (!m) return null;

  const description: string | undefined = m.description?.trim();
  // The patch is the only image in the story (the hero no longer shows it).
  const patch = launch.mission_patches?.[0];
  const infoLinks = (m.info_urls ?? [])
    .filter((u: any) => u?.url)
    .slice(0, 2)
    .map((u: any) => ({ href: u.url, label: clip(u.title || u.type?.name || 'Mission info', 32) }));

  return {
    id: 'mission',
    title: 'The Mission',
    lede: description || (
      <>
        <D>{m.name ?? launch.name}</D> — the launch provider hasn&apos;t published a mission description yet.
      </>
    ),
    ledeSize: description && description.length > 240 ? 'prose' : 'display',
    split: 'text',
    figure: patch?.image_url ? { src: patch.image_url, alt: patch.name ?? `${m.name ?? 'Mission'} patch`, credit: patch.agency?.name } : null,
    links: infoLinks.length ? infoLinks : undefined,
  };
}

/* The rocket ---------------------------------------------------------- */

export function rocketChapter({ launch }: StoryContext): ChapterSpec | null {
  const c = launch.rocket?.configuration;
  if (!c) return null;

  const name = c.full_name || c.name;
  const maker = c.manufacturer?.name;
  const total = c.total_launch_count ?? 0;
  const ok = c.successful_launches ?? 0;
  const since = c.maiden_flight?.slice(0, 4);

  const lede = (
    <>
      This flight rides {article(name)} <D>{name}</D>
      {maker && (
        <>
          , built by <D>{maker}</D>
        </>
      )}
      .{' '}
      {total > 0 ? (
        <>
          It has flown <D>{formatNumber(total)}</D> {total === 1 ? 'time' : 'times'}
          {since && (
            <>
              {' '}
              since <D>{since}</D>
            </>
          )}
          {ok === total ? (
            <>
              {' '}
              — <D>every one</D> a success.
            </>
          ) : (
            <>
              {' '}
              — <D>{formatNumber(ok)}</D> of them successfully.
            </>
          )}
        </>
      ) : (
        <>This configuration hasn&apos;t flown before.</>
      )}
    </>
  );

  const specs = [
    { label: 'Height', value: c.length, unit: 'm' },
    { label: 'Diameter', value: c.diameter, unit: 'm' },
    { label: 'Liftoff mass', value: formatNumber(c.launch_mass), unit: 't' },
    { label: 'Thrust', value: formatNumber(c.to_thrust), unit: 'kN' },
    { label: 'Cost per launch', value: formatCost(c.launch_cost) },
  ].filter((s) => s.value);

  const payload = [
    { label: 'LEO', value: c.leo_capacity },
    { label: 'SSO', value: c.sso_capacity },
    { label: 'GTO', value: c.gto_capacity },
    { label: 'GEO', value: c.geo_capacity },
  ].filter((p) => p.value);
  const payloadMax = Math.max(0, ...payload.map((p) => p.value));
  const landings = c.attempted_landings ?? 0;

  // Headline specs sit right under the sentence; the bars go beside it.
  const aside =
    specs.length > 0 ? (
      <div data-scroll-stagger className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-2">
        {specs.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} unit={s.unit} />
        ))}
      </div>
    ) : undefined;

  const visual = (
    <div className="space-y-10">
      {payload.length > 0 && (
        <div>
          <Label className="mb-2">Payload it can lift</Label>
          {payload.map((p, i) => (
            <BarRow
              key={p.label}
              label={`To ${p.label}`}
              value={p.value}
              max={payloadMax}
              display={`${formatNumber(p.value)} kg`}
              dim={i > 0}
            />
          ))}
        </div>
      )}

      {(total > 0 || landings > 0) && (
        <div className="space-y-6">
          {total > 0 && (
            <TrackRecord
              label="Launches"
              ok={ok}
              total={total}
              note={c.consecutive_successful_launches > 1 ? `${formatNumber(c.consecutive_successful_launches)} successful in a row` : null}
            />
          )}
          {landings > 0 && <TrackRecord label="Booster landings" ok={c.successful_landings ?? 0} total={landings} />}
        </div>
      )}
    </div>
  );

  return {
    id: 'rocket',
    title: 'The Rocket',
    lede,
    aside,
    visual,
    links: [
      c.info_url && { href: c.info_url, label: 'Official site' },
      c.wiki_url && { href: c.wiki_url, label: 'Wikipedia' },
    ].filter(Boolean) as ChapterSpec['links'],
  };
}

/* The booster --------------------------------------------------------- */

export function boosterChapter({ launch }: StoryContext): ChapterSpec | null {
  const stages: any[] = launch.rocket?.launcher_stage ?? [];
  if (!stages.length) return null;

  const flightNo = (s: any) => s.launcher_flight_number ?? (s.launcher?.flights ?? 0) + 1;
  const first = stages[0];
  const serial = first.launcher?.serial_number;
  const n = flightNo(first);
  const gap = humanDuration(first.turn_around_time);

  let lede;
  if (stages.length > 1) {
    const serials = stages.map((s, i) => <D key={i}>{s.launcher?.serial_number ?? 'TBD'}</D>);
    lede = (
      <>
        <D>{stages.length}</D> boosters fly on this mission: {joinNodes(serials)}.
      </>
    );
  } else if (!serial) {
    lede = <>The booster for this flight hasn&apos;t been assigned yet.</>;
  } else if (n <= 1) {
    lede = (
      <>
        {boosterPrefix(serial)}<D>{serial}</D> is brand new — this is its <D>first flight</D>.
      </>
    );
  } else {
    lede = (
      <>
        {boosterPrefix(serial)}<D>{serial}</D> is flying for the <D>{ordinal(n)}</D> time
        {gap && (
          <>
            , <D>{gap}</D> after its last launch
          </>
        )}
        .
      </>
    );
  }

  // Numbers first, so even a booster's debut has something to read; the
  // flight-history dots only appear once there is a history to show.
  const visual = (
    <div className="space-y-12">
      {stages.map((s, i) => {
        const b = s.launcher ?? {};
        const flight = flightNo(s);
        const status: string | undefined = b.status?.name;
        const stats = [
          { label: 'This flight', value: `#${flight}`, accent: true, sub: flight === 1 ? 'Debut' : undefined },
          { label: 'Flown before', value: String(Math.max(0, flight - 1)), sub: flight === 1 ? 'Never flown' : undefined },
          status && {
            label: 'Status',
            value: status.charAt(0).toUpperCase() + status.slice(1),
            tone: /active/i.test(status) ? ('go' as const) : undefined,
          },
          s.turn_around_time && { label: 'Turnaround', value: humanDuration(s.turn_around_time), sub: 'Since last flight' },
          b.attempted_landings > 0 && {
            label: 'Landings',
            value: `${b.successful_landings ?? 0}/${b.attempted_landings}`,
            sub: 'Successful',
          },
        ].filter(Boolean) as Array<{ label: string; value: string; sub?: string; accent?: boolean; tone?: 'go' }>;

        return (
          <div key={s.id ?? i}>
            {stages.length > 1 && (
              <Label className="mb-3">
                {s.type} · <span className="text-white">{b.serial_number ?? 'TBD'}</span>
              </Label>
            )}
            <div data-scroll-stagger className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
              {stats.map((st) => (
                <Stat key={st.label} label={st.label} value={st.value} sub={st.sub} accent={st.accent} tone={st.tone} />
              ))}
            </div>
            {flight > 1 && (
              <div className="mt-8">
                <FlightDots flightNumber={flight} firstFlight={b.first_launch_date} serial={b.serial_number} />
              </div>
            )}
            <Rows
              className="mt-8"
              rows={[
                { label: 'Previous mission', value: s.previous_flight?.name?.split(' | ').pop() },
                { label: 'Last flew', value: formatDate(s.previous_flight_date) },
              ]}
            />
          </div>
        );
      })}
    </div>
  );

  return {
    id: 'booster',
    title: stages.length > 1 ? 'The Boosters' : 'The Booster',
    lede,
    visual,
  };
}

/* Crew / spacecraft --------------------------------------------------- */

export function aboardChapter({ launch }: StoryContext): ChapterSpec | null {
  const sc = launch.rocket?.spacecraft_stage?.[0];
  if (!sc) return null;

  const craft = sc.spacecraft ?? {};
  const cfg = craft.spacecraft_config ?? {};
  const craftName = craft.name || cfg.name;
  const crew: any[] = sc.launch_crew ?? [];
  // "Low Earth Orbit" as a destination is the Destination chapter's line, not this one's.
  const dest = sc.destination && !/orbit/i.test(sc.destination) ? sc.destination : null;
  const prior = craft.flights_count ?? 0;

  const bound = dest && (
    <>
      , bound for <D>{dest}</D>
    </>
  );
  const reuse =
    prior > 0 ? (
      <>
        {' '}
        It&apos;s the spacecraft&apos;s <D>{ordinal(prior + 1)}</D> flight.
      </>
    ) : null;

  const lede = crew.length ? (
    <>
      {crew.length <= 3 ? joinNodes(crew.map((m, i) => <D key={i}>{m.astronaut?.name}</D>)) : (
        <>
          <D>{crew.length}</D> astronauts
        </>
      )}{' '}
      will ride <D>{craftName}</D>
      {bound}.{reuse}
    </>
  ) : (
    <>
      <D>{craftName}</D> flies this mission{bound}.{reuse}
    </>
  );

  const visual = (
    <div className="space-y-10">
      {crew.length > 0 && <CrewRoster crew={crew} />}
      <Rows
        rows={[
          { label: 'Spacecraft', value: [cfg.name, cfg.agency?.abbrev].filter(Boolean).join(' · ') },
          { label: 'Type', value: cfg.type?.name },
          { label: 'Seats', value: cfg.crew_capacity ? String(cfg.crew_capacity) : null },
          { label: 'Human rated', value: cfg.human_rated === undefined ? null : cfg.human_rated ? 'Yes' : 'No' },
          { label: 'Design life', value: cfg.flight_life },
        ]}
      />
    </div>
  );

  return {
    id: 'aboard',
    title: crew.length ? 'The Crew' : 'The Spacecraft',
    lede,
    visual,
    links: cfg.wiki_link ? [{ href: cfg.wiki_link, label: `${cfg.name} on Wikipedia` }] : undefined,
  };
}

/* The pad ------------------------------------------------------------- */

export function padChapter({ launch }: StoryContext): ChapterSpec | null {
  const pad = launch.pad;
  if (!pad?.name) return null;

  const loc = pad.location;
  const padN = launch.pad_launch_attempt_count;
  const padY = launch.pad_launch_attempt_count_year;
  const siteN = launch.location_launch_attempt_count;
  const siteY = launch.location_launch_attempt_count_year;
  const hasCoords = typeof pad.latitude === 'number' && typeof pad.longitude === 'number';
  const mapUrl = pad.map_url || (hasCoords ? `https://www.google.com/maps?q=${pad.latitude},${pad.longitude}` : null);

  const lede = (
    <>
      Liftoff is from <D>{pad.name}</D>
      {loc?.name && (
        <>
          {' '}
          at <D>{loc.name}</D>
        </>
      )}
      .
      {padN ? (
        <>
          {' '}
          It will be the pad&apos;s <D>{ordinal(padN)}</D> launch
          {padY ? (
            <>
              {' '}
              and its <D>{ordinal(padY)}</D> this year
            </>
          ) : null}
          .
        </>
      ) : null}
    </>
  );

  const visual = (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-5">
      {hasCoords && (
        <div className="sm:col-span-2">
          <iframe
            title={`Satellite map of ${pad.name}`}
            src={`https://maps.google.com/maps?q=${pad.latitude},${pad.longitude}&t=k&z=14&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-video w-full border-0 bg-zinc-950 sm:aspect-square"
          />
        </div>
      )}
      <Rows
        className={hasCoords ? 'sm:col-span-3' : 'sm:col-span-5'}
        rows={[
          {
            label: 'Coordinates',
            value: hasCoords ? <span className="font-mono">{pad.latitude.toFixed(3)}°, {pad.longitude.toFixed(3)}°</span> : null,
          },
          { label: 'Time zone', value: loc?.timezone_name?.replace(/_/g, ' ') },
          { label: 'Site launches', value: siteN ? `${ordinal(siteN)}${siteY ? ` · ${ordinal(siteY)} this year` : ''}` : null },
          { label: 'Fastest pad turnaround', value: humanDuration(pad.fastest_turnaround) },
          { label: 'Pad status', value: pad.active === undefined ? null : pad.active ? 'Active' : 'Inactive', tone: pad.active ? 'go' : 'fail' },
        ]}
      />
    </div>
  );

  return {
    id: 'pad',
    title: 'The Pad',
    lede,
    visual,
    links: [
      mapUrl && { href: mapUrl, label: 'Open in Maps' },
      pad.wiki_url && { href: pad.wiki_url, label: 'Wikipedia' },
    ].filter(Boolean) as ChapterSpec['links'],
  };
}

/* The window ---------------------------------------------------------- */

export function windowChapter({ launch }: StoryContext): ChapterSpec | null {
  const start = launch.window_start;
  const end = launch.window_end ?? start;
  if (!start) return null;

  const tz = launch.pad?.location?.timezone_name;
  const local = formatLocalTime(start, tz);
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const p = launch.probability;
  const hasP = p !== null && p !== undefined;
  const tone = !hasP ? undefined : p >= 75 ? 'go' : p >= 50 ? 'warn' : 'fail';

  const lede = (
    <>
      {minutes <= 0 ? (
        <>
          It&apos;s an <D>instantaneous</D> window: liftoff at <D>{formatUtcTime(start)} UTC</D> on{' '}
          <D>{formatShortDate(start)}</D>
          {local && <> ({local} at the pad)</>}, with no time to wait out a delay.
        </>
      ) : (
        <>
          The window opens at <D>{formatUtcTime(start)} UTC</D> on <D>{formatShortDate(start)}</D>
          {local && <> ({local} at the pad)</>} and stays open for <D>{spanWords(minutes)}</D>.
        </>
      )}
      {hasP && (
        <>
          {' '}
          Forecasters give <D>{p}%</D> odds of acceptable weather.
        </>
      )}
    </>
  );

  const visual = (
    <div className="space-y-10">
      <WindowTimeline start={start} end={end} net={launchTime(launch)} timeZone={tz} />
      {hasP && (
        <div>
          <Label className="mb-1">Weather</Label>
          <BarRow label="Go odds" value={p} max={100} display={`${p}%`} tone={tone} />
        </div>
      )}
      {launch.weather_concerns && (
        <div>
          <Label className="mb-2 text-amber-400!">Concerns</Label>
          <p className="max-w-prose text-sm leading-relaxed text-zinc-300">{launch.weather_concerns}</p>
        </div>
      )}
    </div>
  );

  return { id: 'window', title: 'The Window', lede, visual };
}

/* The flight plan — the live timeline ------------------------------------- */

export function timelineChapter({ launch }: StoryContext): ChapterSpec | null {
  const raw: any[] = launch.timeline?.length ? launch.timeline : launch.rocket?.configuration?.timeline ?? [];
  const events = raw
    .map((e) => ({ e, t: parseRelativeTime(e.relative_time ?? '') }))
    .filter((x): x is { e: any; t: number } => x.t !== null)
    .sort((a, b) => a.t - b.t);
  if (!events.length) return null;

  const first = events[0];
  const last = events[events.length - 1];
  const spanMin = Math.round((last.t - first.t) / 60000);

  const lede =
    events.length === 1 ? (
      <>
        One milestone is published so far: <D>{first.e.type?.abbrev}</D> at <D>{formatTMinus(first.t)}</D>.
      </>
    ) : (
      <>
        The flight plan runs from <D>{first.e.type?.abbrev}</D> at <D>{formatTMinus(first.t)}</D> to{' '}
        <D>{last.e.type?.abbrev}</D> at <D>{formatTMinus(last.t)}</D>
        {spanMin > 0 ? (
          <>
            {' '}
            — <D>{events.length}</D> milestones in about <D>{spanWords(spanMin)}</D>
          </>
        ) : null}
        .
      </>
    );

  return {
    id: 'flight-plan',
    title: 'The Flight Plan',
    lede,
    visual: <TimelineEngine launchDate={new Date(launch.date)} launchId={launch.slug} timeline={raw} status={launch.status} />,
    // The rail scrolls sideways, so give it the full width.
    wide: true,
  };
}

/* The destination ----------------------------------------------------- */

export function destinationChapter({ launch }: StoryContext): ChapterSpec | null {
  const m = launch.mission;
  const orbit = m?.orbit;
  if (!orbit?.name && !m?.type) return null;

  const type = m.type ? m.type.toLowerCase() : null;
  const customers = (m.agencies ?? []).map((a: any) => <D key={a.id ?? a.name}>{a.name}</D>);
  const forWhom = customers.length ? <> for {joinNodes(customers)}</> : null;

  const lede = orbit?.name ? (
    <>
      The payload is headed for <D>{inSentence(orbit.name)}</D>
      {type && (
        <>
          {' '}
          on {article(type)} <D>{type}</D> mission
        </>
      )}
      {forWhom}.
    </>
  ) : (
    <>
      This is {article(type!)} <D>{type}</D> mission{forWhom}.
    </>
  );

  return {
    id: 'destination',
    title: 'The Destination',
    lede,
    visual: orbit ? <OrbitLadder abbrev={orbit.abbrev} name={orbit.name} /> : undefined,
  };
}

/* Coming home --------------------------------------------------------- */

const HOW: Record<RecoveryKind, string> = {
  catch: 'Tower catch',
  rtls: 'Return to launch site',
  asds: 'Drone ship landing',
  ocean: 'Ocean splashdown',
  parachute: 'Parachute landing',
  vertical: 'Vertical landing',
  expended: 'Expended',
  other: 'Landing',
};

/**
 * LL2 has no "catch" landing type — a tower catch arrives as RTLS to a launch
 * mount (Starship's "Orbital Launch Mount B"). Read the location and the
 * landing description so it's described as what it is.
 */
function classifyLanding(landing: any): RecoveryKind {
  if (!landing?.attempt) return 'expended';
  const abbrev = (landing.type?.abbrev ?? '').toUpperCase();
  const name = (landing.type?.name ?? '').toLowerCase();
  const text = `${landing.description ?? ''} ${landing.landing_location?.name ?? ''}`.toLowerCase();
  if (abbrev === 'EXP' || name.includes('expend')) return 'expended';
  if (/\bcatch|chopstick|launch mount|\btower\b/.test(text)) return 'catch';
  if (abbrev === 'RTLS') return 'rtls';
  if (abbrev === 'ASDS') return 'asds';
  if (abbrev === 'OCEAN' || /ocean|splash/.test(name)) return 'ocean';
  if (abbrev === 'PCL' || name.includes('parachute')) return 'parachute';
  if (abbrev === 'VL' || name.includes('vertical')) return 'vertical';
  return 'other';
}

export function recoveryChapter({ launch }: StoryContext): ChapterSpec | null {
  const entries = [
    ...(launch.rocket?.launcher_stage ?? [])
      .filter((s: any) => s.landing)
      .map((s: any) => ({
        who: s.launcher?.serial_number ?? `The ${s.type?.toLowerCase() ?? 'first'} stage`,
        landing: s.landing,
        fromOrbit: false,
      })),
    ...(launch.rocket?.spacecraft_stage ?? [])
      .filter((s: any) => s.landing)
      .map((s: any) => ({ who: s.spacecraft?.name ?? 'The spacecraft', landing: s.landing, fromOrbit: true })),
  ].map(
    (e: { who: string; landing: any; fromOrbit: boolean }): { who: string; landing: any; fromOrbit: boolean; kind: RecoveryKind; loc: any } => ({
      ...e,
      kind: classifyLanding(e.landing),
      loc: e.landing.landing_location,
    })
  );
  if (!entries.length) return null;

  // One sentence per vehicle, in flight order.
  let previousLoc: string | null = null;
  const sentences = entries.map((e, i) => {
    const locName: string | undefined = e.loc?.name;
    const sameAsBefore = locName && locName === previousLoc;
    previousLoc = locName ?? previousLoc;
    const at = locName ? (sameAsBefore ? <> at the same spot</> : <> at <D>{locName}</D></>) : null;
    const km = e.landing.downrange_distance ? (
      <>
        , <D>{formatNumber(e.landing.downrange_distance)} km</D> downrange
      </>
    ) : null;
    const lead = i === 0 && !e.fromOrbit ? 'After stage separation, ' : '';
    const who = <D>{e.who}</D>;

    let body;
    switch (e.kind) {
      case 'expended':
        body = <>{who} won&apos;t be recovered — it&apos;s <D>expended</D> on this flight.</>;
        break;
      case 'catch':
        body = e.fromOrbit ? (
          <>{who} will come back from space for a <D>tower catch</D>{at}.</>
        ) : (
          <>{lead}{who} will fly back to be <D>caught by the launch tower</D>{at}.</>
        );
        break;
      case 'rtls':
        body = <>{lead}{who} will fly back and touch down{at}, near the pad.</>;
        break;
      case 'asds':
        body = <>{lead}{who} will land on the drone ship{locName ? <> <D>{locName}</D></> : null}{km}.</>;
        break;
      case 'ocean':
        body = <>{lead}{who} will make an <D>ocean splashdown</D>{locName ? <> in the <D>{locName}</D></> : null}.</>;
        break;
      case 'parachute':
        body = <>{who} will come home under <D>parachutes</D>{at}.</>;
        break;
      case 'vertical':
        body = <>{lead}{who} will make a <D>vertical landing</D>{at}{km}.</>;
        break;
      default:
        body = <>{lead}{who} will attempt a <D>{(e.landing.type?.name ?? 'landing').toLowerCase()}</D>{at}.</>;
    }
    return <span key={i}>{i > 0 ? ' ' : ''}{body}</span>;
  });

  const paths: RecoveryPath[] = entries.map((e) => ({
    who: e.who,
    kind: e.kind,
    fromOrbit: e.fromOrbit,
    how: e.kind === 'other' ? e.landing.type?.name ?? HOW.other : HOW[e.kind],
    where: e.loc?.abbrev && e.loc.abbrev !== 'N/A' ? e.loc.abbrev : e.loc?.name,
    km: e.landing.downrange_distance || null,
  }));

  // Landing record for each distinct site that has one.
  const sites = new Map<string, any>();
  for (const e of entries) if (e.loc?.attempted_landings > 0) sites.set(e.loc.name, e.loc);

  const visual = (
    <div className="space-y-10">
      <RecoveryPaths padLabel={launch.pad?.name ?? 'Launch pad'} paths={paths} />
      {[...sites.values()].map((loc) => (
        <TrackRecord
          key={loc.name}
          label={`Landings at ${loc.abbrev && loc.abbrev !== 'N/A' ? loc.abbrev : loc.name}`}
          ok={loc.successful_landings ?? 0}
          total={loc.attempted_landings}
        />
      ))}
    </div>
  );

  return {
    id: 'recovery',
    title: 'Coming Home',
    lede: <>{sentences}</>,
    visual,
  };
}

/* The record books ---------------------------------------------------- */

export function recordsChapter({ launch }: StoryContext): ChapterSpec | null {
  const o = launch.orbital_launch_attempt_count;
  const oy = launch.orbital_launch_attempt_count_year;
  const p = launch.agency_launch_attempt_count;
  const py = launch.agency_launch_attempt_count_year;
  if (!o && !p) return null;

  const when = launchTime(launch);
  const year = when ? new Date(when).getUTCFullYear() : null;
  const provider = launch.launch_service_provider?.name ?? 'The provider';

  const lede = (
    <>
      {o ? (
        <>
          This is the <D>{ordinal(o)}</D> orbital launch attempt in history
          {oy && year ? (
            <>
              {' '}
              and the <D>{ordinal(oy)}</D> of {year}
            </>
          ) : null}
          .{' '}
        </>
      ) : null}
      {p ? (
        <>
          For <D>{provider}</D>, it&apos;s launch number <D>{formatNumber(p)}</D>.
        </>
      ) : null}
    </>
  );

  // Shares of a barely-started year ("1 of 2 — 50%") say nothing, so wait for 10.
  const shares = oy >= 10
    ? [
        { label: launch.launch_service_provider?.abbrev || provider, value: py },
        { label: 'This site', value: launch.location_launch_attempt_count_year },
        { label: 'This pad', value: launch.pad_launch_attempt_count_year },
      ].filter((s) => s.value)
    : [];

  const visual = shares.length ? (
    <div>
      <Label className="mb-2">
        Share of {year}&apos;s {formatNumber(oy)} orbital launches
      </Label>
      {shares.map((s, i) => (
        <BarRow
          key={s.label}
          label={s.label}
          value={s.value}
          max={oy}
          display={`${formatNumber(s.value)} · ${Math.round((s.value / oy) * 100)}%`}
          dim={i > 0}
        />
      ))}
    </div>
  ) : undefined;

  return { id: 'records', title: 'The Record Books', lede, visual };
}

/* The program --------------------------------------------------------- */

export function programChapter({ launch }: StoryContext): ChapterSpec | null {
  const programs: any[] = launch.program ?? [];
  if (!programs.length) return null;

  const first = programs[0];
  const kind = first.type?.name?.toLowerCase();
  const since = first.start_date?.slice(0, 4);

  const lede =
    programs.length === 1 ? (
      <>
        It&apos;s part of <D>{first.name}</D>
        {kind && (
          <>
            , {article(kind)} <D>{kind}</D>
          </>
        )}
        {since && (
          <>
            {' '}
            {first.end_date ? 'that ran from' : 'running since'} <D>{since}</D>
            {first.end_date && (
              <>
                {' '}
                to <D>{first.end_date.slice(0, 4)}</D>
              </>
            )}
          </>
        )}
        .
      </>
    ) : (
      <>It&apos;s part of {joinNodes(programs.map((p, i) => <D key={i}>{p.name}</D>))}.</>
    );

  const visual = (
    <div className="space-y-8">
      {programs.map((p, i) => (
        <div key={p.id ?? i}>
          {programs.length > 1 && <div className="mb-2 text-sm font-semibold text-white">{p.name}</div>}
          {p.description && <p className="line-clamp-5 text-sm leading-relaxed text-zinc-400">{p.description}</p>}
          {p.agencies?.length > 0 && (
            <Label className="mt-3">{p.agencies.map((a: any) => a.abbrev || a.name).join(' · ')}</Label>
          )}
        </div>
      ))}
    </div>
  );

  return {
    id: 'program',
    title: 'The Bigger Picture',
    lede,
    visual,
    links: programs
      .flatMap((p) => [p.info_url && { href: p.info_url, label: programs.length > 1 ? p.name : 'Official site' }, p.wiki_url && programs.length === 1 && { href: p.wiki_url, label: 'Wikipedia' }])
      .filter(Boolean) as ChapterSpec['links'],
  };
}

/* The mission log — closes the story -------------------------------------- */

export function logChapter({ launch }: StoryContext): ChapterSpec {
  const updates: any[] = [...(launch.updates ?? [])].sort(
    (a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
  );

  // One compact row per entry: when · who · what, across the full width.
  const visual = updates.length ? (
    <ol className="divide-y divide-white/[0.06]">
      {updates.map((u, i) => (
        <li
          key={u.id ?? i}
          className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-0.5 py-2 md:grid-cols-[11.5rem_10rem_1fr] md:gap-x-6"
        >
          <span className="whitespace-nowrap font-mono text-[12px] tabular-nums text-zinc-500">
            {formatDate(u.created_on)} · {formatUtcTime(u.created_on)} UTC
          </span>
          <span className="min-w-0 truncate text-[12px] font-medium text-[#FF6B35]">{u.created_by}</span>
          <span className="col-span-2 min-w-0 break-words text-[14px] leading-snug text-zinc-200 md:col-span-1">{u.comment}</span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-sm text-zinc-500">No updates have been posted yet. New entries appear here as the launch team posts them.</p>
  );

  return { id: 'log', title: 'Mission Log', visual, wide: true };
}

/* helpers ------------------------------------------------------------------ */

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}


/** "B1103" → "Booster B1103"; "Booster 22" already says it. */
function boosterPrefix(serial: string) {
  return /^booster\b/i.test(serial) ? '' : 'Booster ';
}

function spanWords(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const mins = m ? `${m} minute${m === 1 ? '' : 's'}` : '';
  return [hours, mins].filter(Boolean).join(' ');
}

function formatCost(cost?: string | number | null): string | null {
  const v = Number(cost);
  if (!cost || !Number.isFinite(v) || v <= 0) return null;
  return v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${Math.round(v / 1e6)}M`;
}
