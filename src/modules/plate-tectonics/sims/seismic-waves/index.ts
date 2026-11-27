import type { MountFn } from '@core/embed/types';
import { SimShell, makeSegmented } from '@core/sim-kit/SimShell';
import type { Colors } from '@core/sim-kit/colors';
import { R_EARTH, R_CMB, R_ICB } from './earth-model';
import { traceRay, computeShadowZones, FAN_ANGLES, type Ray } from './raytrace';

const W = 960, H = 580;
const C = { x: 305, y: 292 };
const R = 236; // drawn Earth radius in px
const T_MAX = 1260; // seconds of Earth time (a bit over the PKIKP time to the far side)
const TIME_SCALE = 30; // Earth seconds per real second at 1x
type Show = 'both' | 'P' | 'S';

const px = (r: number) => (r / R_EARTH) * R;
const deg = (rad: number) => (rad * 180) / Math.PI;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const mount: MountFn = (el, { meta }) => {
  const zones = computeShadowZones();
  const traced = (w: 'P' | 'S') =>
    FAN_ANGLES.map((a) => traceRay(w, Math.max(a, 0.05))).filter((r) => r.status !== 'lost' && r.phase !== 'PKiKP');
  const rays = { P: traced('P'), S: traced('S') };

  let t = 0;
  let epi = 0.9; // radians clockwise from top
  let show: Show = 'both';
  let showRays = true;
  let showFronts = true;
  let showZones = true;
  let scrub: HTMLInputElement;

  const toXY = (r: number, ang: number) => ({ x: C.x + px(r) * Math.sin(ang), y: C.y - px(r) * Math.cos(ang) });

  /** Position of a ray at Earth-time T, or null if the wave has already finished. */
  function posAt(ray: Ray, T: number, sign: number) {
    const n = ray.t.length;
    if (T < 0) return null;
    if (T >= ray.t[n - 1]!) return null;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ray.t[m]! <= T) lo = m; else hi = m; }
    const f = (T - ray.t[lo]!) / Math.max(ray.t[hi]! - ray.t[lo]!, 1e-9);
    const r = ray.r[lo]! + (ray.r[hi]! - ray.r[lo]!) * f;
    const th = ray.th[lo]! + (ray.th[hi]! - ray.th[lo]!) * f;
    return toXY(r, epi + sign * th);
  }

  function drawPath(ctx: CanvasRenderingContext2D, ray: Ray, sign: number) {
    ctx.beginPath();
    for (let i = 0; i < ray.t.length; i++) {
      if (ray.t[i]! > t) {
        const p = posAt(ray, t, sign);
        if (p) ctx.lineTo(p.x, p.y);
        break;
      }
      const q = toXY(ray.r[i]!, epi + sign * ray.th[i]!);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }

  const label = (ctx: CanvasRenderingContext2D, c: Colors, text: string, x: number, y: number, o: { align?: CanvasTextAlign; size?: number; bold?: boolean; color?: string } = {}) => {
    ctx.font = `${o.bold ? '600 ' : ''}${o.size ?? 13}px Inter Variable, system-ui, sans-serif`;
    ctx.textAlign = o.align ?? 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.fillStyle = c.panel;
    ctx.fillRect(x0 - 4, y - (o.size ?? 13) * 0.75, w + 8, (o.size ?? 13) * 1.5);
    ctx.fillStyle = o.color ?? c.text;
    ctx.fillText(text, x, y);
  };

  function arc(ctx: CanvasRenderingContext2D, radius: number, a0: number, a1: number) {
    ctx.beginPath();
    ctx.arc(C.x, C.y, radius, a0 - Math.PI / 2, a1 - Math.PI / 2);
    ctx.stroke();
  }

  function draw(ctx: CanvasRenderingContext2D, c: Colors, labels: boolean) {
    // --- Earth layers ---
    ctx.fillStyle = c.mantle;
    ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c['outer-core'];
    ctx.beginPath(); ctx.arc(C.x, C.y, px(R_CMB), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c['inner-core'];
    ctx.beginPath(); ctx.arc(C.x, C.y, px(R_ICB), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.line; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    for (const r of [R_CMB, R_ICB]) { ctx.beginPath(); ctx.arc(C.x, C.y, px(r), 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c['continental-crust']; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, Math.PI * 2); ctx.stroke();

    // --- shadow-zone bands on the rim, from the traced rays ---
    if (showZones) {
      ctx.lineCap = 'butt';
      if (show !== 'S') {
        ctx.strokeStyle = c.p; ctx.globalAlpha = 0.8; ctx.lineWidth = 9;
        const a = (zones.pShadowStart * Math.PI) / 180, b = (zones.pShadowEnd * Math.PI) / 180;
        arc(ctx, R + 11, epi + a, epi + b);
        arc(ctx, R + 11, epi - b, epi - a);
      }
      if (show !== 'P') {
        ctx.strokeStyle = c.s; ctx.globalAlpha = 0.8; ctx.lineWidth = 9;
        const a = (zones.sShadowStart * Math.PI) / 180;
        arc(ctx, R + 22, epi + a, epi + 2 * Math.PI - a);
      }
      ctx.globalAlpha = 1;
    }

    // --- rays and wavefronts ---
    const waves: Array<['P' | 'S', string]> = [];
    if (show !== 'S') waves.push(['P', c.p]);
    if (show !== 'P') waves.push(['S', c.s]);
    for (const [w, color] of waves) {
      const list = rays[w];
      if (showRays) {
        ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
        for (const ray of list) { drawPath(ctx, ray, 1); if (ray.takeoffDeg > 0.1) drawPath(ctx, ray, -1); }
        ctx.globalAlpha = 1;
      }
      if (showFronts) {
        // order rays across the symmetry axis so the front is one continuous curve
        const seq: Array<{ ray: Ray; sign: number }> = [
          ...[...list].reverse().filter((r) => r.takeoffDeg > 0.1).map((ray) => ({ ray, sign: -1 })),
          ...list.map((ray) => ({ ray, sign: 1 })),
        ];
        const pts = seq.map(({ ray, sign }) => ({ p: posAt(ray, t, sign), core: ray.phase === 'PKP' || ray.phase === 'PKIKP' }));
        ctx.strokeStyle = color; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i]!, b = pts[i + 1]!;
          if (!a.p || !b.p || a.core !== b.core) continue;
          if (Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) > 70) continue;
          ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(b.p.x, b.p.y); ctx.stroke();
        }
        ctx.fillStyle = color;
        for (const q of pts) if (q.p) { ctx.beginPath(); ctx.arc(q.p.x, q.p.y, 2.4, 0, Math.PI * 2); ctx.fill(); }
      }
      // S-waves stopping at the core, and arrivals at the surface
      for (const ray of list) for (const sign of ray.takeoffDeg > 0.1 ? [1, -1] : [1]) {
        const end = ray.t[ray.t.length - 1]!;
        if (t < end) continue;
        const q = toXY(ray.r[ray.r.length - 1]!, epi + sign * ray.th[ray.th.length - 1]!);
        if (ray.status === 'stopped') {
          ctx.strokeStyle = c.s; ctx.lineWidth = 2.5; ctx.beginPath();
          ctx.moveTo(q.x - 5, q.y - 5); ctx.lineTo(q.x + 5, q.y + 5); ctx.moveTo(q.x + 5, q.y - 5); ctx.lineTo(q.x - 5, q.y + 5); ctx.stroke();
        } else {
          ctx.fillStyle = color; ctx.strokeStyle = c.panel; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
    }

    // --- epicentre ---
    const e = toXY(R_EARTH, epi);
    const pulse = (t % 40) / 40;
    ctx.strokeStyle = c.quake; ctx.globalAlpha = 1 - pulse; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, 8 + pulse * 18, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = c.quake; ctx.strokeStyle = c.line; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? 5 : 11, a = (i * Math.PI) / 5; ctx.lineTo(e.x + rr * Math.sin(a), e.y - rr * Math.cos(a)); }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // --- labels ---
    if (labels) {
      label(ctx, c, 'Mantle (solid rock)', C.x - 150, C.y - 40, { align: 'center', bold: true });
      label(ctx, c, 'Outer core (liquid)', C.x + 20, C.y + 100, { align: 'center', bold: true });
      label(ctx, c, 'Inner core (solid)', C.x, C.y - 14, { align: 'center', bold: true, size: 11 });
      label(ctx, c, 'Core–mantle boundary, 2,891 km deep', C.x + 150, C.y + 215, { align: 'left', size: 11 });
      label(ctx, c, 'Crust: too thin to see at this scale', C.x, C.y + R + 38 > H - 6 ? H - 8 : C.y + R + 38, { align: 'center', size: 11 });
      const ang = epi - 0.0;
      const ep = toXY(R_EARTH + 34, ang);
      label(ctx, c, 'Epicentre', ep.x, ep.y - 8, { align: 'center', bold: true, size: 12 });
      if (showZones && show !== 'S') {
        const m = toXY(R_EARTH + 36, epi + Math.PI + 0.0);
        label(ctx, c, `P shadow ≈ ${Math.round(zones.pShadowStart)}°–${Math.round(zones.pShadowEnd)}°`, m.x + 90, m.y - 4, { align: 'center', size: 11, color: c.p });
      }
      if (showZones && show !== 'P') {
        const m = toXY(R_EARTH + 36, epi + Math.PI);
        label(ctx, c, `S shadow > ${Math.round(zones.sShadowStart)}°`, m.x - 20, m.y + 16, { align: 'center', size: 11, color: c.s });
      }
    }

    // --- right-hand panel ---
    const X = 640;
    ctx.fillStyle = c.panel; ctx.fillRect(X, 24, 296, H - 48);
    ctx.fillStyle = c.text; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 13px Inter Variable, system-ui, sans-serif'; ctx.fillText('Earth time since the earthquake', X + 16, 52);
    ctx.font = '700 40px Inter Variable, system-ui, sans-serif'; ctx.fillText(mmss(t), X + 16, 98);
    ctx.font = '12px Inter Variable, system-ui, sans-serif'; ctx.fillStyle = c.text; ctx.globalAlpha = 0.7;
    ctx.fillText('minutes : seconds (animation is sped up)', X + 16, 118); ctx.globalAlpha = 1;

    const row = (y: number, color: string, title: string, lines: string[]) => {
      ctx.fillStyle = color; ctx.fillRect(X + 16, y - 11, 22, 5);
      ctx.fillStyle = c.text; ctx.font = '600 14px Inter Variable, system-ui, sans-serif'; ctx.fillText(title, X + 46, y - 3);
      ctx.font = '12.5px Inter Variable, system-ui, sans-serif';
      lines.forEach((l, i) => ctx.fillText(l, X + 16, y + 18 + i * 17));
      return y + 18 + lines.length * 17;
    };
    let y = 158;
    y = row(y, c.p, 'P-waves (push–pull)', ['Travel through solids AND liquids.', 'Fastest, so they arrive first.']) + 26;
    y = row(y, c.s, 'S-waves (side-to-side)', ['Travel through solids only.', 'About 60% of P-wave speed.']) + 26;
    ctx.fillStyle = c.text; ctx.font = '600 14px Inter Variable, system-ui, sans-serif'; ctx.fillText('What the rays show', X + 16, y);
    ctx.font = '12.5px Inter Variable, system-ui, sans-serif';
    const notes = [
      `✕  S-waves stop at the core: no S arrives`,
      `    beyond ${Math.round(zones.sShadowStart)}° from the epicentre.`,
      `●  P-waves bend sharply entering the core,`,
      `    leaving a P shadow ${Math.round(zones.pShadowStart)}°–${Math.round(zones.pShadowEnd)}°.`,
      `Both facts say: the outer core is liquid.`,
      `Weak P-waves through the inner core still`,
      `reach the shadow zone (from ≈${Math.round(zones.pkikpFirst)}°):`,
      `the inner core is solid.`,
    ];
    notes.forEach((l, i) => ctx.fillText(l, X + 16, y + 20 + i * 17));
    ctx.globalAlpha = 0.7; ctx.font = '11.5px Inter Variable, system-ui, sans-serif';
    ctx.fillText('Drag the ★ (or press ← →) to move the epicentre.', X + 16, H - 38);
    ctx.globalAlpha = 1;
  }

  const shell = new SimShell(el, {
    title: meta.title,
    simplifications: meta.simplifications ?? [],
    width: W, height: H,
    autoplay: true,
    buildControls(host, sh) {
      makeSegmented<Show>(host, 'Waves to show', [{ value: 'both', text: 'P + S' }, { value: 'P', text: 'P only' }, { value: 'S', text: 'S only' }], 'both', (v) => { show = v; sh.requestDraw(); });
      const mk = (text: string, init: boolean, cb: (v: boolean) => void) => {
        const l = document.createElement('label');
        l.innerHTML = `<input type="checkbox" ${init ? 'checked' : ''}> ${text}`;
        l.querySelector('input')!.addEventListener('change', (e) => { cb((e.target as HTMLInputElement).checked); sh.requestDraw(); });
        host.appendChild(l);
      };
      mk('Ray paths', true, (v) => (showRays = v));
      mk('Wavefronts', true, (v) => (showFronts = v));
      mk('Shadow zones', true, (v) => (showZones = v));
      const l = document.createElement('label');
      l.innerHTML = `Time <input type="range" min="0" max="${T_MAX}" step="1" value="0" aria-label="Elapsed time" style="width:11rem">`;
      scrub = l.querySelector('input')!;
      scrub.addEventListener('input', () => { t = Number(scrub.value); sh.requestDraw(); });
      host.appendChild(l);
    },
    update(dt) {
      t = Math.min(T_MAX, t + dt * TIME_SCALE);
      scrub.value = String(Math.round(t));
      if (t >= T_MAX) shell.pause();
    },
    draw,
    reset() { t = 0; epi = 0.9; scrub.value = '0'; },
    describe() {
      const deg0 = Math.round(((deg(epi) % 360) + 360) % 360);
      const stopped = rays.S.filter((r) => r.status === 'stopped' && r.t[r.t.length - 1]! <= t).length;
      return `Time ${mmss(t)}. Epicentre at ${deg0} degrees clockwise from the top. ${stopped ? 'S-waves have reached the core and stopped. ' : ''}P shadow zone ${Math.round(zones.pShadowStart)} to ${Math.round(zones.pShadowEnd)} degrees; S-waves absent beyond ${Math.round(zones.sShadowStart)} degrees.`;
    },
  });

  // dragging the epicentre
  let dragging = false;
  const setEpi = (e: PointerEvent) => { const p = shell.pointer(e); epi = Math.atan2(p.x - C.x, -(p.y - C.y)); shell.requestDraw(); };
  shell.canvas.addEventListener('pointerdown', (e) => {
    const p = shell.pointer(e);
    if (Math.hypot(p.x - C.x, p.y - C.y) > R + 40 || p.x > 640) return;
    dragging = true; shell.canvas.setPointerCapture(e.pointerId); setEpi(e);
  });
  shell.canvas.addEventListener('pointermove', (e) => { if (dragging) setEpi(e); });
  const end = () => { dragging = false; };
  shell.canvas.addEventListener('pointerup', end);
  shell.canvas.addEventListener('pointercancel', end);
  shell.stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { epi -= 0.0873; shell.requestDraw(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { epi += 0.0873; shell.requestDraw(); e.preventDefault(); }
  });

  return { destroy: () => shell.destroy() };
};
