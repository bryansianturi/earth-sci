import './sim-kit.css';
import { t } from '../i18n/t';
import { readColors, onThemeChange, type Colors } from './colors';
import { prefersReducedMotion, onReducedMotionChange } from './reducedMotion';

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export interface SimShellOptions {
  title: string;
  /** Plain-language simplifications; always displayed under the simulation. */
  simplifications: string[];
  /** Logical canvas size; the sim draws in these units regardless of screen size. */
  width: number;
  height: number;
  /** Start playing automatically (ignored when the user prefers reduced motion). */
  autoplay: boolean;
  labelsDefault?: boolean;
  /** Add sim-specific controls above the canvas. */
  buildControls?: (host: HTMLElement, shell: SimShell) => void;
  /** Advance the model by dt seconds of *sim-clock* time (already multiplied by speed). */
  update: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D, colors: Colors, showLabels: boolean) => void;
  reset: () => void;
  /** Text description of the current state for screen readers (aria-live, throttled). */
  describe: () => string;
  /** Hide play/pause + speed (for sims driven only by a slider). Default true. */
  hasPlayback?: boolean;
}

export class SimShell {
  readonly root: HTMLElement;
  readonly stage: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly extra: HTMLElement;
  private colors: Colors;
  private playing = false;
  private speed = 1;
  private labels: boolean;
  private raf = 0;
  private last = 0;
  private visible = true;
  private drawQueued = false;
  private statusEl!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private motionNote!: HTMLElement;
  private lastStatus = '';
  private statusTimer = 0;
  private cleanups: Array<() => void> = [];
  private readonly dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(host: HTMLElement, private o: SimShellOptions) {
    this.labels = o.labelsDefault ?? true;
    const hasPlayback = o.hasPlayback ?? true;
    this.root = document.createElement('div');
    this.root.className = 'sim';
    this.root.innerHTML = `
      <div class="sim-head"><h3></h3></div>
      <div class="sim-extra"></div>
      <div class="sim-stage" tabindex="0" role="group" aria-label="Simulation. Space plays or pauses, R resets, L toggles labels."><canvas role="img"></canvas></div>
      <div class="sim-motion-note" hidden>Animation is paused because your system asks for reduced motion. Press Play to run it, or use the sliders.</div>
      <div class="sim-bar">
        ${hasPlayback ? `<button type="button" class="sb primary play"></button>` : ''}
        <button type="button" class="sb reset">↺ ${t('sim.reset')}</button>
        ${hasPlayback ? `<label>${t('sim.speed')} <select class="speed">${SPEEDS.map((s) => `<option value="${s}"${s === 1 ? ' selected' : ''}>${s}×</option>`).join('')}</select></label>` : ''}
        <label><input type="checkbox" class="labels" ${this.labels ? 'checked' : ''}> ${t('sim.labels')}</label>
        <span class="grow"></span>
        <button type="button" class="sb fs" aria-label="${t('sim.fullscreen')}">⛶ ${t('sim.fullscreen')}</button>
      </div>
      <div class="sim-status" role="status" aria-live="polite"></div>
      <div class="sim-note"><strong>${t('sim.simplifications')}</strong><ul>${o.simplifications.map((s) => `<li>${s}</li>`).join('')}</ul></div>`;
    host.appendChild(this.root);

    this.root.querySelector('h3')!.textContent = o.title;
    this.stage = this.root.querySelector('.sim-stage')!;
    this.canvas = this.root.querySelector('canvas')!;
    this.extra = this.root.querySelector('.sim-extra')!;
    this.statusEl = this.root.querySelector('.sim-status')!;
    this.motionNote = this.root.querySelector('.sim-motion-note')!;
    this.playBtn = this.root.querySelector('.play') as HTMLButtonElement;
    this.canvas.width = Math.round(o.width * this.dpr);
    this.canvas.height = Math.round(o.height * this.dpr);
    this.canvas.style.aspectRatio = `${o.width} / ${o.height}`;
    this.canvas.setAttribute('aria-label', `${o.title}: interactive canvas. ${t('sim.simplifications')} are listed below.`);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.colors = readColors(this.root);

    o.buildControls?.(this.extra, this);
    if (!this.extra.childElementCount) this.extra.remove();

    // wiring
    this.playBtn?.addEventListener('click', () => this.toggle());
    this.root.querySelector('.reset')!.addEventListener('click', () => this.reset());
    this.root.querySelector<HTMLSelectElement>('.speed')?.addEventListener('change', (e) => (this.speed = Number((e.target as HTMLSelectElement).value)));
    this.root.querySelector<HTMLInputElement>('.labels')!.addEventListener('change', (e) => { this.labels = (e.target as HTMLInputElement).checked; this.requestDraw(); });
    this.root.querySelector('.fs')!.addEventListener('click', () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void this.root.requestFullscreen?.();
    });
    this.stage.addEventListener('keydown', (e) => {
      if (e.key === ' ' && hasPlayback) { e.preventDefault(); this.toggle(); }
      else if (e.key.toLowerCase() === 'r') this.reset();
      else if (e.key.toLowerCase() === 'l') { const cb = this.root.querySelector<HTMLInputElement>('.labels')!; cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    });

    this.cleanups.push(onThemeChange(() => { this.colors = readColors(this.root); this.requestDraw(); }));
    this.cleanups.push(onReducedMotionChange((r) => { if (r) this.pause(); this.motionNote.hidden = !r; }));
    const io = new IntersectionObserver((es) => { this.visible = es[0]!.isIntersecting; if (this.visible && this.playing) this.startLoop(); });
    io.observe(this.root);
    this.cleanups.push(() => io.disconnect());
    const vis = () => { if (!document.hidden && this.playing) this.startLoop(); };
    document.addEventListener('visibilitychange', vis);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', vis));

    // initial state: respect reduced motion
    const reduced = prefersReducedMotion();
    this.motionNote.hidden = !reduced;
    this.setPlaying(o.autoplay && !reduced && hasPlayback);
    this.requestDraw();
  }

  get isPlaying() { return this.playing; }
  get showLabels() { return this.labels; }
  get palette() { return this.colors; }

  play() { this.setPlaying(true); }
  pause() { this.setPlaying(false); }
  toggle() { this.setPlaying(!this.playing); }

  private setPlaying(p: boolean) {
    this.playing = p;
    if (this.playBtn) {
      this.playBtn.textContent = p ? `❚❚ ${t('sim.pause')}` : `▶ ${t('sim.play')}`;
      this.playBtn.setAttribute('aria-pressed', String(p));
    }
    if (p) this.startLoop();
    else { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.requestDraw();
  }

  reset() { this.o.reset(); this.requestDraw(); }

  private startLoop() {
    if (this.raf || !this.playing) return;
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = 0;
      if (!this.playing) return;
      if (!this.visible || document.hidden) return; // resumes via observers
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.o.update(dt * this.speed);
      this.paint();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Call whenever model state changed outside the loop (slider, drag, ...). */
  requestDraw() {
    if (this.drawQueued || this.raf) { this.scheduleStatus(); return; }
    this.drawQueued = true;
    requestAnimationFrame(() => { this.drawQueued = false; this.paint(); });
  }

  private paint() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.o.width, this.o.height);
    this.o.draw(this.ctx, this.colors, this.labels);
    this.scheduleStatus();
  }

  private scheduleStatus() {
    if (this.statusTimer) return;
    this.statusTimer = window.setTimeout(() => {
      this.statusTimer = 0;
      const s = this.o.describe();
      if (s !== this.lastStatus) { this.lastStatus = s; this.statusEl.textContent = s; }
    }, 600);
  }

  /** Convert a pointer event to logical canvas coordinates. */
  pointer(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.o.width, y: ((e.clientY - r.top) / r.height) * this.o.height };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.statusTimer);
    this.cleanups.forEach((c) => c());
    this.root.remove();
  }
}

/** Helper for sim-specific controls. */
export function makeSegmented<T extends string>(
  host: HTMLElement, label: string, options: Array<{ value: T; text: string }>, initial: T, onChange: (v: T) => void,
) {
  const wrap = document.createElement('div');
  wrap.className = 'seg';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', label);
  const buttons = options.map((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = o.text; b.dataset.value = o.value;
    b.setAttribute('aria-pressed', String(o.value === initial));
    b.addEventListener('click', () => { set(o.value); onChange(o.value); });
    wrap.appendChild(b);
    return b;
  });
  const set = (v: T) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['value'] === v)));
  host.appendChild(wrap);
  return { set };
}
