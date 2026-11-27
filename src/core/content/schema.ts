import { z } from 'astro/zod';

export const levels = ['intro', 'core', 'advanced'] as const;

export const sourceSchema = z.object({
  title: z.string(),
  // Shown as plain text/link for reference. Never fetched by the app.
  url: z.string().optional(),
});

export const articleSchema = z.object({
  title: z.string().min(3),
  topic: z.string(),
  summary: z.string().min(20).max(300),
  level: z.enum(levels),
  tags: z.array(z.string()).default([]),
  /** Related article ids in the form "topic-slug/article-slug". Validated at build time. */
  related: z.array(z.string()).default([]),
  order: z.number().int(),
  sources: z.array(sourceSchema).min(1),
  updated: z.coerce.date(),
});

export const topicSchema = z.object({
  title: z.string(),
  summary: z.string(),
  order: z.number().int(),
  /** CSS hue (0-360) used to tint the topic's cards and badges. */
  hue: z.number().min(0).max(360).default(30),
});

export type ArticleData = z.infer<typeof articleSchema>;
export type TopicData = z.infer<typeof topicSchema>;
