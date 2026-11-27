import MiniSearch from 'minisearch';
import { miniSearchOptions, type SearchDoc } from './options';
import { t } from '../i18n/t';

export interface Hit { id: string; title: string; kind: SearchDoc['kind']; url: string; summary: string; terms: string[] }

let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null;

export function loadIndex(): Promise<MiniSearch<SearchDoc>> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}search-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`search index ${r.status}`);
      return r.text();
    })
    .then((json) => MiniSearch.loadJSON<SearchDoc>(json, miniSearchOptions));
  return indexPromise;
}

export async function search(q: string): Promise<Hit[]> {
  const ms = await loadIndex();
  return ms.search(q).slice(0, 12).map((r) => ({
    id: r.id as string,
    title: r['title'] as string,
    kind: r['kind'] as SearchDoc['kind'],
    url: r['url'] as string,
    summary: r['summary'] as string,
    terms: r.terms,
  }));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export function highlight(text: string, terms: string[]): string {
  const safe = esc(text);
  if (!terms.length) return safe;
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}

/** Wires up the header search box (dropdown with keyboard navigation). */
export function setupSearchBox(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('input')!;
  const list = root.querySelector<HTMLUListElement>('.search-results')!;
  let timer: number | undefined;
  let active = -1;

  const items = () => [...list.querySelectorAll<HTMLAnchorElement>('a')];
  const setActive = (i: number) => {
    const els = items();
    if (!els.length) return;
    active = (i + els.length) % els.length;
    els.forEach((el, n) => el.setAttribute('aria-selected', String(n === active)));
    els[active]!.scrollIntoView({ block: 'nearest' });
  };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };

  async function run() {
    const q = input.value.trim();
    if (!q) return close();
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    try {
      const hits = await search(q);
      if (input.value.trim() !== q) return;
      list.innerHTML = hits.length
        ? hits.map((h) => `<li><a href="${esc(h.url)}"><span class="r-title">${highlight(h.title, h.terms)}</span><span class="r-kind">${h.kind}</span><span class="r-snip">${highlight(h.summary, h.terms)}</span></a></li>`).join('')
        : `<li class="search-empty">${esc(t('search.empty'))}</li>`;
      active = -1;
    } catch {
      list.innerHTML = `<li class="search-empty">${esc(t('search.error'))}</li>`;
    }
  }

  input.addEventListener('focus', () => void loadIndex().catch(() => {}), { once: true });
  input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(run, 80); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { const el = items()[active] ?? items()[0]; if (el) { e.preventDefault(); location.href = el.href; } }
    else if (e.key === 'Escape') { close(); input.blur(); }
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target as Node)) close(); });
  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test((e.target as HTMLElement).tagName);
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); input.focus(); input.select(); }
  });
}
