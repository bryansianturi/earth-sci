import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const ARTICLES = ['earths-layers', 'what-are-plates', 'plate-boundaries', 'evidence-for-plate-tectonics', 'earthquakes-and-volcanoes'];
const ORIGIN = 'http://localhost:4321';

/** Tracks anything that could leak to the network or break the page. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) problems.push(`EXTERNAL request: ${r.url()}`); });
  page.on('requestfailed', (r) => problems.push(`failed request: ${r.url()} (${r.failure()?.errorText})`));
  return problems;
}

async function installAndGoOffline(context: BrowserContext, page: Page) {
  await page.goto('/');
  // wait for the service worker to take control and finish precaching
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(async () => page.evaluate(async () => {
    const names = await caches.keys();
    let n = 0;
    for (const name of names) n += (await (await caches.open(name)).keys()).length;
    return n;
  }), { timeout: 30_000 }).toBeGreaterThan(25);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
}

const canvasHasPixels = (page: Page, root: string) => page.evaluate((sel) => {
  const c = document.querySelector<HTMLCanvasElement>(`${sel} canvas`)!;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]! > 0) n++;
  return n / (d.length / 4);
}, root);

test.describe('offline', () => {
  test('every page, simulation, tool and search works with the network off', async ({ browser }) => {
    const context = await browser.newContext();
    // belt and braces: abort anything that is not our own origin, and record it as a failure below
    await context.route((url) => url.origin !== ORIGIN, (route) => route.abort());
    const page = await context.newPage();
    const problems = watch(page);
    await installAndGoOffline(context, page);

    // home + topic page
    await page.reload();
    await expect(page.locator('h1')).toContainText('How the Earth works');
    await page.goto('/plate-tectonics/');
    await expect(page.locator('h1')).toHaveText('Plate Tectonics');
    await expect(page.locator('.card')).toHaveCount(5);

    // every article loads
    for (const slug of ARTICLES) {
      await page.goto(`/plate-tectonics/${slug}/`);
      await expect(page.locator('article h1')).toBeVisible();
      for (const svg of await page.locator('.embed-diagram svg').all()) await expect(svg).toBeVisible();
    }

    // seismic waves sim: controls work and the canvas is drawn
    await page.goto('/plate-tectonics/earths-layers/');
    await page.locator('#embed-seismic-waves').scrollIntoViewIfNeeded();
    await expect(page.locator('#embed-seismic-waves .sim')).toBeVisible();
    expect(await canvasHasPixels(page, '#embed-seismic-waves')).toBeGreaterThan(0.2);
    const play = page.locator('#embed-seismic-waves .play');
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#embed-seismic-waves .speed').selectOption('4');
    await page.locator('#embed-seismic-waves .labels').uncheck();
    const slider = page.locator('#embed-seismic-waves input[type=range]');
    await slider.evaluate((el: HTMLInputElement) => { el.value = '900'; el.dispatchEvent(new Event('input')); });
    await expect(page.locator('#embed-seismic-waves .sim-status')).toContainText('S-waves have reached the core', { timeout: 5000 });
    await page.locator('#embed-seismic-waves .reset').click();
    await expect(slider).toHaveValue('0');

    // plate boundaries sim: all five scenarios draw, the slider moves features
    await page.goto('/plate-tectonics/plate-boundaries/');
    await page.locator('#embed-plate-boundaries').scrollIntoViewIfNeeded();
    await expect(page.locator('#embed-plate-boundaries .sim')).toBeVisible();
    for (const name of ['Divergent', 'Ocean–ocean', 'Ocean–continent', 'Continent–continent', 'Transform']) {
      await page.locator('#embed-plate-boundaries').getByRole('button', { name, exact: true }).click();
      await page.locator('#embed-plate-boundaries input[type=range]').evaluate((el: HTMLInputElement) => { el.value = '800'; el.dispatchEvent(new Event('input')); });
      expect(await canvasHasPixels(page, '#embed-plate-boundaries')).toBeGreaterThan(0.9);
      await expect(page.locator('#embed-plate-boundaries .sim-status')).toContainText('million years', { timeout: 5000 });
    }
    await page.locator('#embed-plate-boundaries .play').click();
    await page.locator('#embed-plate-boundaries .reset').click();

    // magnitude calculator: Mw 7 vs Mw 6 => ~31.6x energy
    await page.goto('/plate-tectonics/earthquakes-and-volcanoes/');
    await page.locator('#embed-magnitude-calculator').scrollIntoViewIfNeeded();
    await expect(page.locator('#embed-magnitude-calculator .mc-vs')).toContainText('31.6×');
    await page.locator('#embed-magnitude-calculator .mc-input').first().fill('8');
    await expect(page.locator('#embed-magnitude-calculator .mc-out')).toContainText('Mw 8.00');
    await page.getByRole('button', { name: 'mb (body wave)' }).click();
    await page.locator('#embed-magnitude-calculator .mc-input').first().fill('7');
    await expect(page.locator('#embed-magnitude-calculator .mc-warn')).toContainText('saturates');

    // search works offline (index is in the cache)
    await page.goto('/');
    await page.locator('#search-box input').fill('shadow zone');
    await expect(page.locator('.search-results li a').first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText('Seismic waves');
    await page.locator('#search-box input').fill('subduction');
    await expect(page.locator('.search-results')).toContainText('Three Plate Boundaries');
    await page.locator('#search-box input').press('Enter');
    await expect(page).toHaveURL(/plate-tectonics\//);

    expect(problems, problems.join('\n')).toEqual([]);
    await context.close();
  });

  test('simulations respect prefers-reduced-motion (start paused) and still work via controls', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const problems = watch(page);
    await page.goto('/plate-tectonics/earths-layers/');
    await page.locator('#embed-seismic-waves').scrollIntoViewIfNeeded();
    const play = page.locator('#embed-seismic-waves .play');
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#embed-seismic-waves .sim-motion-note')).toBeVisible();
    await expect(page.locator('#embed-seismic-waves .sim-status')).not.toHaveText(''); // description is debounced
    const before = await page.locator('#embed-seismic-waves .sim-status').textContent();
    await page.waitForTimeout(1500);
    await expect(page.locator('#embed-seismic-waves input[type=range]')).toHaveValue('0'); // nothing advanced on its own
    expect(await page.locator('#embed-seismic-waves .sim-status').textContent()).toBe(before);
    await play.click(); // user opts in
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => Number(await page.locator('#embed-seismic-waves input[type=range]').inputValue()), { timeout: 5000 }).toBeGreaterThan(0);
    await page.locator('#embed-seismic-waves .play').click();
    expect(problems, problems.join('\n')).toEqual([]);
    await context.close();
  });

  test('without reduced motion the earthquake sim autoplays', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto('/plate-tectonics/earths-layers/');
    await page.locator('#embed-seismic-waves').scrollIntoViewIfNeeded();
    await expect(page.locator('#embed-seismic-waves .play')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => Number(await page.locator('#embed-seismic-waves input[type=range]').inputValue()), { timeout: 5000 }).toBeGreaterThan(0);
    await context.close();
  });

  test('dark mode: follows the OS, toggles, persists, and sims repaint with dark colours', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const problems = watch(page);
    await page.goto('/plate-tectonics/plate-boundaries/');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await bg()).toBe('rgb(18, 23, 27)');
    await page.locator('#theme-toggle').click(); // -> light
    expect(await bg()).toBe('rgb(246, 243, 236)');
    await page.reload();
    expect(await bg()).toBe('rgb(246, 243, 236)'); // persisted
    await page.locator('#theme-toggle').click(); // -> dark
    await page.locator('#embed-plate-boundaries').scrollIntoViewIfNeeded();
    await expect(page.locator('#embed-plate-boundaries .sim')).toBeVisible();
    expect(problems, problems.join('\n')).toEqual([]);
    await context.close();
  });

  test('works at tablet width without horizontal scroll', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    const page = await context.newPage();
    for (const slug of ARTICLES) {
      await page.goto(`/plate-tectonics/${slug}/`);
      const embed = page.locator('.embed-sim, .embed-tool');
      if (await embed.count()) { await embed.first().scrollIntoViewIfNeeded(); await expect(embed.first().locator('.sim')).toBeVisible(); }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, slug).toBeLessThanOrEqual(1);
    }
    await context.close();
  });
});
