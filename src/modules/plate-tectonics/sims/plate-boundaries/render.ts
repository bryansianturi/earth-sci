import type { Colors } from '@core/sim-kit/colors';
import { G, divergent, subduction, transform, seafloorY, smooth, lerp, clamp01, SCENARIOS, type Scenario, type SubKind } from './model';

type Ctx = CanvasRenderingContext2D;
type Pt = { x: number; y: number };

const SEDIMENT = '#c9ab78';
const FONT = 'Inter Variable, system-ui, sans-serif';

// ---------------------------------------------------------------- helpers
function poly(ctx: Ctx, pts: Pt[], fill?: string, stroke?: string, lw = 1) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function arrow(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w = 3, head = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
}

function text(ctx: Ctx, c: Colors, s: string, x: number, y: number, o: { align?: CanvasTextAlign; size?: number; bold?: boolean; color?: string; bg?: boolean } = {}) {
  const size = o.size ?? 13;
  ctx.font = `${o.bold ? '600 ' : ''}${size}px ${FONT}`;
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'middle';
  if (o.bg !== false) {
    const w = ctx.measureText(s).width;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.fillStyle = c.panel;
    ctx.fillRect(x0 - 4, y - size * 0.8, w + 8, size * 1.6);
  }
  ctx.fillStyle = o.color ?? c.text;
  ctx.fillText(s, x, y);
}

/** Label with a leader line to the feature it names. */
function callout(ctx: Ctx, c: Colors, s: string, tx: number, ty: number, fx: number, fy: number, align: CanvasTextAlign = 'left') {
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.line; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
  text(ctx, c, s, tx, ty, { align, bold: true, size: 12.5 });
}

function bezier(p0: Pt, p1: Pt, p2: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, d = k * k;
    out.push({ x: a * p0.x + b * p1.x + d * p2.x, y: a * p0.y + b * p1.y + d * p2.y });
  }
  return out;
}

/** Offset a polyline along its normals (pointing "down" for left-to-right paths). */
function offset(path: Pt[], dist: number): Pt[] {
  return path.map((p, i) => {
    const a = path[Math.max(0, i - 1)]!, b = path[Math.min(path.length - 1, i + 1)]!;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / len) * dist, y: p.y + (dx / len) * dist };
  });
}

function band(ctx: Ctx, path: Pt[], d0: number, d1: number, fill: string) {
  poly(ctx, [...offset(path, d0), ...offset(path, d1).reverse()], fill);
}

function skyAndSea(ctx: Ctx, c: Colors, seaRight: number = G.W) {
  ctx.fillStyle = c.sky; ctx.fillRect(0, 0, G.W, G.SEA);
  ctx.fillStyle = c.asthenosphere; ctx.fillRect(0, G.FLOOR, G.W, G.H - G.FLOOR);
  ctx.fillStyle = c.water; ctx.fillRect(0, G.SEA, seaRight, G.FLOOR - G.SEA);
}

function seaLine(ctx: Ctx, c: Colors, x1 = 0, x2: number = G.W) {
  ctx.strokeStyle = c['water-deep']; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(x1, G.SEA); ctx.lineTo(x2, G.SEA); ctx.stroke(); ctx.setLineDash([]);
}

function volcano(ctx: Ctx, c: Colors, cx: number, baseY: number, h: number, halfW: number, erupting: boolean, t: number) {
  if (h < 1) return;
  poly(ctx, [{ x: cx - halfW, y: baseY }, { x: cx - 4, y: baseY - h }, { x: cx + 4, y: baseY - h }, { x: cx + halfW, y: baseY }], c['continental-crust']);
  ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke();
  if (erupting && h > 20) {
    ctx.fillStyle = c.magma;
    ctx.beginPath(); ctx.arc(cx, baseY - h - 3, 4 + 2 * Math.sin(t * 90), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.text; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, baseY - h - 8); ctx.quadraticCurveTo(cx + 10 + 6 * Math.sin(t * 40), baseY - h - 28, cx + 22, baseY - h - 46); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function quake(ctx: Ctx, c: Colors, x: number, y: number, r = 4.2, phase = 0, t = 0) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 120 + phase);
  ctx.strokeStyle = c.quake; ctx.globalAlpha = 0.5 * pulse; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r + 3 + 4 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = c.quake; ctx.strokeStyle = '#1d2327'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function headline(ctx: Ctx, c: Colors, scenario: Scenario, t: number) {
  const info = SCENARIOS.find((s) => s.id === scenario)!;
  text(ctx, c, info.label, 16, 22, { bold: true, size: 15 });
  text(ctx, c, `${Math.round(t * info.maxMy)} million years`, G.W - 16, 22, { align: 'right', bold: true, size: 15 });
  text(ctx, c, scenario === 'transform' ? 'Map view (looking down). Not to scale.' : 'Cross-section: vertically exaggerated, not to scale', 16, G.H - 14, { size: 11.5 });
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- divergent
function drawDivergent(ctx: Ctx, c: Colors, t: number, labels: boolean) {
  const { halfWidth: hw, stripeWidth: sw, magma, valley } = divergent(t);
  const RX = G.RIDGE_X;
  skyAndSea(ctx, c);
  seaLine(ctx, c);
  // asthenosphere under everything below the lithosphere
  ctx.fillStyle = c.asthenosphere; ctx.fillRect(0, 186, G.W, G.H - 186);

  for (const s of [-1, 1]) {
    const edge = s < 0 ? 0 : G.W;
    const reach = Math.abs(edge - RX);
    // lithosphere (mantle part) grows thicker with age; old lithosphere beyond the new crust
    const lith: Pt[] = [], top: Pt[] = [];
    for (let d = 0; d <= reach; d += 6) {
      const x = RX + s * d;
      const ageF = d < hw ? Math.sqrt(d / hw) : 1;
      const y = d < hw ? seafloorY(d, hw, valley) : G.FLOOR;
      top.push({ x, y });
      lith.push({ x, y: y + G.OC_CRUST + lerp(2, G.OC_LITH_BASE - G.FLOOR - G.OC_CRUST, ageF) });
    }
    // water-filled gap between the sea floor and the sea surface is already painted; fill rock
    poly(ctx, [...top.map((p) => ({ x: p.x, y: p.y + G.OC_CRUST })), ...lith.reverse()], c.lithosphere);
    // crust with magnetic stripes in the new part
    const nStripes = Math.ceil(hw / sw);
    for (let k = nStripes - 1; k >= 0; k--) {
      const d0 = k * sw, d1 = Math.min((k + 1) * sw, hw);
      const seg: Pt[] = [];
      for (let d = d0; d <= d1 + 0.01; d += 4) seg.push({ x: RX + s * d, y: seafloorY(d, hw, valley) });
      seg.push({ x: RX + s * d1, y: seafloorY(d1, hw, valley) });
      poly(ctx, [...seg, ...seg.map((p) => ({ x: p.x, y: p.y + G.OC_CRUST })).reverse()], k % 2 === 0 ? c['stripe-a'] : c['stripe-b']);
    }
    // old crust beyond the new part
    const oldPts: Pt[] = [{ x: RX + s * hw, y: G.FLOOR }, { x: edge, y: G.FLOOR }, { x: edge, y: G.FLOOR + G.OC_CRUST }, { x: RX + s * hw, y: G.FLOOR + G.OC_CRUST }];
    if (reach > hw) poly(ctx, oldPts, c['oceanic-crust']);
  }

  // magma chamber + feeder dike
  const mh = 26 * magma;
  ctx.fillStyle = c.magma;
  ctx.beginPath(); ctx.ellipse(RX, 214, 34 * magma, mh, 0, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [{ x: RX - 4, y: 214 }, { x: RX - 3, y: 150 + 10 * valley }, { x: RX + 3, y: 150 + 10 * valley }, { x: RX + 4, y: 214 }], c.magma);
  ctx.strokeStyle = c.magma; ctx.lineWidth = 2;
  // convection arrows in the asthenosphere
  const conv = c.text;
  for (const s of [-1, 1]) {
    arrow(ctx, RX + s * 10, 300, RX + s * 4, 236, conv, 2.5, 8);
    arrow(ctx, RX + s * 30, 262, RX + s * 150, 262, conv, 2.5, 8);
    arrow(ctx, RX + s * 170, 262, RX + s * 290, 262, conv, 2.5, 8);
  }
  // plate motion arrows above sea level
  arrow(ctx, RX - 30, 70, RX - 190, 70, c.text, 4, 12);
  arrow(ctx, RX + 30, 70, RX + 190, 70, c.text, 4, 12);
  // shallow earthquakes at the axis
  for (let i = 0; i < 4; i++) quake(ctx, c, RX + (hash(i) - 0.5) * 24, 158 + hash(i + 9) * 26 + 6 * valley, 3.8, i * 1.7, t);

  if (labels) {
    text(ctx, c, 'Plate moves away', RX - 110, 52, { align: 'center', size: 12 });
    text(ctx, c, 'Plate moves away', RX + 110, 52, { align: 'center', size: 12 });
    callout(ctx, c, 'Mid-ocean ridge', RX + 60, 108, RX + 14, seafloorY(14, hw, valley) - 1, 'left');
    callout(ctx, c, 'Magma rises and freezes → new crust', RX + 70, 232, RX + 22, 214, 'left');
    callout(ctx, c, 'Lithosphere (rigid)', 130, 255, 130, 232, 'left');
    callout(ctx, c, 'Asthenosphere (hot, solid, flows slowly)', 120, 380, 120, 355, 'left');
    if (hw > 40) callout(ctx, c, 'Magnetic stripes: bands of crust', 700, 100, RX + Math.min(hw, 200), seafloorY(Math.min(hw, 200), hw, valley) + 8, 'left');
    if (hw > 40) text(ctx, c, 'recording flips of Earth’s magnetic field', 704, 120, { size: 11.5 });
    if (hw > 120) text(ctx, c, 'Older crust, deeper & colder', RX - 330, 150, { align: 'left', size: 12 });
    text(ctx, c, 'Sea level', 16, G.SEA - 12, { size: 11.5 });
  }
}

// ---------------------------------------------------------------- subduction (oo, oc, cc)
function drawSubduction(ctx: Ctx, c: Colors, kind: SubKind, t: number, labels: boolean) {
  const m = subduction(kind, t);
  const continental = kind !== 'ocean-ocean';
  const cc = kind === 'continent-continent';
  const th = G.SLAB_ANGLE, sinT = Math.sin(th), cosT = Math.cos(th), tanT = Math.tan(th);
  const T: Pt = { x: G.TRENCH_X, y: G.FLOOR + m.trenchDepth };
  const dirU = (s: number): Pt => ({ x: T.x + s * cosT, y: T.y + s * sinT });
  const lithBase = continental ? G.CONT_LITH_BASE : G.OC_LITH_BASE;

  // --- background ---
  const shore = continental ? G.TRENCH_X + 70 : G.W;
  skyAndSea(ctx, c, shore);
  if (continental) { ctx.fillStyle = c.sky; ctx.fillRect(shore, 0, G.W - shore, G.SEA); }
  seaLine(ctx, c, 0, continental ? shore : G.W);

  // --- subducting plate path ---
  const u = m.trenchDepth / sinT;
  const C: Pt = { x: T.x - u * cosT, y: G.FLOOR };
  const S: Pt = { x: C.x - 90, y: G.FLOOR };
  const path: Pt[] = [{ x: 0, y: G.FLOOR }, S, ...bezier(S, C, T, 14).slice(1)];
  for (let s = 24; s <= m.slabLength; s += 24) path.push(dirU(s));
  path.push(dirU(m.slabLength));

  // break-off: remove a segment of the slab when it detaches (continent–continent)
  let slabPath = path;
  let detached: Pt[] = [];
  if (cc && m.breakoff > 0.02) {
    const cut = (G.TRENCH_X + 230) ;
    const keepIdx = path.findIndex((p) => p.x > cut);
    if (keepIdx > 0) {
      slabPath = path.slice(0, keepIdx);
      detached = path.slice(keepIdx).map((p) => ({ x: p.x + 14 * m.breakoff, y: p.y + 70 * m.breakoff }));
    }
  }

  // --- overriding plate ---
  const xi = T.x + (lithBase - T.y) / tanT;
  const topAt = (x: number): number => {
    if (continental) {
      const ramp = smooth((x - T.x) / 70);
      let y = lerp(lerp(T.y, G.LAND, m.collision), G.LAND, ramp);
      const arcX = G.TRENCH_X + G.ARC_OFFSET;
      y -= m.arc * Math.max(0, 55 * (1 - Math.abs(x - arcX) / 46)) + m.arc * 20 * Math.exp(-(((x - arcX) / 110) ** 2));
      y -= 100 * m.collision * Math.exp(-(((x - G.TRENCH_X - 20) / 190) ** 2));
      return y;
    }
    return lerp(T.y, G.FLOOR, smooth((x - T.x) / 40));
  };
  const botAt = (x: number): number => {
    if (continental) return G.CONT_MOHO + 85 * m.collision * Math.exp(-(((x - G.TRENCH_X - 20) / 200) ** 2));
    return G.FLOOR + G.OC_CRUST;
  };
  const xs: number[] = [];
  for (let x = T.x; x <= G.W; x += 8) xs.push(x);
  // mantle part of the overriding plate (bounded below by the slab surface)
  poly(ctx, [{ x: T.x, y: T.y }, ...xs.map((x) => ({ x, y: botAt(x) })), { x: G.W, y: lithBase }, { x: xi, y: lithBase }], c.lithosphere);
  // crust (and volcanoes for the oceanic case)
  poly(ctx, [...xs.map((x) => ({ x, y: topAt(x) })), ...xs.map((x) => ({ x, y: botAt(x) })).reverse()], continental ? c['continental-crust'] : c['oceanic-crust']);
  if (continental) {
    ctx.strokeStyle = c.line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.beginPath();
    xs.forEach((x, i) => (i ? ctx.lineTo(x, topAt(x)) : ctx.moveTo(x, topAt(x)))); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const arcX = G.TRENCH_X + G.ARC_OFFSET;
  if (!continental && m.arc > 0.02) {
    const H = 78 * m.arc;
    volcano(ctx, c, arcX - 56, G.FLOOR, H * 0.6, 40, m.arc < 0.99, t);
    volcano(ctx, c, arcX, G.FLOOR, H, 46, m.arc < 0.99, t);
    volcano(ctx, c, arcX + 58, G.FLOOR, H * 0.7, 40, m.arc < 0.99, t);
  }

  // --- sinking slab ---
  const drawSlab = (p: Pt[], alpha = 1) => {
    if (p.length < 2) return;
    ctx.globalAlpha = alpha;
    band(ctx, p, 0, G.OC_LITH, c.lithosphere);
    band(ctx, p, 0, G.OC_CRUST, c['oceanic-crust']);
    ctx.globalAlpha = 1;
  };
  drawSlab(slabPath);
  if (detached.length > 1) drawSlab(detached, 1 - 0.35 * m.breakoff);
  if (detached.length > 1 && m.breakoff > 0.05) {
    ctx.strokeStyle = c.text; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    const a = slabPath[slabPath.length - 1]!; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 30, a.y + 40); ctx.stroke(); ctx.setLineDash([]);
  }

  // continent riding on the subducting plate (collision scenario)
  if (cc) {
    const e = m.edgeX;
    const colTop = (x: number) => G.LAND - 100 * m.collision * Math.exp(-(((x - G.TRENCH_X - 20) / 190) ** 2));
    const colBot = (x: number) => G.CONT_MOHO + 85 * m.collision * Math.exp(-(((x - G.TRENCH_X - 20) / 200) ** 2));
    const pts: Pt[] = [];
    for (let x = 0; x <= e - 26; x += 8) pts.push({ x, y: colTop(x) });
    pts.push({ x: e - 26, y: colTop(e - 26) }, { x: e + 8, y: G.FLOOR });
    const bot: Pt[] = [{ x: e + 8, y: G.FLOOR + G.OC_CRUST }];
    for (let x = e - 8; x >= 0; x -= 8) bot.push({ x, y: colBot(x) });
    poly(ctx, [...pts, ...bot], c['continental-crust']);
    // its lithosphere
    poly(ctx, [{ x: 0, y: G.CONT_MOHO }, { x: e, y: G.CONT_MOHO }, { x: e - 8, y: G.CONT_LITH_BASE }, { x: 0, y: G.CONT_LITH_BASE }], c.lithosphere);
    poly(ctx, [...pts, ...bot], c['continental-crust']);
    ctx.strokeStyle = c.line; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.2; ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.globalAlpha = 1;
    // once the continents touch, join them into one thickened crust (no slit between them)
    if (m.collision > 0.02) {
      const sx: number[] = [];
      for (let x = G.TRENCH_X - 70; x <= G.TRENCH_X + 90; x += 8) sx.push(x);
      poly(ctx, [...sx.map((x) => ({ x, y: Math.min(colTop(x), topAt(x)) })), ...sx.map((x) => ({ x, y: colBot(x) })).reverse()], c['continental-crust']);
    }
    // thrust faults
    if (m.collision > 0.1) {
      ctx.strokeStyle = c.line; ctx.lineWidth = 2;
      for (const [x0, y0, x1, y1] of [[G.TRENCH_X - 110, 215, G.TRENCH_X - 20, 130], [G.TRENCH_X + 20, 240, G.TRENCH_X + 100, 140], [G.TRENCH_X - 50, 250, G.TRENCH_X + 40, 160]] as const) {
        ctx.globalAlpha = clamp01(m.collision * 2);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        arrow(ctx, x0, y0, lerp(x0, x1, 0.45), lerp(y0, y1, 0.45), c.line, 2, 7);
      }
      ctx.globalAlpha = 1;
    }
  }

  // --- accretionary wedge ---
  if (m.wedge * (1 - m.collision) > 0.05) {
    const w = m.wedge * (1 - m.collision);
    poly(ctx, [{ x: T.x + 1, y: T.y }, { x: T.x + 14 + 52 * w, y: T.y - 6 - 30 * w }, { x: T.x + 20 + 62 * w, y: topAt(T.x + 20 + 62 * w) + 2 }], SEDIMENT, c.line, 1);
  }

  // --- magma path & chambers for the arc ---
  if (m.arc > 0.04) {
    const sy = T.y + (arcX - T.x) * tanT; // slab surface under the arc
    const volcTop = continental ? topAt(arcX) : G.FLOOR - 78 * m.arc;
    ctx.strokeStyle = c.magma; ctx.lineWidth = 3 + 3 * m.arc; ctx.globalAlpha = 0.5 + 0.5 * m.arc; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(arcX - 40, sy + 4); ctx.bezierCurveTo(arcX - 30, sy - 40, arcX + 6, sy - 60, arcX, volcTop + 6); ctx.stroke();
    ctx.fillStyle = c.magma;
    ctx.beginPath(); ctx.ellipse(arcX, (continental ? G.CONT_MOHO : G.FLOOR + G.OC_CRUST) + 8, 28 * m.arc + 4, 12 * m.arc + 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // water released from the slab
    ctx.fillStyle = c.water;
    for (let i = 0; i < 4; i++) { const k = (t * 5 + i / 4) % 1; ctx.globalAlpha = 0.9 * (1 - k); ctx.beginPath(); ctx.arc(arcX - 44 + k * 28, sy - 6 - k * 60 + 8, 3.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // --- earthquakes along the slab (Wadati-Benioff zone) and in the collision crust ---
  const detachedCut = cc && m.breakoff > 0.02 ? G.TRENCH_X + 230 : Infinity;
  const foci: Array<{ p: Pt; ph: number }> = [];
  for (let s = 30, i = 0; s <= m.slabLength - 8; s += 22, i++) {
    const p = dirU(s);
    if (p.x > detachedCut) continue;
    const j = (hash(i) - 0.5) * 16;
    foci.push({ p: { x: p.x - sinT * (10 + j), y: p.y + cosT * (10 + j) }, ph: i });
  }
  foci.forEach((f) => quake(ctx, c, f.p.x, f.p.y, 3.8, f.ph, t));
  for (let i = 0; i < 3 * (m.slabLength > 100 ? 1 : 0); i++) quake(ctx, c, T.x + 20 + i * 14, T.y + 6 + i * 6, 3.4, i + 3, t); // shallow megathrust
  if (cc && m.collision > 0.1) {
    const n = Math.round(10 * m.collision);
    for (let i = 0; i < n; i++) quake(ctx, c, G.TRENCH_X - 100 + hash(i + 40) * 220, 150 + hash(i + 80) * 110, 3.4, i, t);
  }

  // --- plate motion + mantle flow arrows ---
  const speed = 1 - 0.8 * m.collision;
  arrow(ctx, 90, 70, 90 + 120 * speed, 70, c.text, 4, 12);
  if (continental && !cc) arrow(ctx, 880, 70, 810, 70, c.text, 3, 10);
  if (!continental) arrow(ctx, 880, 70, 830, 70, c.text, 2.5, 9);
  // chevrons moving along the slab show it being consumed
  ctx.fillStyle = c.text; ctx.globalAlpha = 0.75;
  for (let k = 0; k < 6; k++) {
    const s = ((k * 70 + t * 900) % 420);
    if (s > m.slabLength - 20 || s < 10) continue;
    const p = dirU(s);
    const q: Pt = { x: p.x - sinT * 28, y: p.y + cosT * 28 };
    ctx.beginPath(); ctx.moveTo(q.x + cosT * 7, q.y + sinT * 7); ctx.lineTo(q.x - cosT * 5 + sinT * 5, q.y - sinT * 5 - cosT * 5); ctx.lineTo(q.x - cosT * 5 - sinT * 5, q.y - sinT * 5 + cosT * 5); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- labels ---
  if (labels) {
    if (m.collision < 0.3) callout(ctx, c, 'Trench', T.x - 150, 118, T.x - 4, T.y - 2, 'center');
    if (m.wedge * (1 - m.collision) > 0.3) callout(ctx, c, 'Accretionary wedge (scraped-off sediment)', T.x + 60, 70, T.x + 40, T.y - 14, 'left');
    const slabMid = dirU(Math.min(m.slabLength, 300) * 0.55);
    callout(ctx, c, 'Oceanic lithosphere sinks (subducts)', 60, 330, slabMid.x - 18, slabMid.y + 12, 'left');
    callout(ctx, c, 'Asthenosphere', 60, 470, 100, 445, 'left');
    if (m.slabLength > 140) callout(ctx, c, 'Earthquakes along the slab (shallow → deep)', 120, 410, dirU(m.slabLength * 0.7).x - 20, dirU(m.slabLength * 0.7).y + 6, 'left');
    if (m.arc > 0.3) callout(ctx, c, continental ? 'Volcanic arc on the continent' : 'Volcanic island arc', arcX + 60, 40, arcX, (continental ? topAt(arcX) : G.FLOOR - 78 * m.arc) - 4, 'left');
    if (m.arc > 0.3) callout(ctx, c, 'Magma forms where water is released', G.W - 12, 300, arcX - 20, T.y + (arcX - 20 - T.x) * tanT - 22, 'right');
    if (cc && m.collision > 0.3) callout(ctx, c, 'Folded & thrust mountains, thick crust', T.x + 130, 46, T.x + 20, topAt(T.x + 20) + 4, 'left');
    if (cc && m.collision > 0.3) callout(ctx, c, 'Crustal root', T.x - 210, 292, T.x - 20, botAt(T.x - 20) - 6, 'left');
    if (cc && m.breakoff > 0.5) callout(ctx, c, 'Slab breaks off and sinks', T.x + 250, 440, T.x + 270, 410, 'left');
    if (cc) callout(ctx, c, 'Continental crust (too buoyant to sink)', 20, 46, 60, G.LAND + 8, 'left');
    text(ctx, c, 'Sea level', 16, G.SEA - 12, { size: 11.5 });
  }
}

// ---------------------------------------------------------------- transform (map view)
function drawTransform(ctx: Ctx, c: Colors, t: number, labels: boolean) {
  const { half, stripeWidth, slip } = transform(t);
  const A = 380, B = 580, FY = 290; // ridge A x, ridge B x, fault y
  const top = 36, bottom = G.H - 40;
  ctx.fillStyle = c['water-deep']; ctx.fillRect(0, 0, G.W, G.H);

  // base sea floor for the two plates (old crust)
  const westFill = c['oceanic-crust'], eastFill = c.lithosphere;
  poly(ctx, [{ x: 0, y: top }, { x: A, y: top }, { x: A, y: FY }, { x: B, y: FY }, { x: B, y: bottom }, { x: 0, y: bottom }], westFill);
  poly(ctx, [{ x: A, y: top }, { x: G.W, y: top }, { x: G.W, y: bottom }, { x: B, y: bottom }, { x: B, y: FY }, { x: A, y: FY }], eastFill);
  ctx.globalAlpha = 0.18; ctx.fillStyle = c.text; ctx.fillRect(0, top, G.W, 0); ctx.globalAlpha = 1;

  // new crust with magnetic stripes at each ridge segment (only on its own side of the fault)
  const stripes = (rx: number, y0: number, y1: number) => {
    const n = Math.ceil(half / stripeWidth);
    for (const s of [-1, 1]) for (let k = n - 1; k >= 0; k--) {
      const d0 = k * stripeWidth, d1 = Math.min((k + 1) * stripeWidth, half);
      ctx.fillStyle = k % 2 === 0 ? c['stripe-a'] : c['stripe-b'];
      ctx.fillRect(Math.min(rx + s * d0, rx + s * d1), y0, Math.abs(d1 - d0), y1 - y0);
    }
  };
  stripes(A, top, FY); stripes(B, FY, bottom);

  // ridge axes (spreading centres)
  ctx.strokeStyle = c.magma; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(A, top + 4); ctx.lineTo(A, FY); ctx.moveTo(B, FY); ctx.lineTo(B, bottom - 4); ctx.stroke();

  // fracture zones (inactive extensions of the transform fault)
  ctx.strokeStyle = c.line; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]); ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(0, FY); ctx.lineTo(A, FY); ctx.moveTo(B, FY); ctx.lineTo(G.W, FY); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  // active transform fault
  ctx.strokeStyle = c.quake; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(A, FY); ctx.lineTo(B, FY); ctx.stroke();
  ctx.strokeStyle = '#1d2327'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A, FY); ctx.lineTo(B, FY); ctx.stroke();

  // markers on either side of the fault show the sliding offset
  const mx = (A + B) / 2;
  const north = mx + slip, south = mx - slip;
  ctx.strokeStyle = c.text; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(mx, FY - 50); ctx.lineTo(mx, FY - 4); ctx.moveTo(mx, FY + 4); ctx.lineTo(mx, FY + 50); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#e8d44a'; ctx.strokeStyle = '#1d2327'; ctx.lineWidth = 1.5;
  for (const [x, y] of [[north, FY - 40], [south, FY + 40]] as const) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = '#e8d44a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(north, FY - 40); ctx.lineTo(north, FY - 4); ctx.moveTo(south, FY + 40); ctx.lineTo(south, FY + 4); ctx.stroke();

  // earthquakes on the active segment (and small ones at the ridges)
  for (let i = 0; i < 8; i++) quake(ctx, c, A + 12 + hash(i + 3) * (B - A - 24), FY + (hash(i + 20) - 0.5) * 10, 3.8, i * 1.3, t);
  for (let i = 0; i < 3; i++) { quake(ctx, c, A + (hash(i + 50) - 0.5) * 8, 70 + i * 70 + 20, 3, i, t); quake(ctx, c, B + (hash(i + 60) - 0.5) * 8, FY + 70 + i * 60, 3, i + 2, t); }

  // plate-motion arrows
  const k = 0.35 + 0.65 * (1 - t * 0.5);
  arrow(ctx, A + 40, FY - 24, A + 40 + 90 * k, FY - 24, c.text, 4, 12);
  arrow(ctx, B - 40, FY + 24, B - 40 - 90 * k, FY + 24, c.text, 4, 12);
  arrow(ctx, A - 30, 110, A - 90, 110, c.text, 3, 10); arrow(ctx, A + 30, 110, A + 90, 110, c.text, 3, 10);
  arrow(ctx, B - 30, G.H - 110, B - 90, G.H - 110, c.text, 3, 10); arrow(ctx, B + 30, G.H - 110, B + 90, G.H - 110, c.text, 3, 10);

  if (labels) {
    callout(ctx, c, 'Transform fault: plates slide past each other', 30, FY + 100, mx - 20, FY, 'left');
    callout(ctx, c, 'Spreading ridge (divergent)', A + 50, 70, A, 90, 'left');
    callout(ctx, c, 'Spreading ridge (divergent)', B + 50, bottom - 22, B, bottom - 40, 'left');
    callout(ctx, c, 'Fracture zone: old scar, no sliding now', 30, FY - 40, 100, FY, 'left');
    callout(ctx, c, 'Fracture zone', G.W - 150, FY - 40, G.W - 100, FY, 'left');
    callout(ctx, c, 'Marker offset grows as plates slide', mx + 130, FY - 100, north, FY - 40, 'left');
    text(ctx, c, 'Shallow earthquakes on the active fault', mx + 12, FY + 24, { align: 'left', size: 11.5 });
    text(ctx, c, 'West plate', 90, 150, { size: 12.5, bold: true });
    text(ctx, c, 'East plate', G.W - 160, G.H - 120, { size: 12.5, bold: true });
  }
}

export function drawScene(ctx: Ctx, c: Colors, scenario: Scenario, t: number, labels: boolean) {
  if (scenario === 'divergent') drawDivergent(ctx, c, t, labels);
  else if (scenario === 'transform') drawTransform(ctx, c, t, labels);
  else drawSubduction(ctx, c, scenario, t, labels);
  headline(ctx, c, scenario, t);
}
