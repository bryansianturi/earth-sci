import en from './en.json';

export type UiKey = keyof typeof en;
// Only English exists today. To add a language, add xx.json with the same keys
// and pick the table here based on the page locale.
const table: Record<string, string> = en;

export function t(key: UiKey): string {
  return table[key] ?? key;
}
