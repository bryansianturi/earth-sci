import type { Options } from 'minisearch';

export interface SearchDoc {
  id: string;
  title: string;
  kind: 'article' | 'sim' | 'tool';
  url: string;
  topic: string;
  tags: string;
  summary: string;
  body: string;
}

// Shared by the build-time indexer and the browser, so they can never drift apart.
export const miniSearchOptions: Options<SearchDoc> = {
  fields: ['title', 'tags', 'summary', 'body'],
  storeFields: ['title', 'kind', 'url', 'summary'],
  searchOptions: { boost: { title: 3, tags: 2, summary: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
};
