import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: { alias: { '@core': r('./src/core'), '@modules': r('./src/modules') } },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
