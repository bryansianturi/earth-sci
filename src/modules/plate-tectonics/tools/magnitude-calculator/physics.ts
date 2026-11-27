/**
 * Earthquake magnitude maths. Pure functions, no DOM, fully unit-tested.
 *
 * Sources (see CREDITS.md):
 *  - Moment magnitude: Mw = (2/3)(log10 M0 - 9.1), M0 in newton-metres (IASPEI / USGS convention; Hanks & Kanamori 1979).
 *  - Radiated energy: log10 E = 1.5 M + 4.8, E in joules (Gutenberg & Richter 1956; as published by USGS).
 *  - Ms, mb -> Mw: Scordilis (2006), J. Seismology 10, 225-236.
 */

export const TNT_JOULES_PER_TONNE = 4.184e9; // defined thermochemical value

export const momentFromMw = (mw: number) => 10 ** (1.5 * mw + 9.1);
export const mwFromMoment = (m0: number) => (2 / 3) * (Math.log10(m0) - 9.1);
export const energyFromMagnitude = (m: number) => 10 ** (1.5 * m + 4.8);
export const magnitudeFromEnergy = (joules: number) => (Math.log10(joules) - 4.8) / 1.5;
export const tntTonnes = (joules: number) => joules / TNT_JOULES_PER_TONNE;

/** How many times more energy `a` releases than `b`. */
export const energyRatio = (a: number, b: number) => 10 ** (1.5 * (a - b));
/** How many times larger the ground-motion amplitude is for `a` than `b` (same distance/instrument). */
export const amplitudeRatio = (a: number, b: number) => 10 ** (a - b);

export type Scale = 'Mw' | 'Ms' | 'mb' | 'ML';

export interface Conversion {
  mw: number;
  /** True if the input lies inside the range the conversion was fitted on. */
  inRange: boolean;
  /** True for any empirical (non-identity) conversion. */
  approximate: boolean;
  /** Human-readable caveat, if any. */
  warning?: string;
}

/** Valid input ranges per scale. */
export const SCALE_RANGE: Record<Scale, [number, number]> = {
  Mw: [0, 10],
  Ms: [3.0, 8.2],
  mb: [3.5, 6.2],
  ML: [3, 6],
};

export function toMw(scale: Scale, value: number): Conversion {
  const [lo, hi] = SCALE_RANGE[scale];
  const inRange = value >= lo && value <= hi;
  switch (scale) {
    case 'Mw':
      return { mw: value, inRange, approximate: false, ...(inRange ? {} : { warning: 'Magnitudes below 0 or above 10 are outside anything ever measured.' }) };
    case 'Ms': {
      // Scordilis (2006): two linear branches meeting near Ms 6.1-6.2.
      const mw = value <= 6.15 ? 0.67 * value + 2.07 : 0.99 * value + 0.08;
      return { mw, inRange, approximate: true, ...(inRange ? {} : { warning: 'Outside the 3.0-8.2 range this relation was fitted on; treat the result as a rough guess.' }) };
    }
    case 'mb': {
      const mw = 0.85 * value + 1.03;
      const w = value > hi
        ? 'mb saturates (stops growing) around 6, so it cannot size large earthquakes. The relation is only fitted to mb 3.5-6.2.'
        : value < lo ? 'Below the mb 3.5-6.2 range this relation was fitted on.' : undefined;
      return { mw, inRange, approximate: true, ...(w ? { warning: w } : {}) };
    }
    case 'ML': {
      // No universal ML->Mw formula exists; ML depends on the regional calibration.
      const w = inRange
        ? 'Local magnitude (ML) is calibrated per region, so ML is only roughly equal to Mw, and only for moderate earthquakes.'
        : 'ML is only roughly comparable to Mw between about 3 and 6, and it saturates for larger earthquakes. Result may be far off.';
      return { mw: value, inRange, approximate: true, warning: w };
    }
  }
}

export interface Reference { id: string; label: string; joules: number; note: string }

/** Smallest-first list of everyday energy references. Sources are listed in comparisons.ts. */
export function nearestReferences(joules: number, refs: Reference[], count = 3): Array<Reference & { ratio: number }> {
  return refs
    .map((r) => ({ ...r, ratio: joules / r.joules }))
    .sort((a, b) => Math.abs(Math.log10(a.ratio)) - Math.abs(Math.log10(b.ratio)))
    .slice(0, count)
    .sort((a, b) => a.joules - b.joules);
}

/** "3.2 × 10¹⁵" style formatting using HTML <sup>. */
export function sci(x: number, digits = 2): string {
  if (!isFinite(x) || x === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const mant = x / 10 ** exp;
  if (exp > -3 && exp < 5) return Number(x.toPrecision(3)).toLocaleString('en-US', { maximumFractionDigits: 3 });
  return `${mant.toFixed(digits - 1)} × 10<sup>${exp}</sup>`;
}

/** "about 32 times", "about 1/5 of" etc. */
export function describeRatio(r: number): string {
  if (r >= 0.95 && r <= 1.05) return 'about the same as';
  if (r > 1) return `about ${r >= 100 ? sci(r, 2) : Number(r.toPrecision(2)).toLocaleString('en-US')}× `;
  const inv = 1 / r;
  return `about 1/${inv >= 100 ? sci(inv, 2) : Number(inv.toPrecision(2)).toLocaleString('en-US')} of `;
}
