'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useServerTime } from '../../app/lib/hooks/useServerTime';
import type { Trajectory, TrajPoint } from '../../app/lib/launch/trajectory';

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

/* ─── Trajectory helpers ─────────────────────────────────────────────────── */

const ORANGE = 0xff6b35;

/** Geodetic (spherical Earth) → scene coordinates, same axis mapping as the satellites. */
function trajToScene(p: { lat: number; lon: number; altKm: number }, out = new THREE.Vector3()): THREE.Vector3 {
  // Lift ground-level points a few km so lines don't z-fight with the globe.
  const r = (EARTH_RADIUS_KM + Math.max(p.altKm, 8)) * SCENE_SCALE;
  const la = (p.lat * Math.PI) / 180;
  const lo = (p.lon * Math.PI) / 180;
  const x = r * Math.cos(la) * Math.cos(lo);
  const y = r * Math.cos(la) * Math.sin(lo);
  const z = r * Math.sin(la);
  return out.set(x, z, -y);
}

function buildTrajLine(points: TrajPoint[], colour: number, dashed: boolean, opacity = 0.95): THREE.Line | null {
  if (points.length < 2) return null;
  const geo = new THREE.BufferGeometry().setFromPoints(points.map((pt) => trajToScene(pt)));
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color: colour, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

/**
 * Screen-sized icon (constant pixel size). Depth testing would clip a flat
 * sprite against the globe near the horizon, so it's off; the animation loop
 * hides icons on the far side with a horizon test instead. `scale` is roughly
 * a fraction of the viewport height.
 */
function buildIcon(draw: (ctx: CanvasRenderingContext2D, size: number) => void, scale: number): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, transparent: true, depthTest: false }));
  sprite.scale.setScalar(scale);
  return sprite;
}

/** Ring marker (pad, landing sites). */
function drawRing(colour: string) {
  return (ctx: CanvasRenderingContext2D, size: number) => {
    const c = size / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.arc(c, c, size * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = size * 0.12;
    ctx.beginPath(); ctx.arc(c, c, size * 0.32, 0, Math.PI * 2); ctx.stroke();
  };
}

/** Rocket in a ring — the vehicle's modelled position. */
function drawRocket(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath(); ctx.arc(c, c, size * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = size * 0.06;
  ctx.beginPath(); ctx.arc(c, c, size * 0.43, 0, Math.PI * 2); ctx.stroke();
  // Rocket, nose to the upper right.
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#FFFFFF';
  const w = size * 0.11;
  const h = size * 0.42;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - w * 1.1); // nose
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(w * 1.1, h / 2 + w * 0.9); // fin
  ctx.lineTo(-w * 1.1, h / 2 + w * 0.9);
  ctx.lineTo(-w / 2, h / 2);
  ctx.lineTo(-w / 2, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FF6B35'; // exhaust
  ctx.beginPath();
  ctx.moveTo(-w / 3, h / 2 + w * 0.9);
  ctx.lineTo(w / 3, h / 2 + w * 0.9);
  ctx.lineTo(0, h / 2 + w * 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Index of the last path point at or before `tSec` (-1 before the first). */
function indexAt(points: TrajPoint[], tSec: number): number {
  if (!points.length || tSec < points[0].t) return -1;
  let lo = 0;
  let hi = points.length - 1;
  if (tSec >= points[hi].t) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= tSec) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Position along ascent + orbit at `tSec` after T-0 (clamped to the modelled span). */
function trajectoryAt(points: TrajPoint[], tSec: number): TrajPoint | null {
  if (!points.length) return null;
  if (tSec <= points[0].t) return points[0];
  const last = points[points.length - 1];
  if (tSec >= last.t) return last;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= tSec) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const u = (tSec - a.t) / (b.t - a.t);
  // Longitude wrap-safe interpolation via scene vectors is done by the caller;
  // here a/b are 10–30 s apart so linear lat/lon is fine except across ±180°.
  let dLon = b.lon - a.lon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  return { t: tSec, lat: a.lat + (b.lat - a.lat) * u, lon: a.lon + dLon * u, altKm: a.altKm + (b.altKm - a.altKm) * u };
}

function formatMet(sec: number): string {
  const sign = sec < 0 ? 'T-' : 'T+';
  const abs = Math.abs(Math.floor(sec));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function SatelliteScene({
  initialPositions,
  trajectory = null,
}: {
  initialPositions: SatellitePosition[];
  /** When set, the launch's modelled trajectory is drawn over the globe. */
  trajectory?: Trajectory | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLPreElement>(null);
  const positionsRef = useRef<SatellitePosition[]>(initialPositions);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const metRef = useRef<HTMLSpanElement>(null);

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
    // Default: ease from a surface close-up back to an overview. Trajectory
    // mode: same ease, but aimed at the launch pad and ending closer.
    const camDir = trajectory
      ? trajToScene({ lat: trajectory.pad.lat, lon: trajectory.pad.lon, altKm: 0 }).normalize().add(new THREE.Vector3(0, 0.15, 0)).normalize()
      : new THREE.Vector3(0, 0, 1);
    const CAM_START = camDir.clone().multiplyScalar(EARTH_R * 1.35);
    const CAM_END = trajectory
      ? camDir.clone().multiplyScalar(60)
      : new THREE.Vector3(0, 50, 100); // normal overview
    camera.position.copy(CAM_START);
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

    // Everything given in Earth-fixed coordinates (satellite ECEF samples,
    // orbit lines, the launch trajectory) lives in this frame, which rotates
    // with the globe. Rotating only the Earth mesh would slide the texture
    // out from under them (~15° per hour).
    const earthFrame = new THREE.Group();
    earthFrame.add(earth);
    scene.add(earthFrame);

    // Atmosphere
    scene.add(buildAtmosphere(EARTH_R));

    // Async texture upgrades
    // Trajectory mode uses NASA's night-lights texture: a dark globe makes the
    // ground track and the city lights along it the focus.
    loader.loadAsync(trajectory ? EARTH_NIGHT_TEX : EARTH_DAY_TEX).then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      if (trajectory) earthMat.color.set(0xffffff);
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
        // In trajectory mode the camera is close in; shrink the satellites
        // (each cube is ~500 km across at full size) so the launch stays the subject.
        if (trajectory) group.scale.setScalar(0.35);
        earthFrame.add(group);

        const orbit = buildOrbitLine(sat.samples, colour);
        if (orbit) earthFrame.add(orbit);

        satViz.set(sat.id, {
          group,
          orbit,
          colour,
          label: sat.displayName || sat.name || sat.id,
        });
      });
    };
    setupSatellites();

    /* Launch trajectory (modelled) — drawn as a ground track:
       flown (T-0 → now) solid orange, predicted (now → +2 h) dashed grey.
       The split point moves every frame. */
    const trajObjects: THREE.Object3D[] = [];
    const flightPath: TrajPoint[] = trajectory ? [...trajectory.ascent, ...trajectory.orbit, ...(trajectory.cruise ?? [])] : [];
    const groundPts = flightPath.map((pt) => trajToScene({ ...pt, altKm: 0 }));
    let flownGeo: THREE.BufferGeometry | null = null;
    let futureGeo: THREE.BufferGeometry | null = null;
    let headSlot = -1; // vertex of flownGeo currently holding the live head position
    let rocket: THREE.Sprite | null = null;
    const icons: THREE.Sprite[] = [];
    if (trajectory && groundPts.length > 1) {
      const add = (o: THREE.Object3D | null) => {
        if (!o) return;
        earthFrame.add(o);
        trajObjects.push(o);
      };

      // Flown: the path points plus one spare vertex for the live head.
      const flownPos = new Float32Array((groundPts.length + 1) * 3);
      groundPts.forEach((v, i) => flownPos.set([v.x, v.y, v.z], i * 3));
      flownGeo = new THREE.BufferGeometry();
      flownGeo.setAttribute('position', new THREE.BufferAttribute(flownPos, 3));
      flownGeo.setDrawRange(0, 0);
      add(new THREE.Line(flownGeo, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.95 })));

      futureGeo = new THREE.BufferGeometry().setFromPoints(groundPts);
      const future = new THREE.Line(
        futureGeo,
        new THREE.LineDashedMaterial({ color: 0x9aa4b2, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0.6 })
      );
      future.computeLineDistances();
      add(future);

      for (const b of trajectory.boosters) {
        add(buildTrajLine(b.points.map((pt) => ({ ...pt, altKm: 0 })), 0xffffff, false, 0.8));
        const ring = buildIcon(drawRing('#FFFFFF'), 0.022);
        ring.position.copy(trajToScene({ lat: b.landing.lat, lon: b.landing.lon, altKm: 30 }));
        add(ring);
        icons.push(ring);
      }

      const pad = buildIcon(drawRing('#FFFFFF'), 0.03);
      pad.position.copy(trajToScene({ lat: trajectory.pad.lat, lon: trajectory.pad.lon, altKm: 30 }));
      add(pad);
      icons.push(pad);

      rocket = buildIcon(drawRocket, 0.075);
      rocket.renderOrder = 2;
      add(rocket);
      icons.push(rocket);
    }

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
      c.autoRotate = !trajectory; // keep the launch in view
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
        camera.position.lerpVectors(CAM_START, CAM_END, eased);
        camera.lookAt(0, 0, 0);
      }

      // Slow Earth self-rotation
      // Earth's real sidereal rotation: one full turn in 86 164 s (≈ 23 h 56 m)
      // ω = 2π / 86164 ≈ 7.292e-5 rad/s
      earthFrame.rotation.y = elapsed * (2 * Math.PI / 86164);

      const nowMs = getServerTimeRef.current().getTime();
      const lines: string[] = [];

      if (trajectory && rocket && flownGeo && futureGeo) {
        const met = (nowMs - new Date(trajectory.t0).getTime()) / 1000;
        const here = trajectoryAt(flightPath, met);
        const k = indexAt(flightPath, met);
        const flownAttr = flownGeo.getAttribute('position') as THREE.BufferAttribute;

        // Put back the path point the head vertex borrowed last frame.
        if (headSlot >= 0 && headSlot < groundPts.length) {
          const v = groundPts[headSlot];
          flownAttr.setXYZ(headSlot, v.x, v.y, v.z);
        }
        if (k >= 0 && here) {
          const head = trajToScene({ ...here, altKm: 0 });
          headSlot = k + 1;
          flownAttr.setXYZ(headSlot, head.x, head.y, head.z);
          flownGeo.setDrawRange(0, k + 2);
        } else {
          headSlot = -1;
          flownGeo.setDrawRange(0, 0);
        }
        flownAttr.needsUpdate = true;
        const start = Math.max(k, 0);
        futureGeo.setDrawRange(start, groundPts.length - start);

        if (here) trajToScene({ ...here, altKm: 40 }, rocket.position);

        // Horizon test: a point is visible when it's on the camera's side of
        // the tangent cone (cos θ > R / |camera|).
        const camDist = camera.position.length();
        const horizon = EARTH_R / camDist;
        for (const icon of icons) {
          icon.getWorldPosition(tmp);
          icon.visible = tmp.normalize().dot(camera.position) / camDist > horizon;
        }
        if (metRef.current) metRef.current.textContent = formatMet(met);
        if (here) lines.push(`${trajectory.name.slice(0, 40).padEnd(40)} ${formatMet(met)}  ALT≈${Math.round(here.altKm)} km (model)`);
      }

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

      trajObjects.forEach((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as (THREE.Material & { map?: THREE.Texture | null }) | undefined;
        mat?.map?.dispose();
        mat?.dispose();
      });

      earthGeo.dispose();
      earthMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // trajectory is fixed for the page's lifetime (it comes from the URL)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {!trajectory && (
        <div className="pointer-events-none absolute top-20 left-6 text-xs font-mono text-white/50 tracking-[0.2em]">
          LIVE SATELLITE POSITIONS · GEO ECEF
        </div>
      )}

      {/* Launch trajectory panel */}
      {trajectory && (
        <div className="absolute top-20 left-6 z-10 w-[min(22rem,calc(100vw-3rem))] border-l-2 border-[#FF6B35] bg-black/70 px-4 py-3 backdrop-blur-sm">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FF6B35]">Launch trajectory · approximate</div>
          <div className="mt-1 text-sm font-semibold leading-snug text-white">{trajectory.name}</div>
          <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-white">
            <span ref={metRef}>T+00:00:00</span>
          </div>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-zinc-300">
            <li className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 bg-[#FF6B35]" /> Flown ground track</li>
            <li className="flex items-center gap-2"><span className="inline-block h-0 w-5 border-t border-dashed border-zinc-400" /> Predicted, next ~2 h</li>
            {trajectory.boosters.map((b) => (
              <li key={b.who} className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 bg-white" /> {b.who} → {b.landing.label}</li>
            ))}
            <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[#FF6B35] bg-black" /> Modelled position now</li>
            <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white bg-black" /> {trajectory.pad.name}</li>
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Modelled from the pad and target orbit ({trajectory.model.basis}; {trajectory.model.inclinationDeg}° inclination,
            ~{trajectory.model.altitudeKm} km), not live telemetry.
          </p>
          <a href={`/launches/${trajectory.slug}`} className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-[#18BBF7] hover:text-white">
            ← Back to mission
          </a>
        </div>
      )}

      {/* Source label — bottom-right stack */}
      <div className="pointer-events-none absolute top-20 right-6 text-[10px] font-mono text-white/35 tracking-[0.15em] text-right">
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
