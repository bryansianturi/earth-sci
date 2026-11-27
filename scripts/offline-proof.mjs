// Stronger offline proof than network emulation: install the service worker, KILL the web server,
// relaunch the browser with the same profile, and browse the site with nothing listening.
// Usage: node scripts/offline-proof.mjs   (requires a prior `npm run build`)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4399;
const origin = `http://localhost:${PORT}`;
const profile = process.env.OFFLINE_PROFILE_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), 'earth-sci-offline-'));
fs.rmSync(profile, { recursive: true, force: true });

const server = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { stdio: 'ignore', detached: true }); // own process group so we can kill npx AND the node child
const up = async () => { try { await fetch(origin); return true; } catch { return false; } };
for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200));
if (!(await up())) { try { process.kill(-server.pid, 'SIGKILL'); } catch {} throw new Error('preview server did not start'); }

const launch = () => chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true });
let ctx = await launch();
let page = await ctx.newPage();
await page.goto(origin + '/');
await page.evaluate(() => navigator.serviceWorker.ready);
for (let i = 0; i < 100; i++) {
  const n = await page.evaluate(async () => { let n = 0; for (const k of await caches.keys()) n += (await (await caches.open(k)).keys()).length; return n; });
  if (n > 25) break;
  await page.waitForTimeout(200);
}
await ctx.close();

// kill the server for real and prove nothing is listening
process.kill(-server.pid, 'SIGKILL');
await new Promise((r) => setTimeout(r, 800));
if (await up()) throw new Error('server still reachable; proof invalid');
console.log('server is dead (connection refused); relaunching browser with the same profile…');

ctx = await launch();
page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
await page.goto(origin + '/plate-tectonics/plate-boundaries/');
await page.locator('article h1').waitFor();
await page.locator('#embed-plate-boundaries').scrollIntoViewIfNeeded();
await page.locator('#embed-plate-boundaries .sim').waitFor();
await page.goto(origin + '/plate-tectonics/earths-layers/');
await page.locator('#embed-seismic-waves').scrollIntoViewIfNeeded();
await page.locator('#embed-seismic-waves .sim').waitFor();
await page.goto(origin + '/plate-tectonics/earthquakes-and-volcanoes/');
await page.locator('#embed-magnitude-calculator').scrollIntoViewIfNeeded();
await page.locator('#embed-magnitude-calculator .mc-out').waitFor();
await page.locator('#search-box input').fill('plates');
await page.locator('.search-results li a').first().waitFor();
await ctx.close();
fs.rmSync(profile, { recursive: true, force: true });
if (problems.length) { console.error('PROBLEMS:\n' + problems.join('\n')); process.exit(1); }
console.log('OFFLINE PROOF PASSED: pages, both sims, the tool and search all worked with the server killed.');
