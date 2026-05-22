'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useServerTime } from '../../app/lib/hooks/useServerTime';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Sample {
  t: string;
  x: number;
  y: number;
  z: number;
  lat?: number;
  lon?: number;
  radial?: number;
}

export interface SatellitePosition {
  id: string;
  name: string;
  displayName?: string;
  coordinateSystem: string;
  windowStart: string;
  windowEnd: string;
  samples: Sample[];
  stale: boolean;
  lastError?: string | null;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SCENE_SCALE = 1 / 500;
const EARTH_RADIUS_KM = 6371;
const EARTH_R = EARTH_RADIUS_KM * SCENE_SCALE; // ~12.74 scene units (exactly 2x larger)

// Neutral site palette: muted steel-blues / slate greys matching #18BBF7 accent family
const SAT_COLOURS = [0x18bbf7, 0x5a7fa0, 0x8ca6be, 0x2d6b8a];

// Free NASA / OSM textures served from CDN (no credentials needed)
const EARTH_DAY_TEX =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_NIGHT_TEX =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png';
const EARTH_SPEC_TEX =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg';
const EARTH_BUMP_TEX =
  'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function sampleTimeMs(s: Sample): number {
  return new Date(s.t).getTime();
}

function interpolate(samples: Sample[], nowMs: number): [number, number, number] | null {
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (nowMs <= sampleTimeMs(first)) return [first.x, first.y, first.z];
  if (nowMs >= sampleTimeMs(last)) return [last.x, last.y, last.z];
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sampleTimeMs(samples[mid]) <= nowMs) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const ta = sampleTimeMs(a);
  const tb = sampleTimeMs(b);
  const u = (nowMs - ta) / (tb - ta);
  return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u];
}

function formatKm(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(0).padStart(7);
}

function deriveErrorCode(positions: SatellitePosition[]): string | null {
  const offenders = positions.filter((p) => (!p.samples || p.samples.length === 0) && p.lastError);
  if (offenders.length === 0) return null;
  const counts = new Map<string, number>();
  for (const o of offenders) {
    const code = String(o.lastError).toUpperCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  let top = 'UNKNOWN';
  let topCount = 0;
  for (const [code, n] of counts) {
    if (n > topCount) { topCount = n; top = code; }
  }
  return top;
}

/** Build a random star-field point cloud */
function buildStarField(count = 3000): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 800 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true });
  return new THREE.Points(geo, mat);
}

/** Build an atmosphere halo behind the globe */
function buildAtmosphere(earthRadius: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

/** Build a 3-D satellite object: small muted cube */
function buildSatMesh(colour: number): THREE.Group {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: 0.35,
    metalness: 0.9,
    roughness: 0.4,
  });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  return group;
}

/** Build an orbit trail line from samples */
function buildOrbitLine(samples: Sample[], colour: number): THREE.Line | null {
  if (samples.length < 2) return null;
  const positions = new Float32Array(samples.length * 3);
  for (let i = 0; i < samples.length; i++) {
    positions[i * 3] = samples[i].x * SCENE_SCALE;
    positions[i * 3 + 1] = samples[i].z * SCENE_SCALE;
    positions[i * 3 + 2] = -samples[i].y * SCENE_SCALE;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.35 });
  return new THREE.Line(geo, mat);
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function SatelliteScene({ initialPositions }: { initialPositions: SatellitePosition[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLPreElement>(null);
  const positionsRef = useRef<SatellitePosition[]>(initialPositions);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [errorCode, setErrorCode] = useState<string | null>(() => deriveErrorCode(initialPositions));
  const [hoveredSat, setHoveredSat] = useState<{ name: string; x: number; y: number } | null>(null);

  const { getServerTime } = useServerTime();
  const getServerTimeRef = useRef(getServerTime);
  getServerTimeRef.current = getServerTime;

  /* ── Background polling ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch('/api/satellites/positions');
        if (!r.ok) return;
        const json = await r.json();
        if (!cancelled && Array.isArray(json.positions)) {
          positionsRef.current = json.positions;
          setErrorCode(deriveErrorCode(json.positions));
        }
      } catch { /* keep last-good */ }
    };
    const id = setInterval(poll, 3 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  /* ── Three.js scene ─────────────────────────────────────────────────── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020810);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      5000,
    );
    // Start in extreme close-up on Earth surface so it fills the screen, ease back to overview
    const CAM_START_Z = EARTH_R * 1.35; // extreme close-up
    const CAM_END_Z = 100;             // normal overview distance (2x of 50)
    camera.position.set(0, 0, CAM_START_Z);
    camera.lookAt(0, 0, 0);

    /* Lights */
    // Neutral white ambient so the whole globe is visible, not just the sun-facing side
    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambient);

    // Directional sun — kept for shading definition
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
    sun.position.set(200, 100, 150);
    sun.castShadow = true;
    scene.add(sun);

    // Soft fill from the opposite side
    const rimLight = new THREE.DirectionalLight(0x8ab4d4, 0.5);
    rimLight.position.set(-200, -80, -150);
    scene.add(rimLight);

    /* Stars */
    scene.add(buildStarField(4000));

    /* Earth */
    const loader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(EARTH_R, 64, 64);

    // Start with a placeholder Phong material while textures load
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1a4a7a,
      specular: 0x224488,
      shininess: 20,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.receiveShadow = true;
    earth.castShadow = false;
    scene.add(earth);

    // Atmosphere
    scene.add(buildAtmosphere(EARTH_R));

    // Async texture upgrades
    loader.loadAsync(EARTH_DAY_TEX).then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    }).catch(() => {/* keep placeholder */ });

    loader.loadAsync(EARTH_BUMP_TEX).then((tex) => {
      earthMat.bumpMap = tex;
      earthMat.bumpScale = 0.05;
      earthMat.needsUpdate = true;
    }).catch(() => { });

    loader.loadAsync(EARTH_SPEC_TEX).then((tex) => {
      earthMat.specularMap = tex;
      earthMat.needsUpdate = true;
    }).catch(() => { });


    /* Satellites */
    interface SatViz {
      group: THREE.Group;
      orbit: THREE.Line | null;
      colour: number;
      label: string;
    }
    const satViz = new Map<string, SatViz>();

    const setupSatellites = () => {
      positionsRef.current.forEach((sat, i) => {
        const colour = SAT_COLOURS[i % SAT_COLOURS.length];
        const group = buildSatMesh(colour);
        scene.add(group);

        const orbit = buildOrbitLine(sat.samples, colour);
        if (orbit) scene.add(orbit);

        satViz.set(sat.id, {
          group,
          orbit,
          colour,
          label: sat.displayName || sat.name || sat.id,
        });
      });
    };
    setupSatellites();

    /* Orbit controls */
    let controls: { update: () => void; dispose: () => void } | null = null;
    let controlsCancelled = false;
    import('three/examples/jsm/controls/OrbitControls.js').then(({ OrbitControls }) => {
      if (controlsCancelled) return;
      const c = new OrbitControls(camera, renderer.domElement);
      c.enableDamping = true;
      c.dampingFactor = 0.06;
      c.minDistance = 30;
      c.maxDistance = 1600;
      c.autoRotate = true;
      c.autoRotateSpeed = 0.25;
      controls = c;
    });

    /* Resize */
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    /* ── Raycasting for hover tooltips ───────────────────────────────── */
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    // Collect all meshes that belong to satellites for hit testing
    const satMeshes: Array<{ mesh: THREE.Object3D; id: string }> = [];

    const rebuildHitList = () => {
      satMeshes.length = 0;
      satViz.forEach((viz, id) => {
        viz.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            satMeshes.push({ mesh: obj, id });
          }
        });
      });
    };
    rebuildHitList();

    let lastHoverId: string | null = null;
    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseNDC, camera);
      const targets = satMeshes.map((s) => s.mesh as THREE.Mesh);
      const hits = raycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const found = satMeshes.find((s) => s.mesh === hitObj);
        if (found && found.id !== lastHoverId) {
          lastHoverId = found.id;
          const viz = satViz.get(found.id);
          setHoveredSat({ name: viz?.label ?? found.id, x: e.clientX, y: e.clientY });
        } else if (found) {
          // Update position even if same satellite
          const viz = satViz.get(found.id);
          setHoveredSat({ name: viz?.label ?? found.id, x: e.clientX, y: e.clientY });
        }
      } else {
        if (lastHoverId !== null) {
          lastHoverId = null;
          setHoveredSat(null);
        }
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseleave', () => {
      lastHoverId = null;
      setHoveredSat(null);
    });

    /* ── Animation loop ──────────────────────────────────────────────── */
    let frameId = 0;
    const tmp = new THREE.Vector3();
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Zoom-out intro: ease the camera back from close-up over ~2.5 s
      const ZOOM_DURATION = 2.5;
      if (elapsed < ZOOM_DURATION) {
        const t = Math.min(elapsed / ZOOM_DURATION, 1);
        // Smooth ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        camera.position.z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * eased;
        camera.position.y = 50 * eased;
        camera.lookAt(0, 0, 0);
      }

      // Slow Earth self-rotation
      // Earth's real sidereal rotation: one full turn in 86 164 s (≈ 23 h 56 m)
      // ω = 2π / 86164 ≈ 7.292e-5 rad/s
      earth.rotation.y = elapsed * (2 * Math.PI / 86164);

      const nowMs = getServerTimeRef.current().getTime();
      const lines: string[] = [];

      for (const sat of positionsRef.current) {
        const viz = satViz.get(sat.id);
        if (!viz) continue;

        const pos = interpolate(sat.samples, nowMs);
        if (!pos) {
          lines.push(`${(sat.displayName || sat.id).padEnd(20)} --`);
          continue;
        }
        const [x, y, z] = pos;
        tmp.set(x * SCENE_SCALE, z * SCENE_SCALE, -y * SCENE_SCALE);
        viz.group.position.copy(tmp);

        // Satellites hold a fixed orientation (no spin)

        lines.push(
          `${(sat.displayName || sat.id).padEnd(20)} X=${formatKm(x)} Y=${formatKm(y)} Z=${formatKm(z)} km${sat.stale ? '  [STALE]' : ''}`,
        );
      }

      if (readoutRef.current) readoutRef.current.textContent = lines.join('\n');
      controls?.update();
      renderer.render(scene, camera);
    };
    animate();

    /* ── Cleanup ─────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      controlsCancelled = true;
      controls?.dispose();

      satViz.forEach((v) => {
        v.group.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
            else (m.material as THREE.Material).dispose();
          }
        });
        if (v.orbit) {
          v.orbit.geometry.dispose();
          (v.orbit.material as THREE.Material).dispose();
        }
      });

      earthGeo.dispose();
      earthMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ── JSX ──────────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-screen bg-[#020810] overflow-hidden">

      {/* Three.js canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Corner brackets — top ones pushed below the site header */}
      <div className="absolute top-16 left-3  w-3 h-3 border-t-2 border-l-2 border-white/30 pointer-events-none" />
      <div className="absolute top-16 right-3 w-3 h-3 border-t-2 border-r-2 border-white/30 pointer-events-none" />
      <div className="absolute bottom-3 left-3  w-3 h-3 border-b-2 border-l-2 border-white/30 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-white/30 pointer-events-none" />

      {/* Scene label — moved to bottom to avoid overlapping the site header */}
      <div className="pointer-events-none absolute top-20 left-6 text-xs font-mono text-white/50 tracking-[0.2em]">
        LIVE SATELLITE POSITIONS · GEO ECEF
      </div>

      {/* Source label — bottom-right stack */}
      <div className="pointer-events-none absolute top-20 right-6 text-[10px] font-mono text-white/35 tracking-[0.15em] text-right">
        SOURCE · N2YO.com<br />
        SCALE · 1u = 1000 km
      </div>

      {/* Error banner — sits below the fixed site header */}
      {errorCode && (
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2">
          <div className="border border-amber-500/70 bg-black/80 backdrop-blur-[2px] px-4 py-2 font-mono text-[11px] tracking-[0.25em] text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <span className="text-amber-500 mr-3">[SYS_ERR]</span>
            SSC UPSTREAM UNREACHABLE
            <span className="text-amber-500/60 mx-3">·</span>
            <span className="text-amber-400">{errorCode}</span>
            <span className="text-amber-500/60 mx-3">·</span>
            <span className="text-amber-200/70">RETRYING IN BACKGROUND</span>
          </div>
        </div>
      )}

      {/* Telemetry readout */}
      <pre
        ref={readoutRef}
        className="pointer-events-none absolute bottom-6 left-6 text-[11px] leading-relaxed font-mono text-white/85 whitespace-pre"
      />

      {/* Controls hint */}
      <div className="pointer-events-none absolute bottom-6 right-6 text-[10px] font-mono text-white/40 tracking-[0.15em] text-right">
        DRAG · ROTATE<br />
        SCROLL · ZOOM
      </div>

      {/* Satellite hover tooltip */}
      {hoveredSat && (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-50 animate-fade-in"
          style={{ left: hoveredSat.x + 14, top: hoveredSat.y - 10 }}
        >
          <div
            style={{
              background: '#050505',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '0px',
              padding: '5px 10px',
              boxShadow: '4px 4px 0px rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Blinking square dot */}
            <span
              style={{
                display: 'inline-block',
                width: '5px',
                height: '5px',
                borderRadius: '0px',
                background: '#18bbf7',
                marginRight: '8px',
                verticalAlign: 'middle',
                animation: 'sat-pulse 1s steps(2, start) infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                letterSpacing: '0.15em',
                color: '#ffffff',
                textTransform: 'uppercase',
                verticalAlign: 'middle',
              }}
            >
              {hoveredSat.name}
            </span>
          </div>
        </div>
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes sat-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
