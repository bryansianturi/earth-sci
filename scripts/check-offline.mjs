// Fails the build if the output could make a network request to an external host.
// Text mentions of URLs (e.g. in Sources lists, inside <code>) are fine: only loading contexts are checked.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const problems = [];

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const EXTERNAL = String.raw`(?:https?:)?//(?!localhost|127\.0\.0\.1)[a-z0-9.-]+\.[a-z]{2,}`;
const checks = {
  html: [
    [new RegExp(String.raw`\b(?:src|srcset|poster|action|data)\s*=\s*["']\s*${EXTERNAL}`, 'gi'), 'external src/action attribute'],
    [new RegExp(String.raw`<link\b[^>]*\bhref\s*=\s*["']\s*${EXTERNAL}`, 'gi'), 'external <link href>'],
    [new RegExp(String.raw`url\(\s*["']?${EXTERNAL}`, 'gi'), 'external url() in style'],
  ],
  css: [
    [new RegExp(String.raw`url\(\s*["']?${EXTERNAL}`, 'gi'), 'external url()'],
    [new RegExp(String.raw`@import\s+(?:url\()?\s*["']?${EXTERNAL}`, 'gi'), 'external @import'],
  ],
  js: [
    [new RegExp(String.raw`\b(?:fetch|importScripts|import|open|sendBeacon|EventSource|WebSocket)\(\s*["'\x60]${EXTERNAL}`, 'gi'), 'external network call'],
    [new RegExp(String.raw`\.src\s*=\s*["'\x60]${EXTERNAL}`, 'gi'), 'external .src assignment'],
  ],
};

let count = 0;
for (const file of walk(DIST)) {
  const ext = path.extname(file).slice(1);
  const kind = ext === 'html' ? 'html' : ext === 'css' ? 'css' : ext === 'js' ? 'js' : null;
  if (!kind) continue;
  let text = fs.readFileSync(file, 'utf8');
  if (kind === 'html') text = text.replace(/<code>[\s\S]*?<\/code>/gi, '').replace(/<pre[\s\S]*?<\/pre>/gi, '');
  count++;
  for (const [re, label] of checks[kind]) {
    for (const m of text.matchAll(re)) problems.push(`${path.relative(DIST, file)}: ${label}: ${m[0].slice(0, 100)}`);
  }
}

// internal links must resolve to real files in dist/
for (const file of walk(DIST)) {
  if (path.extname(file) !== '.html') continue;
  const html = fs.readFileSync(file, 'utf8').replace(/<code>[\s\S]*?<\/code>/gi, '');
  const dir = '/' + path.relative(DIST, path.dirname(file)).split(path.sep).join('/');
  for (const m of html.matchAll(/\b(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
    const ref = m[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue;
    const abs = ref.startsWith('/') ? ref : path.posix.normalize(path.posix.join(dir, ref));
    const target = path.join(DIST, abs);
    const ok = fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html')));
    if (!ok) problems.push(`${path.relative(DIST, file)}: broken internal link ${ref}`);
  }
}

if (!fs.existsSync(path.join(DIST, 'sw.js'))) problems.push('sw.js missing from dist (service worker not generated)');
if (!fs.existsSync(path.join(DIST, 'search-index.json'))) problems.push('search-index.json missing from dist');

if (problems.length) {
  console.error(`\n[check-offline] FAILED, ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`[check-offline] OK: scanned ${count} files, no external loads, no broken internal links, service worker + search index present.`);
