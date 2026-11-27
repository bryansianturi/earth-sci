import type { APIRoute } from 'astro';
import MiniSearch from 'minisearch';
import { getArticles, getTopics, topicOf, slugOf } from '../core/content/api';
import { miniSearchOptions, type SearchDoc } from '../core/search/options';
import { stripMarkdown } from '../core/search/strip-markdown';
import type { EmbedMeta } from '../core/embed/types';

export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL;
  const topics = await getTopics();
  const topicTitle = (id: string) => topics.find((t) => t.id === id)?.data.title ?? id;
  const articles = await getArticles();

  const docs: SearchDoc[] = articles.map((a) => ({
    id: `article:${a.id}`,
    title: a.data.title,
    kind: 'article',
    url: `${base}${topicOf(a.id)}/${slugOf(a.id)}/`,
    topic: topicTitle(topicOf(a.id)),
    tags: a.data.tags.join(' '),
    summary: a.data.summary,
    body: stripMarkdown(a.body ?? ''),
  }));

  // sims and tools are searchable too; link to the first article that embeds them
  const metas = Object.values(import.meta.glob<EmbedMeta>('/src/modules/*/{sims,tools}/*/meta.json', { eager: true, import: 'default' }));
  for (const m of metas) {
    const host = articles.find((a) => new RegExp(`\\{\\{\\s*${m.kind}:${m.id}[\\s}]`).test(a.body ?? ''));
    if (!host) continue;
    docs.push({
      id: `${m.kind}:${m.id}`, title: m.title, kind: m.kind,
      url: `${base}${topicOf(host.id)}/${slugOf(host.id)}/#embed-${m.id}`,
      topic: topicTitle(topicOf(host.id)), tags: m.tags.join(' '), summary: m.description, body: (m.simplifications ?? []).join(' '),
    });
  }

  const ms = new MiniSearch<SearchDoc>(miniSearchOptions);
  ms.addAll(docs);
  return new Response(JSON.stringify(ms), { headers: { 'Content-Type': 'application/json' } });
};
