import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'articles'>;
export type Topic = CollectionEntry<'topics'>;

/** Topic folder name for an entry id such as "plate-tectonics/earths-layers". */
export const topicOf = (id: string) => id.split('/')[0]!;
export const slugOf = (id: string) => id.split('/')[1]!;

export async function getTopics(): Promise<Topic[]> {
  const topics = await getCollection('topics');
  return topics.map((t) => ({ ...t, id: topicOf(t.id) })).sort((a, b) => a.data.order - b.data.order);
}

export async function getArticles(topic?: string): Promise<Article[]> {
  const all = await getCollection('articles');
  const ids = new Set(all.map((a) => a.id));
  const topicIds = new Set((await getTopics()).map((t) => t.id));
  for (const a of all) {
    if (a.data.topic !== topicOf(a.id)) {
      throw new Error(`[content] ${a.id}: frontmatter topic "${a.data.topic}" does not match its folder "${topicOf(a.id)}"`);
    }
    if (!topicIds.has(topicOf(a.id))) throw new Error(`[content] ${a.id}: folder has no _topic.md`);
    for (const r of a.data.related) {
      if (!ids.has(r)) throw new Error(`[content] ${a.id}: related article "${r}" does not exist`);
      if (r === a.id) throw new Error(`[content] ${a.id}: lists itself as related`);
    }
  }
  return all
    .filter((a) => !topic || topicOf(a.id) === topic)
    .sort((a, b) => a.data.order - b.data.order);
}
