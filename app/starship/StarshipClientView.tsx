"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Radio,
  Calendar,
  AlertTriangle,
  Megaphone,
  ArrowUpRight,
  MapPin,
  Clock,
  Play,
  Info,
} from 'lucide-react';
import type {
  StarshipVehicle,
  StarshipOrbiter,
  StarshipStream,
} from '@/app/lib/services/starshipService';

export default function StarshipClientView({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'streams' | 'ships' | 'boosters'>('timeline');
  const [shipsFilter, setShipsFilter] = useState<'active' | 'historical'>('active');
  const [boostersFilter, setBoostersFilter] = useState<'active' | 'historical'>('active');
  const [visibleShips, setVisibleShips] = useState(12);
  const [visibleBoosters, setVisibleBoosters] = useState(12);

  const liveStreams = data.live_streams || [];
  const roadClosures = data.road_closures || [];
  const notices = data.notices || [];
  const vehicles = data.vehicles || [];
  const orbiters = data.orbiters || [];
  const upcoming = data.upcoming || { launches: [], events: [] };
  const previous = data.previous || { launches: [], events: [] };

  const tabs = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'streams', label: 'Streams', count: liveStreams.length },
    { id: 'ships', label: 'Ships', count: orbiters.length },
    { id: 'boosters', label: 'Boosters', count: vehicles.length },
  ];

  const allTimelineItems = [
    ...upcoming.launches.map((l: any) => ({ ...l, date: l.net, _type: 'launch', _bucket: 'upcoming' })),
    ...upcoming.events.map((e: any) => ({ ...e, _type: 'event', _bucket: 'upcoming' })),
    ...previous.launches.map((l: any) => ({ ...l, date: l.net, _type: 'launch', _bucket: 'previous' })),
    ...previous.events.map((e: any) => ({ ...e, _type: 'event', _bucket: 'previous' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeBoosters = vehicles.filter((v: any) => {
    const status = (v.status?.name || '').toLowerCase();
    return status.includes('active') || status.includes('proven') || status.includes('construction') || status.includes('testing');
  });

  const historicalBoosters = vehicles.filter((v: any) => {
    const status = (v.status?.name || '').toLowerCase();
    return !(status.includes('active') || status.includes('proven') || status.includes('construction') || status.includes('testing'));
  });

  const activeShips = orbiters.filter((o: any) => {
    const status = (o.status?.name || '').toLowerCase();
    return status.includes('active') || status.includes('construction') || status.includes('testing');
  });

  const historicalShips = orbiters.filter((o: any) => {
    const status = (o.status?.name || '').toLowerCase();
    return !(status.includes('active') || status.includes('construction') || status.includes('testing'));
  });

  return (
    <>
      {/* ====== HERO ====== */}
      <section className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="w-4 h-4 text-[#FF6B35]" />
          <span className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-[0.5em]">
            Vehicle Dashboard
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">
          Starship<span className="text-[#FF6B35]">.</span>
        </h1>
        <p className="font-mono text-[11px] md:text-xs text-zinc-500 uppercase tracking-[0.2em] max-w-5xl">
          Boca Chica development tracker //{' '}
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
      <div className="flex flex-wrap gap-2 md:gap-4 mb-12 border-b border-white/10 pb-4">
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

      {/* ====== TAB CONTENT ====== */}

      {activeTab === 'timeline' && (
        <div className="space-y-12">
          {allTimelineItems.map((item, i) => (
            <TimelineEventCard key={`${item._bucket}-${item._type}-${item.id || i}`} item={item} />
          ))}
        </div>
      )}

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
          <div className="flex gap-2 p-1 bg-white/5 inline-flex backdrop-blur">
            <button
              onClick={() => {
                setShipsFilter('active');
                setVisibleShips(12);
              }}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${shipsFilter === 'active' ? 'bg-[#18BBF7] text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              Active / Flight-Ready
            </button>
            <button
              onClick={() => {
                setShipsFilter('historical');
                setVisibleShips(12);
              }}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${shipsFilter === 'historical' ? 'bg-zinc-700 text-white font-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              Historical Prototypes
            </button>
          </div>

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

          {orbiters.length === 0 && (
            <div className="py-20 text-center font-mono text-sm text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800">
              No ships found
            </div>
          )}
        </div>
      )}

      {activeTab === 'boosters' && (
        <div className="space-y-8">
          <div className="flex gap-2 p-1 bg-white/5 inline-flex backdrop-blur">
            <button
              onClick={() => {
                setBoostersFilter('active');
                setVisibleBoosters(12);
              }}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${boostersFilter === 'active' ? 'bg-[#FF6B35] text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              Active / Flight-Ready
            </button>
            <button
              onClick={() => {
                setBoostersFilter('historical');
                setVisibleBoosters(12);
              }}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors ${boostersFilter === 'historical' ? 'bg-zinc-700 text-white font-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              Historical / Retired
            </button>
          </div>

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
/* Timeline Event Card (Unified)                                       */
/* ------------------------------------------------------------------ */

function TimelineEventCard({ item }: { item: any }) {
  const dt = item.date ? new Date(item.date) : null;
  const isLaunch = item._type === 'launch';

  // Define type name and color
  const typeName = isLaunch ? 'Test Flight' : (item.type?.name || 'Event');
  const typeNameLower = typeName.toLowerCase();

  // Distinct colors
  let typeColorClass = 'text-zinc-400 border-zinc-500/30 bg-zinc-500/5';
  let badgeColorClass = 'text-zinc-400';

  if (isLaunch || typeNameLower.includes('flight') || typeNameLower.includes('launch')) {
    typeColorClass = 'text-[#18BBF7] border-[#18BBF7]/30 bg-[#18BBF7]/5';
    badgeColorClass = 'text-[#18BBF7]';
  } else if (typeNameLower.includes('fire') || typeNameLower.includes('test')) {
    typeColorClass = 'text-[#FF6B35] border-[#FF6B35]/30 bg-[#FF6B35]/5';
    badgeColorClass = 'text-[#FF6B35]';
  }

  const imageUrl = item.image?.image_url || item.image?.thumbnail_url || item.feature_image;

  return (
    <article className="group bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden flex flex-col lg:flex-row">
      <div className="p-6 md:p-8 flex-1 flex flex-col">

        {/* Header / Meta Data */}
        <div className="flex flex-wrap items-center gap-3 mb-6 font-mono text-[10px] uppercase tracking-widest">
          <span className={`${item._bucket === 'upcoming' ? 'text-white' : 'text-zinc-500'} font-black`}>
            {item._bucket === 'upcoming' ? 'Upcoming' : 'Past'}
          </span>
          <span className="text-zinc-800">/</span>
          <span className={`px-2 py-0.5 border ${typeColorClass} font-black`}>
            {typeName}
          </span>
          {dt && (
            <>
              <span className="text-zinc-800">/</span>
              <span className="text-zinc-400">
                {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </>
          )}
        </div>

        {/* Main Content */}
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight mb-4 group-hover:text-white transition-colors leading-[1.1]">
          {item.name}
        </h3>

        <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-8 max-w-3xl flex-1">
          {item.mission?.description || item.description || 'No additional details available.'}
        </p>

        {/* Interactive Elements */}
        {(item.vid_urls?.length > 0 || item.info_urls?.length > 0 || item.info_url || item.vid_url) && (
          <div className="flex flex-wrap items-center gap-4 mt-auto pt-6 border-t border-white/5">
            {(item.vid_urls?.[0]?.url || item.vid_url) && (
              <a
                href={item.vid_urls?.[0]?.url || item.vid_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 font-mono text-[10px] uppercase tracking-widest font-black hover:bg-[#FF6B35] hover:text-white transition-colors"
              >
                <Play className="w-3 h-3" />
                Watch Replay
              </a>
            )}

            {(item.info_urls?.[0]?.url || item.info_url) && (
              <a
                href={item.info_urls?.[0]?.url || item.info_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/20 text-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-white/50 transition-colors"
              >
                <Info className="w-3 h-3" />
                More Info
              </a>
            )}
          </div>
        )}
      </div>

      {/* Media / Image */}
      {imageUrl && (
        <div className="w-full lg:w-[400px] xl:w-[500px] h-64 lg:h-auto relative border-t lg:border-t-0 lg:border-l border-white/5 overflow-hidden shrink-0">
          <OptimizedImage
            src={imageUrl}
            alt={item.name}
            className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
          />
        </div>
      )}
    </article>
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

  return (
    <article className="relative border-2 border-[#FF6B35]/20 hover:border-[#FF6B35] hover:shadow-[0_0_24px_rgba(255,107,53,0.12)] bg-black/90 transition-all overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#FF6B35] z-10 pointer-events-none" />

      {vehicle.image?.image_url && (
        <div className="relative aspect-video overflow-hidden border-b border-[#FF6B35]/10 shrink-0">
          <OptimizedImage
            src={vehicle.image.image_url}
            alt={vehicle.serial_number || 'Booster'}
            className="brightness-90 transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
          <span className="absolute top-3 left-3 font-mono text-[9px] font-black uppercase tracking-[0.3em] text-[#FF6B35] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {vehicle.launcher_config?.name || 'Super Heavy'}
          </span>
          {vehicle.status?.name && (
            <span
              className={`absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-widest px-2 py-1 backdrop-blur ${isActive
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
      )}

      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
          {vehicle.serial_number || 'Unknown Booster'}
        </h3>

        {vehicle.details && (
          <p className="text-xs text-zinc-400 leading-relaxed flex-1">{vehicle.details}</p>
        )}

        <div className="grid grid-cols-3 gap-2 font-mono pt-4 border-t border-white/5 mt-auto">
          <Stat label="Flights" value={vehicle.flights ?? 0} />
          <Stat
            label="Landings"
            value={`${vehicle.successful_landings ?? 0}/${vehicle.attempted_landings ?? 0}`}
          />
          <Stat label="Proven" value={vehicle.flight_proven ? 'YES' : 'NO'} />
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

  return (
    <article className="relative border-2 border-[#18BBF7]/20 hover:border-[#18BBF7] hover:shadow-[0_0_24px_rgba(24,187,247,0.15)] bg-black/90 transition-all overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#18BBF7] z-10 pointer-events-none" />

      {orbiter.image?.image_url && (
        <div className="relative aspect-video overflow-hidden border-b border-[#18BBF7]/10 shrink-0">
          <OptimizedImage
            src={orbiter.image.image_url}
            alt={orbiter.name || 'Ship'}
            className="brightness-90 transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
          {orbiter.in_space ? (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#18BBF7] px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.3em] text-black">
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
              In Space
            </span>
          ) : (
            <span className="absolute top-3 left-3 font-mono text-[9px] font-black uppercase tracking-[0.3em] text-[#18BBF7] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {orbiter.spacecraft_config?.name || 'Starship'}
            </span>
          )}
          {orbiter.status?.name && (
            <span
              className={`absolute bottom-3 right-3 font-mono text-[9px] uppercase tracking-widest px-2 py-1 backdrop-blur ${isActive
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
      )}

      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col">
        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">
          {orbiter.name || orbiter.serial_number || 'Unknown Ship'}
        </h3>

        {orbiter.description && (
          <p className="text-xs text-zinc-400 leading-relaxed flex-1">{orbiter.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2 font-mono pt-4 border-t border-white/5 mt-auto">
          <Stat label="Flights" value={orbiter.flights_count ?? 0} />
          <Stat label="In Space" value={formatDuration(orbiter.time_in_space)} />
          <Stat label="Docked" value={formatDuration(orbiter.time_docked)} />
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 p-2">
      <div className="text-xs md:text-sm font-black text-white tabular-nums truncate">
        {value ?? '—'}
      </div>
      <div className="text-[8px] text-zinc-600 uppercase tracking-widest mt-0.5">{label}</div>
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

/* ------------------------------------------------------------------ */
/* Optimized Image                                                     */
/* ------------------------------------------------------------------ */

function OptimizedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '1200px' } // Keep image loaded within 1200px of viewport
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full h-full bg-zinc-900/30 overflow-hidden">
      {isVisible && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full object-cover ${className || ''}`}
        />
      )}
    </div>
  );
}
