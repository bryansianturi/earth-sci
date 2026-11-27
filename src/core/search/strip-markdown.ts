/** Rough Markdown → plain text for indexing. Good enough for search; not a renderer. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^---[\s\S]*?---/, '')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
