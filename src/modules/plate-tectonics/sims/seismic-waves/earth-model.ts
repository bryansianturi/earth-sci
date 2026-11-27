/**
 * Simplified radial Earth model after PREM (Dziewonski & Anderson, 1981).
 * Velocities are linear between a handful of knots per layer, so they are
 * accurate to a few percent, not to the published polynomial fits.
 * Only radius matters (spherical symmetry): no lateral variation, no anisotropy, no attenuation.
 */
export const R_EARTH = 6371;
export const R_MOHO = 6346.6; // 24.4 km depth
export const R_CMB = 3480; // core-mantle boundary, 2891 km depth
export const R_ICB = 1221.5; // inner-core boundary, 5149.5 km depth

export type WaveType = 'P' | 'S';

export interface Layer {
  name: string;
  rTop: number;
  rBot: number;
  vp: [number, number]; // km/s at top, bottom
  vs: [number, number];
}

export const LAYERS: Layer[] = [
  { name: 'upper crust', rTop: 6371, rBot: 6356, vp: [5.8, 5.8], vs: [3.2, 3.2] },
  { name: 'lower crust', rTop: 6356, rBot: R_MOHO, vp: [6.8, 6.8], vs: [3.9, 3.9] },
  { name: 'uppermost mantle (lid)', rTop: R_MOHO, rBot: 6291, vp: [8.11, 8.08], vs: [4.49, 4.47] },
  { name: 'low-velocity zone', rTop: 6291, rBot: 6151, vp: [8.08, 7.99], vs: [4.47, 4.42] },
  { name: 'upper mantle', rTop: 6151, rBot: 5971, vp: [8.56, 8.91], vs: [4.64, 4.77] },
  { name: 'transition zone', rTop: 5971, rBot: 5701, vp: [9.13, 10.27], vs: [4.93, 5.57] },
  { name: 'top of lower mantle', rTop: 5701, rBot: 5600, vp: [10.75, 11.07], vs: [5.95, 6.24] },
  { name: 'lower mantle 1', rTop: 5600, rBot: 5000, vp: [11.07, 11.95], vs: [6.24, 6.63] },
  { name: 'lower mantle 2', rTop: 5000, rBot: 4400, vp: [11.95, 12.85], vs: [6.63, 6.95] },
  { name: 'lower mantle 3', rTop: 4400, rBot: 3630, vp: [12.85, 13.68], vs: [6.95, 7.26] },
  { name: "D'' layer", rTop: 3630, rBot: R_CMB, vp: [13.68, 13.72], vs: [7.26, 7.26] },
  { name: 'outer core 1', rTop: R_CMB, rBot: 2500, vp: [8.06, 9.3], vs: [0, 0] },
  { name: 'outer core 2', rTop: 2500, rBot: R_ICB, vp: [9.3, 10.36], vs: [0, 0] },
  { name: 'inner core', rTop: R_ICB, rBot: 0, vp: [11.03, 11.26], vs: [3.5, 3.67] },
];

/** Wave speed (km/s) at radius r. S-wave speed is exactly 0 in the liquid outer core. */
export function velocity(r: number, wave: WaveType): number {
  if (r > R_EARTH) r = R_EARTH; // just above the surface: use the surface value
  for (const L of LAYERS) {
    if (r <= L.rTop && r > L.rBot) {
      const f = (L.rTop - r) / (L.rTop - L.rBot);
      const [a, b] = wave === 'P' ? L.vp : L.vs;
      return a + (b - a) * f;
    }
  }
  const last = LAYERS[LAYERS.length - 1]!;
  return wave === 'P' ? last.vp[1] : last.vs[1];
}

export const isLiquid = (r: number) => r < R_CMB && r > R_ICB;
