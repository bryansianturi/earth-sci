import type { EmbedMeta, MountFn, EmbedInstance } from './types';

const loaders = import.meta.glob<{ mount: MountFn }>('/src/modules/*/{sims,tools}/*/index.ts');
const metas = import.meta.glob<EmbedMeta>('/src/modules/*/{sims,tools}/*/meta.json', { eager: true, import: 'default' });

const loaderById = new Map<string, () => Promise<{ mount: MountFn }>>();
for (const [p, load] of Object.entries(loaders)) {
  const id = /\/(?:sims|tools)\/([^/]+)\/index\.ts$/.exec(p)?.[1];
  if (id) loaderById.set(id, load);
}
const metaById = new Map<string, EmbedMeta>();
for (const m of Object.values(metas)) metaById.set(m.id, m);

const live: EmbedInstance[] = [];

async function mountOne(el: HTMLElement) {
  const id = el.dataset.id!;
  const load = loaderById.get(id);
  const meta = metaById.get(id);
  if (!load || !meta) return;
  try {
    const mod = await load();
    el.replaceChildren(); // drop the no-JS fallback
    el.dataset.state = 'mounted';
    live.push(await mod.mount(el, { opts: JSON.parse(el.dataset.opts ?? '{}'), meta }));
  } catch (err) {
    console.error(`[embed] failed to mount ${id}`, err);
    el.dataset.state = 'error';
  }
}

export function hydrateEmbeds() {
  const els = document.querySelectorAll<HTMLElement>('[data-embed]');
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          void mountOne(e.target as HTMLElement);
        }
      }
    },
    { rootMargin: '300px' },
  );
  els.forEach((el) => io.observe(el));
}
