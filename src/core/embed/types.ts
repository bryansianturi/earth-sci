/** Metadata every sim/tool ships in its meta.json. */
export interface EmbedMeta {
  id: string;
  kind: 'sim' | 'tool';
  title: string;
  description: string;
  tags: string[];
  /** Plain-language list of simplifications. Required for sims; always visible. */
  simplifications?: string[];
}

export interface MountContext {
  /** Options from the shortcode, e.g. {{sim:plate-boundaries type=transform}} */
  opts: Record<string, string>;
  meta: EmbedMeta;
}

export interface EmbedInstance {
  destroy(): void;
}

/** Every sims/<id>/index.ts and tools/<id>/index.ts must export `mount`. */
export type MountFn = (el: HTMLElement, ctx: MountContext) => EmbedInstance | Promise<EmbedInstance>;
