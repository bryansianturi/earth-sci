import { R_EARTH, R_CMB, R_ICB, velocity, type WaveType } from './earth-model';

/**
 * Numerical ray tracing through the radial model.
 * In a spherically symmetric Earth the ray parameter p = r·sin(i)/v is conserved (Snell's law),
 * so we march along the ray in small steps, turning it around when sin(i) would exceed 1.
 * Shadow zones are NOT drawn by hand: they appear because of where these rays end up.
 *
 * Simplifications: only direct, transmitted rays are followed. Reflections, mode conversions
 * (P↔S at boundaries), diffraction and surface waves are left out.
 */

/** PKiKP = reflected off the inner-core boundary (not drawn; reflections are omitted). */
export type Phase = 'P' | 'PKP' | 'PKIKP' | 'PKiKP' | 'S';
export type Status = 'arrived' | 'stopped' | 'lost';

export interface Ray {
  wave: WaveType;
  takeoffDeg: number;
  phase: Phase;
  status: Status;
  /** Epicentral distance of the final point, degrees. */
  deltaDeg: number;
  /** Travel time of the final point, seconds. */
  time: number;
  /** Deepest point reached, km radius. */
  rMin: number;
  /** Sampled path (only when record=true). */
  r: number[];
  th: number[];
  t: number[];
}

const STEP_KM = 8;
const SAMPLE_KM = 20;

export function traceRay(wave: WaveType, takeoffDeg: number, depthKm = 33, record = true): Ray {
  let r = R_EARTH - depthKm;
  let th = 0;
  let time = 0;
  let dirR = -1; // -1 = moving down
  const p = (r * Math.sin((takeoffDeg * Math.PI) / 180)) / velocity(r, wave);
  const rs: number[] = [];
  const ths: number[] = [];
  const ts: number[] = [];
  let rMin = r;
  let sinceSample = SAMPLE_KM;
  let status: Status = 'lost';
  let reflectedAtICB = false;

  const push = () => { rs.push(r); ths.push(th); ts.push(time); sinceSample = 0; };
  if (record) push();

  for (let i = 0; i < 60000; i++) {
    const v = velocity(r, wave);
    if (wave === 'S' && v === 0) { status = 'stopped'; break; }
    const sinI = Math.min((p * v) / r, 0.99999);
    const cosI = Math.sqrt(1 - sinI * sinI);

    // Adaptive step: small near the centre where the ray bends fast per kilometre.
    let ds = Math.min(STEP_KM, Math.max(0.5, r * 0.03));
    let rNext = r;
    let sinM = sinI, rM = r, vM = v;
    let blocked = false;
    // Try the step; if the destination is unreachable (sin i would exceed 1: a turning point
    // or total reflection at a velocity jump), shorten the step, then reflect in place.
    for (let k = 0; k < 14; k++) {
      // midpoint (Heun) estimate of the ray direction across the step
      const rGuess = Math.max(r + dirR * ds * cosI, 0.5);
      rM = Math.max((r + rGuess) / 2, 0.5);
      vM = velocity(rM, wave);
      sinM = vM === 0 ? sinI : Math.min((p * vM) / rM, 0.99999);
      const cosM = Math.sqrt(1 - sinM * sinM);
      rNext = Math.max(r + dirR * ds * cosM, 0.5);
      const vN = velocity(rNext, wave);
      if (wave === 'S' && vN === 0) break; // handled below as arrival at the CMB
      if ((p * vN) / rNext < 1) { blocked = false; break; }
      blocked = true;
      ds /= 2;
    }
    if (blocked) {
      if (Math.abs(r - R_ICB) < 1.5) reflectedAtICB = true;
      dirR = -dirR;
      th += (ds * sinI) / r;
      time += ds / v;
      continue;
    }
    const dth = (ds * sinM) / rM;
    const dt = ds / (vM || v);

    // S waves cannot enter the liquid outer core
    if (wave === 'S' && rNext <= R_CMB && dirR < 0) {
      const f = (r - R_CMB) / Math.max(r - rNext, 1e-9);
      th += dth * f; time += dt * f; r = R_CMB;
      if (record) push();
      rMin = Math.min(rMin, r);
      status = 'stopped';
      break;
    }
    if (rNext >= R_EARTH && dirR > 0) {
      const f = (R_EARTH - r) / Math.max(rNext - r, 1e-9);
      th += dth * f; time += dt * f; r = R_EARTH;
      if (record) push();
      status = 'arrived';
      break;
    }
    if (rNext <= 0.5) { // passing through the centre: emerge on the opposite side
      th += Math.PI; rNext = 0.5; dirR = 1;
    }
    r = rNext; th += dth; time += dt;
    if (r < rMin) rMin = r;
    sinceSample += ds;
    if (record && sinceSample >= SAMPLE_KM) push();
  }

  const phase: Phase = wave === 'S' ? 'S' : reflectedAtICB ? 'PKiKP' : rMin <= R_ICB ? 'PKIKP' : rMin <= R_CMB ? 'PKP' : 'P';
  const delta = (((th * 180) / Math.PI) % 360 + 360) % 360;
  return { wave, takeoffDeg, phase, status, deltaDeg: delta > 180 ? 360 - delta : delta, time, rMin, r: rs, th: ths, t: ts };
}

export interface ShadowSummary {
  /** Largest distance reached by P rays that turn in the mantle (start of the P shadow zone). */
  pShadowStart: number;
  /** Smallest distance reached by P rays refracted through the outer core (end of the P shadow zone). */
  pShadowEnd: number;
  /** Smallest distance at which rays through the inner core (PKIKP) arrive. */
  pkikpFirst: number;
  /** Largest distance reached by direct S rays (start of the S shadow zone, which runs to 180°). */
  sShadowStart: number;
}

let cached: ShadowSummary | null = null;

/** Dense scan of take-off angles; result is independent of epicentre location. */
export function computeShadowZones(stepDeg = 0.1): ShadowSummary {
  if (cached && stepDeg === 0.1) return cached;
  let pMax = 0, pkpMin = 180, pkikpMin = 180, sMax = 0;
  for (let a = 0.05; a < 90; a += stepDeg) {
    const p = traceRay('P', a, 33, false);
    if (p.status === 'arrived') {
      if (p.phase === 'P') pMax = Math.max(pMax, p.deltaDeg);
      else if (p.phase === 'PKP') pkpMin = Math.min(pkpMin, p.deltaDeg);
      else pkikpMin = Math.min(pkikpMin, p.deltaDeg);
    }
    const s = traceRay('S', a, 33, false);
    if (s.status === 'arrived') sMax = Math.max(sMax, s.deltaDeg);
  }
  const res = { pShadowStart: pMax, pShadowEnd: pkpMin, pkikpFirst: pkikpMin, sShadowStart: sMax };
  if (stepDeg === 0.1) cached = res;
  return res;
}

/** Take-off angles (degrees from straight down) used for the drawn fan. Dense near the core-grazing ray (~19°). */
export const FAN_ANGLES = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5, 21, 22.5, 24, 27, 30, 34, 39, 45, 52, 60, 69, 79, 89];
