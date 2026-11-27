// Remark plugin: turns {{sim:id}}, {{tool:id}}, {{diagram:id}} paragraphs into embed placeholders.
// Unknown ids throw, which fails the build. Plain .mjs so astro.config can import it directly.
import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';

const MODULES = path.resolve('src/modules');

export function scanEmbeds() {
  const found = new Map(); // "sim:plate-boundaries" -> { kind, id, dir, meta }
  if (!fs.existsSync(MODULES)) return found;
  for (const mod of fs.readdirSync(MODULES)) {
    for (const [folder, kind] of [['sims', 'sim'], ['tools', 'tool']]) {
      const dir = path.join(MODULES, mod, folder);
      if (!fs.existsSync(dir)) continue;
      for (const id of fs.readdirSync(dir)) {
        const metaPath = path.join(dir, id, 'meta.json');
        if (!fs.existsSync(metaPath)) continue;
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.id !== id) throw new Error(`[embed] ${metaPath}: "id" must equal folder name "${id}"`);
        found.set(`${kind}:${id}`, { kind, id, module: mod, meta });
      }
    }
    const ddir = path.join(MODULES, mod, 'diagrams');
    if (fs.existsSync(ddir)) {
      for (const f of fs.readdirSync(ddir).filter((n) => n.endsWith('.svg'))) {
        const id = f.replace(/\.svg$/, '');
        found.set(`diagram:${id}`, { kind: 'diagram', id, module: mod, file: path.join(ddir, f) });
      }
    }
  }
  return found;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const SHORTCODE = /^\{\{\s*(sim|tool|diagram):([a-z0-9-]+)((?:\s+[a-z][a-z0-9-]*=[^\s}]+)*)\s*\}\}$/;

function parseOpts(raw) {
  const opts = {};
  for (const m of raw.matchAll(/([a-z][a-z0-9-]*)=([^\s}]+)/g)) opts[m[1]] = m[2];
  return opts;
}

export function remarkEmbeds() {
  const registry = scanEmbeds();
  return (tree, file) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index == null) return;
      if (node.children.length !== 1 || node.children[0].type !== 'text') {
        const text = node.children.map((c) => c.value ?? '').join('');
        if (/\{\{\s*(sim|tool|diagram):/.test(text)) {
          throw new Error(`[embed] ${file.path}: shortcode must be alone on its own line: ${text.trim()}`);
        }
        return;
      }
      const m = SHORTCODE.exec(node.children[0].value.trim());
      if (!m) {
        if (/^\{\{/.test(node.children[0].value)) throw new Error(`[embed] ${file.path}: malformed shortcode: ${node.children[0].value}`);
        return;
      }
      const [, kind, id, rawOpts] = m;
      const entry = registry.get(`${kind}:${id}`);
      if (!entry) {
        const known = [...registry.keys()].join(', ') || '(none)';
        throw new Error(`[embed] ${file.path}: unknown ${kind} "${id}". Known: ${known}`);
      }
      const opts = parseOpts(rawOpts);
      let html;
      if (kind === 'diagram') {
        const svg = fs.readFileSync(entry.file, 'utf8').replace(/<\?xml[^>]*\?>/, '').trim();
        const caption = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(svg)?.[1]?.trim() ?? '';
        html = `<figure class="embed embed-diagram" data-diagram="${esc(id)}">${svg}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
      } else {
        const { title, description } = entry.meta;
        html =
          `<figure id="embed-${esc(id)}" class="embed embed-${kind}" data-embed="${kind}" data-id="${esc(id)}" data-opts="${esc(JSON.stringify(opts))}">` +
          `<figcaption class="embed-fallback"><strong>${esc(title)}</strong>: ${esc(description)} <em>(Interactive; needs JavaScript to run.)</em></figcaption></figure>`;
      }
      parent.children[index] = { type: 'html', value: html };
    });
  };
}
