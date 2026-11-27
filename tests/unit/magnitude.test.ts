import { describe, it, expect } from 'vitest';
import {
  momentFromMw, mwFromMoment, energyFromMagnitude, magnitudeFromEnergy, tntTonnes,
  energyRatio, amplitudeRatio, toMw, nearestReferences,
} from '@modules/plate-tectonics/tools/magnitude-calculator/physics';
import { REFERENCES } from '@modules/plate-tectonics/tools/magnitude-calculator/comparisons';

describe('magnitude physics', () => {
  it('one magnitude unit = ~31.6x energy and 10x amplitude', () => {
    expect(energyRatio(7, 6)).toBeCloseTo(31.62, 1);
    expect(energyRatio(8, 6)).toBeCloseTo(1000, 6);
    expect(amplitudeRatio(7, 6)).toBeCloseTo(10, 10);
    expect(energyRatio(5, 7)).toBeCloseTo(1 / 1000, 9);
  });
  it('moment <-> Mw round-trips and matches the definition', () => {
    expect(mwFromMoment(10 ** 9.1)).toBeCloseTo(0, 10);
    for (const m of [2, 5.5, 7, 9.5]) expect(mwFromMoment(momentFromMw(m))).toBeCloseTo(m, 10);
    // Mw 9.1 => M0 = 10^22.75 N m
    expect(Math.log10(momentFromMw(9.1))).toBeCloseTo(22.75, 10);
  });
  it('energy <-> magnitude round-trips; M6 and M7 values', () => {
    expect(Math.log10(energyFromMagnitude(6))).toBeCloseTo(13.8, 10);
    expect(Math.log10(energyFromMagnitude(7))).toBeCloseTo(15.3, 10);
    expect(magnitudeFromEnergy(energyFromMagnitude(6.3))).toBeCloseTo(6.3, 10);
  });
  it('TNT equivalent: M7 is roughly half a megatonne', () => {
    const kt = tntTonnes(energyFromMagnitude(7)) / 1000;
    expect(kt).toBeGreaterThan(400);
    expect(kt).toBeLessThan(550);
  });
});

describe('scale conversions (Scordilis 2006)', () => {
  it('Ms branches meet within 0.05 magnitude units', () => {
    const lo = 0.67 * 6.15 + 2.07, hi = 0.99 * 6.15 + 0.08;
    expect(Math.abs(lo - hi)).toBeLessThan(0.05);
  });
  it('Ms 7 -> Mw ~7.0, Ms 5 -> Mw ~5.4', () => {
    expect(toMw('Ms', 7).mw).toBeCloseTo(7.01, 2);
    expect(toMw('Ms', 5).mw).toBeCloseTo(5.42, 2);
  });
  it('mb 5 -> Mw ~5.28', () => expect(toMw('mb', 5).mw).toBeCloseTo(5.28, 2));
  it('flags out-of-range and saturated inputs', () => {
    expect(toMw('mb', 7).inRange).toBe(false);
    expect(toMw('mb', 7).warning).toMatch(/saturat/);
    expect(toMw('Ms', 9).inRange).toBe(false);
    expect(toMw('ML', 3).approximate).toBe(true);
    expect(toMw('Mw', 6).approximate).toBe(false);
  });
});

describe('everyday comparisons', () => {
  it('picks the nearest references, ordered by size', () => {
    const refs = nearestReferences(energyFromMagnitude(5), REFERENCES, 3);
    expect(refs).toHaveLength(3);
    expect(refs[0]!.joules).toBeLessThan(refs[2]!.joules);
    // M5 = 10^12.3 J = 2e12 J, nearest is Hiroshima (6.3e13) or home-year (3.8e10)
    expect(refs.map((r) => r.id)).toContain('hiroshima');
  });
});
