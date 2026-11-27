import './tool.css';
import type { MountFn } from '@core/embed/types';
import { makeSegmented } from '@core/sim-kit/SimShell';
import {
  toMw, momentFromMw, energyFromMagnitude, tntTonnes, energyRatio, amplitudeRatio, nearestReferences,
  sci, describeRatio, SCALE_RANGE, type Scale,
} from './physics';
import { REFERENCES, NOTABLE_QUAKES } from './comparisons';

const fmtTonnes = (t: number) =>
  t >= 1e9 ? `${sci(t / 1e9)} gigatonnes` : t >= 1e6 ? `${sci(t / 1e6)} megatonnes` : t >= 1e3 ? `${sci(t / 1e3)} kilotonnes` : `${sci(t)} tonnes`;

export const mount: MountFn = (el, { meta }) => {
  const root = document.createElement('div');
  root.className = 'sim mc';
  root.innerHTML = `
    <h3>${meta.title}</h3>
    <p class="mc-sub">Magnitude scales are logarithmic: each whole step is 10× the ground motion but about 32× the energy.</p>
    <div class="mc-grid">
      <div>
        <div class="mc-row seg-host"></div>
        <div class="mc-row">
          <label class="visually-hidden" for="mc-val-${meta.id}">Magnitude value</label>
          <input id="mc-val-${meta.id}" class="mc-input" type="number" min="0" max="10" step="0.1" value="7.0" inputmode="decimal">
          <span class="mc-scale-label">Mw</span>
        </div>
        <input class="mc-slider" type="range" min="1" max="10" step="0.1" value="7" aria-label="Magnitude slider">
        <div class="mc-warn" role="status" hidden></div>
        <h4>Compare with another earthquake</h4>
        <div class="mc-row">
          <label for="mc-b-${meta.id}">Mw</label>
          <input id="mc-b-${meta.id}" class="mc-input" style="font-size:1.1rem;width:5rem" type="number" min="0" max="10" step="0.1" value="6.0" inputmode="decimal">
        </div>
        <div class="mc-vs" role="status"></div>
      </div>
      <div>
        <dl class="mc-out"></dl>
        <h4>That much energy is about…</h4>
        <ul class="mc-compare"></ul>
        <h4>Real earthquakes (USGS moment magnitudes)</h4>
        <table><thead><tr><th>Earthquake</th><th>Mw</th><th></th></tr></thead><tbody></tbody></table>
      </div>
    </div>
    <p class="mc-note"><strong>Why so many scales?</strong> Older scales (ML "Richter", mb, Ms) measure the size of one kind of wave, and each <em>saturates</em>: past a certain size the waves stop growing even though the earthquake does. Moment magnitude (Mw) is computed from the physical size of the rupture (fault area × slip × rock stiffness) and does not saturate, so agencies now report Mw for large events. "Energy" here is the <em>radiated seismic energy</em>, only a small fraction of the total energy released (most goes into breaking rock and heat). Conversions between scales are statistical fits, so treat them as approximate.</p>`;
  el.appendChild(root);

  const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const input = $<HTMLInputElement>('.mc-input');
  const slider = $<HTMLInputElement>('.mc-slider');
  const bInput = $<HTMLInputElement>(`#mc-b-${meta.id}`);
  const out = $('.mc-out');
  const warn = $<HTMLElement>('.mc-warn');
  const cmp = $('.mc-compare');
  const vs = $('.mc-vs');
  const scaleLabel = $('.mc-scale-label');
  let scale: Scale = 'Mw';

  const seg = makeSegmented<Scale>(
    $('.seg-host'), 'Magnitude scale',
    [{ value: 'Mw', text: 'Mw (moment)' }, { value: 'Ms', text: 'Ms (surface wave)' }, { value: 'mb', text: 'mb (body wave)' }, { value: 'ML', text: 'ML (local/"Richter")' }],
    'Mw', (v) => { scale = v; scaleLabel.textContent = v; update(); },
  );
  void seg;

  function update() {
    const v = parseFloat(input.value);
    if (!isFinite(v)) { out.innerHTML = ''; return; }
    const c = toMw(scale, v);
    const mw = c.mw;
    const E = energyFromMagnitude(mw);
    const tonnes = tntTonnes(E);
    const [lo, hi] = SCALE_RANGE[scale];
    warn.hidden = !c.warning;
    warn.textContent = c.warning ?? '';
    out.innerHTML = `
      <dt>Moment magnitude</dt><dd>Mw ${mw.toFixed(2)} ${c.approximate ? '<small>(approximate)</small>' : ''}</dd>
      <dt>Seismic moment</dt><dd>${sci(momentFromMw(mw))} N·m</dd>
      <dt>Radiated energy</dt><dd>${sci(E)} J</dd>
      <dt>TNT equivalent</dt><dd>${fmtTonnes(tonnes)}</dd>
      <dt>Valid range</dt><dd><small>${scale} ${lo}–${hi}</small></dd>`;
    cmp.innerHTML = nearestReferences(E, REFERENCES, 3)
      .map((r) => `<li>${describeRatio(r.ratio)}${r.label} <small title="${r.note}">ⓘ</small></li>`).join('');

    const b = parseFloat(bInput.value);
    if (isFinite(b)) {
      const er = energyRatio(mw, b);
      const ar = amplitudeRatio(mw, b);
      const fmt = (x: number) => (x >= 1000 ? sci(x, 2) : Number(x.toPrecision(3)).toLocaleString('en-US'));
      vs.innerHTML = mw === b
        ? 'Same magnitude: same energy.'
        : mw > b
          ? `<span class="big">Mw ${mw.toFixed(1)} releases ~${fmt(er)}× the energy of Mw ${b.toFixed(1)}</span><br>and shakes the ground with ${fmt(ar)}× the amplitude.`
          : `<span class="big">Mw ${mw.toFixed(1)} releases only ~1/${fmt(1 / er)} of the energy of Mw ${b.toFixed(1)}</span><br>with 1/${fmt(1 / ar)} of the ground-motion amplitude.`;
    }
  }

  const tbody = $('tbody');
  for (const q of NOTABLE_QUAKES) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${q.name} (${q.year})<br><small>${q.note}</small></td><td>${q.mw.toFixed(1)}</td><td><button type="button">Use</button></td>`;
    tr.querySelector('button')!.addEventListener('click', () => {
      scale = 'Mw'; seg.set('Mw'); scaleLabel.textContent = 'Mw';
      input.value = slider.value = q.mw.toFixed(1);
      update();
    });
    tbody.appendChild(tr);
  }

  input.addEventListener('input', () => { slider.value = input.value; update(); });
  slider.addEventListener('input', () => { input.value = Number(slider.value).toFixed(1); update(); });
  bInput.addEventListener('input', update);
  update();

  return { destroy: () => root.remove() };
};
