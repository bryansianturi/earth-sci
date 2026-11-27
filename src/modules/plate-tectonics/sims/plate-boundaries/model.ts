/**
 * Geometry and timeline for the plate-boundary scenarios. Pure functions of time t in [0, 1];
 * the renderer only draws what this model says exists. Everything here is schematic.
 */

export type Scenario = 'divergent' | 'ocean-ocean' | 'ocean-continent' | 'continent-continent' | 'transform';

export interface ScenarioInfo { id: Scenario; label: string; short: string; maxMy: number }

export const SCENARIOS: ScenarioInfo[] = [
  { id: 'divergent', label: 'Divergent (mid-ocean ridge)', short: 'Divergent', maxMy: 20 },
  { id: 'ocean-ocean', label: 'Convergent: ocean–ocean', short: 'Ocean–ocean', maxMy: 30 },
  { id: 'ocean-continent', label: 'Convergent: ocean–continent', short: 'Ocean–continent', maxMy: 30 },
  { id: 'continent-continent', label: 'Convergent: continent–continent', short: 'Continent–continent', maxMy: 50 },
  { id: 'transform', label: 'Transform (map view)', short: 'Transform', maxMy: 10 },
];

export const isScenario = (s: string): s is Scenario => SCENARIOS.some((x) => x.id === s);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Canvas layout constants (logical pixels). */
export const G = {
  W: 960, H: 540,
  SEA: 120, // sea level
  FLOOR: 170, // old ocean floor
  LAND: 112, // continental surface
  OC_CRUST: 16, // oceanic crust thickness (px)
  OC_LITH: 56, // oceanic lithosphere thickness for the sinking slab (px)
  CONT_MOHO: 195, // base of continental crust
  CONT_LITH_BASE: 290,
  OC_LITH_BASE: 250,
  TRENCH_X: 470,
  SLAB_ANGLE: (32 * Math.PI) / 180,
  ARC_OFFSET: 190, // horizontal distance trench -> volcanic arc
  RIDGE_X: 480,
} as const;

// ---------- divergent ----------
export function divergent(t: number) {
  const halfWidth = 6 + t * 430; // px of new crust on each side
  const pxPerMy = 430 / 20;
  const stripeWidth = pxPerMy * 2.5; // one magnetic stripe per 2.5 My (regular, schematic)
  return { halfWidth, pxPerMy, stripeWidth, magma: 0.6 + 0.4 * t, valley: smooth(t / 0.25) };
}

/** Sea-floor surface y at distance d from the ridge axis. */
export function seafloorY(d: number, halfWidth: number, valley = 1): number {
  const f = Math.min(1, d / halfWidth);
  const base = 140 + (G.FLOOR - 140) * Math.sqrt(f); // ridge crest ~ 30 px shallower, deepens with age (sqrt of age)
  const rift = d < 22 ? 10 * valley * (1 - d / 22) : 0; // axial rift valley
  return base + rift;
}

// ---------- subduction ----------
export type SubKind = 'ocean-ocean' | 'ocean-continent' | 'continent-continent';
export const COLLISION_START = 0.5;

export function subduction(kind: SubKind, t: number) {
  const cc = kind === 'continent-continent';
  const L = cc
    ? 60 + 460 * Math.min(t, COLLISION_START) + 50 * smooth((t - COLLISION_START) / (1 - COLLISION_START))
    : 60 + 460 * t;
  const trenchDepth = 10 + 30 * smooth(t / 0.3);
  const arcRaw = smooth((t - 0.4) / 0.35);
  const arc = cc ? arcRaw * (1 - smooth((t - 0.55) / 0.25)) : arcRaw;
  return {
    slabLength: L,
    trenchDepth,
    wedge: smooth((t - 0.1) / 0.3),
    arc,
    collision: cc ? smooth((t - COLLISION_START) / (1 - COLLISION_START)) : 0,
    breakoff: cc ? smooth((t - 0.78) / 0.15) : 0,
    /** Right edge of the continent riding on the subducting plate (continent–continent only). */
    edgeX: cc ? lerp(120, G.TRENCH_X - 6, smooth(t / COLLISION_START)) : 0,
  };
}

// ---------- transform ----------
export function transform(t: number) {
  const half = 8 + t * 150;
  return { half, stripeWidth: 150 / 10 * 1.25, slip: half };
}

// ---------- timeline of features (for descriptions, tests and labels) ----------
export function featuresAt(s: Scenario, t: number): string[] {
  const out: string[] = [];
  if (s === 'divergent') {
    out.push('rift valley', 'mid-ocean ridge');
    if (t > 0.1) out.push('new oceanic crust');
    if (t > 0.2) out.push('magnetic stripes');
  } else if (s === 'transform') {
    out.push('transform fault', 'ridge segments');
    if (t > 0.05) out.push('offset sea floor', 'shallow earthquakes');
  } else {
    const m = subduction(s, t);
    out.push('sinking plate');
    if (t > 0.05) out.push('trench');
    if (m.wedge > 0.3) out.push('accretionary wedge');
    if (m.slabLength > 120) out.push('earthquakes along the slab');
    if (m.arc > 0.1) out.push(s === 'ocean-ocean' ? 'volcanic island arc' : s === 'ocean-continent' ? 'continental volcanic arc' : 'volcanic arc');
    if (m.collision > 0.15) out.push('folded mountains', 'thickened crust');
    if (m.collision > 0.15 && m.arc < 0.05) out.push('volcanic arc extinct');
    if (m.breakoff > 0.5) out.push('slab break-off');
  }
  return out;
}

export function describe(s: Scenario, t: number): string {
  const info = SCENARIOS.find((x) => x.id === s)!;
  const my = Math.round(t * info.maxMy);
  return `${info.label}, ${my} million years in. Features present: ${featuresAt(s, t).join(', ')}.`;
}
