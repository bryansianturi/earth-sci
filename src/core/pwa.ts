import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker, except under Tauri or file:// where it is pointless. */
export function setupPwa(toast: HTMLElement | null) {
  const p = location.protocol;
  if (p === 'file:' || p === 'tauri:' || import.meta.env.PUBLIC_TARGET === 'tauri') return;
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!toast) return;
      toast.hidden = false;
      toast.querySelector('button.reload')?.addEventListener('click', () => void updateSW());
      toast.querySelector('button.dismiss')?.addEventListener('click', () => (toast.hidden = true));
    },
  });
}
