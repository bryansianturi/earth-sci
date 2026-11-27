/** Palette read from CSS custom properties so canvases follow the light/dark theme. */
export const COLOR_KEYS = [
  'bg', 'sky', 'water', 'water-deep', 'oceanic-crust', 'continental-crust', 'lithosphere', 'asthenosphere',
  'mantle', 'outer-core', 'inner-core', 'magma', 'text', 'line', 'stripe-a', 'stripe-b', 'p', 's', 'quake', 'panel',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export type Colors = Record<ColorKey, string>;

export function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const out = {} as Colors;
  for (const k of COLOR_KEYS) out[k] = cs.getPropertyValue(`--sim-${k}`).trim() || '#888';
  return out;
}

/** Calls cb when the theme changes (manual toggle or OS preference). Returns unsubscribe. */
export function onThemeChange(cb: () => void): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => { mo.disconnect(); mq.removeEventListener('change', cb); };
}
