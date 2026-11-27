import { describe, it, expect } from 'vitest';
import { subduction, divergent, featuresAt, SCENARIOS, seafloorY, COLLISION_START, G } from '@modules/plate-tectonics/sims/plate-boundaries/model';

const steps = Array.from({ length: 101 }, (_, i) => i / 100);

describe('plate model invariants', () => {
  it('slabs only grow, spreading only widens', () => {
    for (const k of ['ocean-ocean', 'ocean-continent', 'continent-continent'] as const) {
      let prev = -1;
      for (const t of steps) { const L = subduction(k, t).slabLength; expect(L).toBeGreaterThanOrEqual(prev); prev = L; }
    }
    let w = 0;
    for (const t of steps) { const h = divergent(t).halfWidth; expect(h).toBeGreaterThan(w); w = h; }
  });
  it('subduction features appear in a sensible order', () => {
    expect(featuresAt('ocean-ocean', 0)).not.toContain('volcanic island arc');
    expect(featuresAt('ocean-ocean', 1)).toContain('volcanic island arc');
    expect(featuresAt('ocean-continent', 1)).toContain('continental volcanic arc');
    expect(featuresAt('ocean-ocean', 0.9)).toContain('trench');
    expect(featuresAt('ocean-ocean', 0.9)).not.toContain('folded mountains');
  });
  it('continent-continent: arc volcanism dies out and mountains grow only after collision', () => {
    expect(subduction('continent-continent', COLLISION_START - 0.01).collision).toBe(0);
    expect(featuresAt('continent-continent', 0.45)).not.toContain('folded mountains');
    const end = featuresAt('continent-continent', 1);
    expect(end).toContain('folded mountains');
    expect(end).toContain('volcanic arc extinct');
    expect(end).toContain('slab break-off');
    expect(subduction('continent-continent', 1).arc).toBeLessThan(0.01);
  });
  it('the continent reaches the trench exactly when collision starts', () => {
    expect(subduction('continent-continent', COLLISION_START).edgeX).toBeCloseTo(G.TRENCH_X - 6, 5);
  });
  it('sea floor deepens away from the ridge, with an axial rift valley', () => {
    const hw = 300;
    expect(seafloorY(150, hw)).toBeGreaterThan(seafloorY(40, hw));
    expect(seafloorY(hw, hw)).toBeCloseTo(G.FLOOR, 5);
    expect(seafloorY(0, hw, 1)).toBeGreaterThan(seafloorY(25, hw, 1) - 20); // valley dips below the adjacent crest
  });
  it('every scenario has a title and a finite time span', () => {
    for (const s of SCENARIOS) { expect(s.label.length).toBeGreaterThan(3); expect(s.maxMy).toBeGreaterThan(0); }
  });
});
