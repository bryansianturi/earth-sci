import { describe, it, expect } from 'vitest';
import { traceRay, computeShadowZones } from '@modules/plate-tectonics/sims/seismic-waves/raytrace';
import { velocity, R_CMB, R_ICB, LAYERS } from '@modules/plate-tectonics/sims/seismic-waves/earth-model';

describe('earth model', () => {
  it('S-wave speed is zero in the outer core only', () => {
    expect(velocity(2500, 'S')).toBe(0);
    expect(velocity(R_CMB + 1, 'S')).toBeGreaterThan(7);
    expect(velocity(R_ICB - 1, 'S')).toBeGreaterThan(3);
  });
  it('P speed drops sharply at the core-mantle boundary', () => {
    expect(velocity(R_CMB + 1, 'P') / velocity(R_CMB - 1, 'P')).toBeGreaterThan(1.6);
  });
  it('layers are contiguous from surface to centre', () => {
    for (let i = 1; i < LAYERS.length; i++) expect(LAYERS[i]!.rTop).toBe(LAYERS[i - 1]!.rBot);
    expect(LAYERS[0]!.rTop).toBe(6371);
    expect(LAYERS.at(-1)!.rBot).toBe(0);
  });
});

describe('ray tracing', () => {
  it('rays arrive at the surface with increasing time', () => {
    const r = traceRay('P', 45);
    expect(r.status).toBe('arrived');
    expect(r.t[r.t.length - 1]).toBeCloseTo(r.time, 6);
    expect(r.time).toBeGreaterThan(0);
  });
  it('S rays that reach the core-mantle boundary stop there', () => {
    const r = traceRay('S', 3);
    expect(r.status).toBe('stopped');
    expect(r.rMin).toBeCloseTo(R_CMB, 3);
  });
  it('a near-vertical P ray reaches the far side of the Earth through the inner core in ~20 minutes', () => {
    const r = traceRay('P', 0.3);
    expect(r.phase).toBe('PKIKP');
    expect(r.deltaDeg).toBeGreaterThan(170);
    expect(r.time / 60).toBeGreaterThan(17);
    expect(r.time / 60).toBeLessThan(23);
  });
});

describe('shadow zones emerge from the physics', () => {
  const z = computeShadowZones();
  it('S waves stop being detected at ~103 degrees (within 5)', () => {
    expect(Math.abs(z.sShadowStart - 103)).toBeLessThan(5);
  });
  // Ray theory puts the grazing P ray at ~98-100 degrees; weak diffracted P waves reach ~104 (the textbook figure).
  it('P shadow zone starts at ~98-104 degrees', () => {
    expect(z.pShadowStart).toBeGreaterThan(94);
    expect(z.pShadowStart).toBeLessThan(106);
  });
  it('P shadow zone ends near the PKP caustic at ~142-145 degrees (within 6)', () => {
    expect(Math.abs(z.pShadowEnd - 143)).toBeLessThan(6);
  });
  it('inner-core rays arrive inside the shadow zone (Lehmann 1936)', () => {
    expect(z.pkikpFirst).toBeGreaterThan(z.pShadowStart);
    expect(z.pkikpFirst).toBeLessThan(z.pShadowEnd);
  });
});
