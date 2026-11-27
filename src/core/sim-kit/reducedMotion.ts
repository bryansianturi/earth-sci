const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const prefersReducedMotion = () => !!mq?.matches;

/** Subscribe to changes; returns an unsubscribe function. */
export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  if (!mq) return () => {};
  const h = () => cb(mq.matches);
  mq.addEventListener('change', h);
  return () => mq.removeEventListener('change', h);
}
