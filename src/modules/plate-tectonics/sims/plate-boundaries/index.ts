import type { MountFn } from '@core/embed/types';
import { SimShell, makeSegmented } from '@core/sim-kit/SimShell';
import { SCENARIOS, G, isScenario, describe, type Scenario } from './model';
import { drawScene } from './render';

const SECONDS_FULL = 24; // real seconds for t: 0 -> 1 at 1x

export const mount: MountFn = (el, { meta, opts }) => {
  let scenario: Scenario = isScenario(opts['type'] ?? '') ? (opts['type'] as Scenario) : 'ocean-continent';
  let t = 0;
  let slider!: HTMLInputElement;
  let timeLabel!: HTMLElement;
  let seg!: ReturnType<typeof makeSegmented<Scenario>>;

  const info = () => SCENARIOS.find((s) => s.id === scenario)!;
  const syncUi = () => { slider.value = String(Math.round(t * 1000)); timeLabel.textContent = `${Math.round(t * info().maxMy)} My`; };

  const shell = new SimShell(el, {
    title: meta.title,
    simplifications: meta.simplifications ?? [],
    width: G.W, height: G.H,
    autoplay: false,
    buildControls(host, sh) {
      seg = makeSegmented<Scenario>(host, 'Boundary type',
        SCENARIOS.map((s) => ({ value: s.id, text: s.short })), scenario,
        (v) => { scenario = v; t = 0; syncUi(); sh.requestDraw(); });
      const l = document.createElement('label');
      l.style.flex = '1 1 16rem';
      l.innerHTML = `Time <input type="range" min="0" max="1000" step="1" value="0" aria-label="Time in millions of years" style="flex:1;min-width:8rem"> <strong class="tl" style="min-width:3.5rem">0 My</strong>`;
      slider = l.querySelector('input')!;
      timeLabel = l.querySelector('.tl')!;
      slider.addEventListener('input', () => { t = Number(slider.value) / 1000; syncUi(); sh.requestDraw(); });
      host.appendChild(l);
    },
    update(dt) {
      t = Math.min(1, t + dt / SECONDS_FULL);
      syncUi();
      if (t >= 1) shell.pause();
    },
    draw: (ctx, colors, labels) => drawScene(ctx, colors, scenario, t, labels),
    reset() { t = 0; syncUi(); },
    describe: () => describe(scenario, t),
  });
  void seg;
  syncUi();
  return { destroy: () => shell.destroy() };
};
