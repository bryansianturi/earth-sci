// Dev utility: screenshots of key pages/sims for visual review.
// Usage: node scripts/screenshots.mjs <outDir> [theme=light|dark]  (needs `npm run preview` running)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'shots';
const theme = process.argv[3] ?? 'light';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
page.on('pageerror', (e) => console.log('page error:', e.message));
const base = 'http://localhost:4321';
const shot = async (name, locator) => { const p = path.join(out, `${theme}-${name}.png`); await (locator ?? page).screenshot({ path: p }); console.log('wrote', p); };

await page.goto(base + '/'); await shot('home');
await page.goto(base + '/plate-tectonics/earths-layers/');
await page.waitForSelector('[data-embed="sim"][data-state="mounted"]', { state: 'attached', timeout: 10000 }).catch(() => {});
await page.locator('.embed-diagram').first().scrollIntoViewIfNeeded(); await shot('article-layers-diagram', page.locator('.embed-diagram').first());
const seis = page.locator('#embed-seismic-waves'); await seis.scrollIntoViewIfNeeded(); await page.waitForSelector('#embed-seismic-waves .sim', { timeout: 10000 });
await page.locator('#embed-seismic-waves input[type=range]').evaluate((el) => { el.value = '700'; el.dispatchEvent(new Event('input')); });
await page.waitForTimeout(500); await shot('sim-seismic-700', seis);
await page.locator('#embed-seismic-waves input[type=range]').evaluate((el) => { el.value = '1200'; el.dispatchEvent(new Event('input')); });
await page.waitForTimeout(500); await shot('sim-seismic-1200', seis);

await page.goto(base + '/plate-tectonics/plate-boundaries/');
const pb = page.locator('#embed-plate-boundaries'); await pb.scrollIntoViewIfNeeded(); await page.waitForSelector('#embed-plate-boundaries .sim', { timeout: 10000 });
const names = ['Divergent', 'Ocean–ocean', 'Ocean–continent', 'Continent–continent', 'Transform'];
for (const n of names) {
  await pb.getByRole('button', { name: n, exact: true }).click();
  for (const v of [350, 1000]) {
    await pb.locator('input[type=range]').evaluate((el, val) => { el.value = String(val); el.dispatchEvent(new Event('input')); }, v);
    await page.waitForTimeout(300);
    await shot(`sim-plates-${n.replace(/[^a-z]/gi, '')}-${v}`, pb.locator('.sim-stage'));
  }
}
await page.goto(base + '/plate-tectonics/earthquakes-and-volcanoes/');
const mc = page.locator('#embed-magnitude-calculator'); await mc.scrollIntoViewIfNeeded(); await page.waitForSelector('#embed-magnitude-calculator .sim', { timeout: 10000 }); await shot('tool-magnitude', mc);
await page.goto(base + '/plate-tectonics/evidence-for-plate-tectonics/'); await page.locator('.embed-diagram').first().scrollIntoViewIfNeeded(); await shot('diagram-stripes', page.locator('.embed-diagram').first());
await page.goto(base + '/plate-tectonics/what-are-plates/'); await page.locator('.embed-diagram').nth(1).scrollIntoViewIfNeeded(); await shot('diagram-forces', page.locator('.embed-diagram').nth(1)); await page.locator('.embed-diagram').first().scrollIntoViewIfNeeded(); await shot('diagram-lith', page.locator('.embed-diagram').first());
await page.goto(base + '/plate-tectonics/plate-boundaries/'); await shot('article-top');
await browser.close();
