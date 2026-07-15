"use client";

import { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  Megaphone,
  ArrowUpRight,
  MapPin,
  Clock,
} from 'lucide-react';
import type {
  StarshipVehicle,
  StarshipOrbiter,
  StarshipStream,
} from '@/app/lib/services/starshipService';
import OptimizedImage from '@/components/ui/OptimizedImage';
import StarshipTimeline from '@/components/sections/StarshipTimeline';

function extractSerialNum(str?: string) {
  if (!str) return 0;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export default function StarshipClientView({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'streams' | 'ships' | 'boosters'>('timeline');
  const [shipsFilter, setShipsFilter] = useState<'active' | 'historical'>('active');
  const [boostersFilter, setBoostersFilter] = useState<'active' | 'historical'>('active');
  const [visibleShips, setVisibleShips] = useState(12);
  const [visibleBoosters, setVisibleBoosters] = useState(12);

  const liveStreams = data.live_streams || [];
  const roadClosures = data.road_closures || [];
  const notices = data.notices || [];

  const rawVehicles = (data.vehicles || []).filter((v: any) => !v.is_placeholder);
  const rawOrbiters = (data.orbiters || []).filter((o: any) => !o.is_placeholder);

  const vehicles: any[] = [];
  const orbiters: any[] = [...rawOrbiters];

  rawVehicles.forEach((v: any) => {
    const sn = (v.serial_number || v.name || '').toUpperCase();
    if (sn.startsWith('SN') || sn.startsWith('SHIP') || sn.includes('STARHOPPER') || sn.startsWith('MK')) {
      orbiters.push({
        ...v,
        name: v.name || v.serial_number,
        description: v.details || v.description,
        flights_count: v.flights,
        spacecraft_config: v.launcher_config || { name: 'Starship Prototype' },
      });
    } else {
      vehicles.push(v);
    }
  });
  const upcoming = data.upcoming || { launches: [], events: [] };
  const previous = data.previous || { launches: [], events: [] };

  const tabs = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'ships', label: 'Ships', count: orbiters.length },
    { id: 'boosters', label: 'Boosters', count: vehicles.length },
    { id: 'streams', label: 'Streams', count: liveStreams.length },
  ];

  const allTimelineItems = [
    ...upcoming.launches.map((l: any) => ({ ...l, date: l.net, _type: 'launch', _bucket: 'upcoming' })),
    ...upcoming.events.map((e: any) => ({ ...e, _type: 'event', _bucket: 'upcoming' })),
    ...previous.launches.map((l: any) => ({ ...l, date: l.net, _type: 'launch', _bucket: 'previous' })),
    ...previous.events.map((e: any) => ({ ...e, _type: 'event', _bucket: 'previous' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isHistoricalStatus = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    return s.includes('retired') || s.includes('destroyed') || s.includes('scrapped') || s.includes('lost') || s.includes('converted');
  };

  const activeBoosters = vehicles.filter((v: any) => !isHistoricalStatus(v.status?.name || ''))
    .sort((a: any, b: any) => extractSerialNum(b.serial_number) - extractSerialNum(a.serial_number));

  const historicalBoosters = vehicles.filter((v: any) => isHistoricalStatus(v.status?.name || ''))
    .sort((a: any, b: any) => extractSerialNum(b.serial_number) - extractSerialNum(a.serial_number));

  const activeShips = orbiters.filter((o: any) => !isHistoricalStatus(o.status?.name || ''))
    .sort((a: any, b: any) => extractSerialNum(b.serial_number || b.name) - extractSerialNum(a.serial_number || a.name));

  const historicalShips = orbiters.filter((o: any) => isHistoricalStatus(o.status?.name || ''))
    .sort((a: any, b: any) => extractSerialNum(b.serial_number || b.name) - extractSerialNum(a.serial_number || a.name));

  return (
    <>
      {/* ====== HERO ====== */}
      <section className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.5em]">
            Excitement Guaranteed
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">
          Starship<span className="text-[#FF6B35]">.</span>
        </h1>
        <p className="font-mono text-[11px] md:text-xs text-zinc-500 uppercase tracking-[0.2em] max-w-5xl">
          Starbase, Tx //{' '}
          <span className="text-zinc-300">{vehicles.length}</span> boosters //{' '}
          <span className="text-zinc-300">{orbiters.length}</span> ships //{' '}
          <span className="text-zinc-300">{previous.launches.length}</span> previous launch{previous.launches.length === 1 ? '' : 'es'} //{' '}
          <span className="text-zinc-300">{upcoming.launches.length}</span> upcoming launch{upcoming.launches.length === 1 ? '' : 'es'}
        </p>
      </section>

      {/* ====== ACTIVE NOTICES BANNER (only if any) ====== */}
      {(roadClosures.length > 0 || notices.length > 0) && (
        <section className="mb-8 md:mb-12 border-l-2 border-[#FF6B35] pl-5 md:pl-6 py-3 bg-[#FF6B35]/5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#FF6B35]" />
            <span className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.4em] font-black">
              Active Notices
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs text-zinc-300 uppercase tracking-widest">
            {roadClosures.length > 0 && (
              <p>{roadClosures.length} road closure{roadClosures.length === 1 ? '' : 's'} in effect</p>
            )}
            {notices.length > 0 && (
              <p>{notices.length} notice{notices.length === 1 ? '' : 's'} posted</p>
            )}
          </div>
        </section>
      )}

      {/* ====== TABS NAVIGATION ====== */}
      <div className="flex flex-wrap items-center justify-between mb-12 border-b border-white/10 pb-4 gap-4">
        <div className="flex flex-wrap gap-2 md:gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`font-mono text-[11px] uppercase tracking-[0.2em] px-4 py-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-white text-black font-black'
                : 'text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[9px] ${activeTab === tab.id ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sub-filters (Visible only for Ships or Boosters) */}
        {(activeTab === 'ships' || activeTab === 'boosters') && (
          <div className="flex gap-2 p-1 bg-white/5 backdrop-blur ml-auto">
            {activeTab === 'ships' ? (
              <>
                <button
                  onClick={() => { setShipsFilter('active'); setVisibleShips(12); }}
                  className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${shipsFilter === 'active' ? 'bg-[#18BBF7] text-black font-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  Active / Flight-Ready
                </button>
                <button
                  onClick={() => { setShipsFilter('historical'); setVisibleShips(12); }}
                  className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${shipsFilter === 'historical' ? 'bg-zinc-700 text-white font-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  Historical / Retired
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setBoostersFilter('active'); setVisibleBoosters(12); }}
                  className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${boostersFilter === 'active' ? 'bg-[#FF6B35] text-black font-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  Active / Flight-Ready
                </button>
                <button
                  onClick={() => { setBoostersFilter('historical'); setVisibleBoosters(12); }}
                  className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${boostersFilter === 'historical' ? 'bg-zinc-700 text-white font-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  Historical / Retired
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ====== TAB CONTENT ====== */}

      {activeTab === 'timeline' && <StarshipTimeline items={allTimelineItems} />}

      {activeTab === 'streams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {liveStreams.length > 0 ? (
            liveStreams.map((s: any, i: number) => (
              <StreamCard key={i} stream={s} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No active streams
            </div>
          )}
        </div>
      )}

      {activeTab === 'ships' && (
        <div className="space-y-8">

          {shipsFilter === 'active' && activeShips.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {activeShips.slice(0, visibleShips).map((o: any) => <OrbiterCard key={o.id} orbiter={o} />)}
              </div>
              {visibleShips < activeShips.length && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisibleShips(prev => prev + 12)} className="border border-white/20 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
          {shipsFilter === 'active' && activeShips.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No active ships found
            </div>
          )}

          {shipsFilter === 'historical' && historicalShips.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {historicalShips.slice(0, visibleShips).map((o: any) => <OrbiterCard key={o.id} orbiter={o} />)}
              </div>
              {visibleShips < historicalShips.length && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisibleShips(prev => prev + 12)} className="border border-white/20 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
          {shipsFilter === 'historical' && historicalShips.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No historical ships found
            </div>
          )}
        </div>
      )}

      {activeTab === 'boosters' && (
        <div className="space-y-8">

          {boostersFilter === 'active' && activeBoosters.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {activeBoosters.slice(0, visibleBoosters).map((v: any) => <VehicleCard key={v.id} vehicle={v} />)}
              </div>
              {visibleBoosters < activeBoosters.length && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisibleBoosters(prev => prev + 12)} className="border border-white/20 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
          {boostersFilter === 'active' && activeBoosters.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No active boosters found
            </div>
          )}

          {boostersFilter === 'historical' && historicalBoosters.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {historicalBoosters.slice(0, visibleBoosters).map((v: any) => <VehicleCard key={v.id} vehicle={v} />)}
              </div>
              {visibleBoosters < historicalBoosters.length && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisibleBoosters(prev => prev + 12)} className="border border-white/20 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest hover:border-white/50 transition-colors">
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
          {boostersFilter === 'historical' && historicalBoosters.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No historical boosters found
            </div>
          )}

          {vehicles.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No boosters found
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stream                                                              */
/* ------------------------------------------------------------------ */

function StreamCard({ stream }: { stream: StarshipStream }) {
  return (
    <a
      href={stream.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block border-2 border-[#FF6B35]/30 hover:border-[#FF6B35] hover:shadow-[0_0_24px_rgba(255,107,53,0.18)] bg-black overflow-hidden transition-all"
    >
      {stream.image && (
        <div className="relative aspect-video overflow-hidden">
          <OptimizedImage
            src={stream.image}
            alt={stream.title}
            className="transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
          <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#FF0000] px-2 py-1 font-mono text-[9px] font-black tracking-widest uppercase text-white">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full bg-white opacity-75 animate-ping rounded-full" />
              <span className="relative inline-flex w-1.5 h-1.5 bg-white rounded-full" />
            </span>
            Live
          </span>
        </div>
      )}
      <div className="p-4">
        <h3 className="text-sm md:text-base font-bold uppercase tracking-tight line-clamp-2 mb-2 group-hover:text-[#FF6B35] transition-colors">
          {stream.title}
        </h3>
        {stream.description && (
          <p className="text-[11px] md:text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {stream.description}
          </p>
        )}
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Vehicle (booster)                                                   */
/* ------------------------------------------------------------------ */

function VehicleCard({ vehicle }: { vehicle: StarshipVehicle }) {
  const status = (vehicle.status?.name || '').toLowerCase();
  const isActive = status.includes('active') || status.includes('proven');
  const isDestroyed = status.includes('lost') || status.includes('destroyed') || status.includes('scrapped');
  const imageUrl = vehicle.image?.image_url;

  return (
    <article className="group relative aspect-video overflow-hidden border border-white/5 bg-black">
      {imageUrl ? (
        <OptimizedImage
          src={imageUrl}
          alt={vehicle.serial_number || 'Booster'}
          className="absolute inset-0 w-full h-full object-cover brightness-90 transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-white/3" />
      )}

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/10" />

      {/* Top badges — pinned to the top, independent of everything below */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#FF6B35] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {vehicle.launcher_config?.name || 'Super Heavy'}
        </span>
        {vehicle.status?.name && (
          <span
            className={`font-mono text-[9px] uppercase tracking-widest px-2 py-1 backdrop-blur ${isActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : isDestroyed
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-black/60 text-zinc-300 border border-white/10'
              }`}
          >
            {vehicle.status.name}
          </span>
        )}
      </div>

      {/* Title + summary — pinned to the bottom, fades out on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300 group-hover:opacity-0">
        <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-1">
          {vehicle.serial_number || 'Unknown Booster'}
        </h3>
        {vehicle.details && (
          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-8">{vehicle.details}</p>
        )}
      </div>

      {/* Stat table — pinned to the same bottom edge, fades in on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 font-mono">
          <Stat label="Flights" value={vehicle.flights ?? 0} />
          <Stat
            label="Landings"
            value={`${vehicle.successful_landings ?? 0}/${vehicle.attempted_landings ?? 0}`}
          />
          <Stat label="Proven" value={vehicle.flight_proven ? 'Yes' : 'No'} />
          {vehicle.last_launch_date && <Stat label="Last Flight" value={new Date(vehicle.last_launch_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })} />}
          {vehicle.fastest_turnaround && <Stat label="Fast Turn" value={formatDuration(vehicle.fastest_turnaround)} />}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Orbiter (ship)                                                      */
/* ------------------------------------------------------------------ */

function OrbiterCard({ orbiter }: { orbiter: StarshipOrbiter }) {
  const status = (orbiter.status?.name || '').toLowerCase();
  const isActive = status.includes('active');
  const isLost = status.includes('lost') || status.includes('destroyed') || status.includes('retired');
  const imageUrl = orbiter.image?.image_url;

  return (
    <article className="group relative aspect-video overflow-hidden border border-white/5 bg-black">
      {imageUrl ? (
        <OptimizedImage
          src={imageUrl}
          alt={orbiter.name || 'Ship'}
          className="absolute inset-0 w-full h-full object-cover brightness-90 transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-white/3" />
      )}

      <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-black/10" />

      {/* Top badges — pinned to the top, independent of everything below */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        {orbiter.in_space ? (
          <span className="flex items-center gap-1.5 bg-[#18BBF7] px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-black">
            <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
            In Space
          </span>
        ) : (
          <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#18BBF7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {orbiter.spacecraft_config?.name || 'Starship'}
          </span>
        )}
        {orbiter.status?.name && (
          <span
            className={`font-mono text-[9px] uppercase tracking-widest px-2 py-1 backdrop-blur ${isActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : isLost
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-black/60 text-zinc-300 border border-white/10'
              }`}
          >
            {orbiter.status.name}
          </span>
        )}
      </div>

      {/* Title + summary — pinned to the bottom, fades out on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300 group-hover:opacity-0">
        <h3 className="text-lg md:text-xl font-black uppercase tracking-tight mb-1">
          {orbiter.name || orbiter.serial_number || 'Unknown Ship'}
        </h3>
        {orbiter.description && (
          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-8">{orbiter.description}</p>
        )}
      </div>

      {/* Stat table — pinned to the same bottom edge, fades in on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 font-mono">
          <Stat label="Flights" value={orbiter.flights_count ?? 0} />
          <Stat label="In Space" value={formatDuration(orbiter.time_in_space)} />
          <Stat label="Docked" value={formatDuration(orbiter.time_docked)} />
          {(orbiter.spacecraft_config as any)?.type?.name && <Stat label="Type" value={(orbiter.spacecraft_config as any).type.name} className="col-span-2" />}
          {orbiter.mission_ends_count !== undefined && <Stat label="Mission Ends" value={orbiter.mission_ends_count} />}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function Stat({ label, value, className }: { label: string; value: any; className?: string }) {
  return (
    <div className={className}>
      <div className="text-sm font-black text-white tabular-nums truncate">
        {value ?? '—'}
      </div>
      <div className="text-[8px] text-zinc-500 uppercase tracking-widest">{label}</div>
    </div>
  );
}

// Parse an ISO 8601 duration ("P30DT5H30M") into a friendly short form.
function formatDuration(iso?: string): string {
  if (!iso) return '—';
  const match = iso.match(/P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return iso;
  const [, y, mo, d, h, mi] = match;
  if (y) return `${y}y`;
  if (mo) return `${mo}mo`;
  if (d) return `${d}d`;
  if (h) return `${h}h`;
  if (mi) return `${mi}m`;
  return '—';
}
