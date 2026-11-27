import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { articleSchema, topicSchema } from './core/content/schema';

// Content lives outside src/ so authors never touch code. English only for now;
// to add a language, add content/<lang>/ and a locale loader (see CONTRIBUTING.md).
const base = './content/en/topics';

export const collections = {
  topics: defineCollection({ loader: glob({ pattern: '*/_topic.md', base }), schema: topicSchema }),
  articles: defineCollection({ loader: glob({ pattern: '*/[!_]*.md', base }), schema: articleSchema }),
};
