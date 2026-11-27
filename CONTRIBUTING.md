# Contributing: adding to the encyclopedia

The core app never needs editing to add content. A new topic is **Markdown files**, plus optional **simulation / tool / diagram folders**. Everything is discovered automatically.

```
content/en/topics/<topic>/        ← articles live here
src/modules/<topic>/              ← optional interactive parts for that topic
  sims/<id>/    meta.json + index.ts (+ any helper files)
  tools/<id>/   meta.json + index.ts
  diagrams/<id>.svg
src/core/                         ← shell, search, embed system, sim-kit. Do not edit for content work.
```

Commands: `npm run dev` · `npm test` · `npm run build` · `npm run test:e2e` · `npm run test:offline-proof`

---

## 1. Add a topic

1. Create `content/en/topics/<topic-slug>/_topic.md`:
   ```yaml
   ---
   title: Volcanoes
   summary: One or two sentences shown on the home page.
   order: 2          # position on the home page
   hue: 20           # 0-360, tints the topic's card
   ---
   ```
2. Add articles to the same folder (next section). The topic appears on the home page automatically.

## 2. Add an article

Create `content/en/topics/<topic-slug>/<article-slug>.md`. The file name is the URL slug.

```yaml
---
title: How Subduction Works
topic: plate-tectonics            # must match the folder name (build fails otherwise)
summary: "One sentence, 20-300 chars. Quote it if it contains a colon."
level: core                        # intro | core | advanced
tags: [subduction, trench]
related:                           # "topic/article-slug"; build fails if one does not exist
  - plate-tectonics/plate-boundaries
order: 6                           # position within the topic
sources:                           # at least one. URLs are shown as text and never fetched
  - title: "Author, Title, Publisher (Year)"
    url: "https://..."             # optional
updated: 2026-11-26
---
```

Writing guidelines:

- Roughly high-school level, clear and accurate. Accuracy matters more than flashiness.
- Include a **common misconception** callout (a blockquote starting `> **Common misconception.**`) wherever a misconception is likely.
- Put extra depth in a collapsed "Go deeper" block:
  ```html
  <details>
  <summary>Go deeper: a short title</summary>

  Markdown goes here, with a blank line after the summary.
  </details>
  ```
- Link to other articles with relative links: `[plate boundaries](../plate-boundaries/)`. The build checks every internal link.
- State simplifications honestly, both in the text and in the sim's `simplifications` list.

### Embedding diagrams, simulations and tools

Put a shortcode **alone on its own line**:

```
{{diagram:earth-layers}}
{{sim:plate-boundaries}}
{{sim:plate-boundaries type=transform}}      ← options are key=value, passed to the sim as `opts`
{{tool:magnitude-calculator}}
```

An unknown id **fails the build** and lists the valid ids, so typos cannot ship.

## 3. Add a simulation

Create `src/modules/<topic>/sims/<id>/` with two files.

**`meta.json`** (the `id` must equal the folder name):

```json
{
  "id": "my-sim",
  "kind": "sim",
  "title": "Human-readable title",
  "description": "One or two sentences. Shown as the no-JavaScript fallback, on the home page and in search.",
  "tags": ["searchable", "words"],
  "simplifications": ["Every simplification or 'not to scale' note the learner should know. Required for sims, always visible."]
}
```

**`index.ts`**: export `mount`. Use `SimShell` and you get play/pause, speed, reset, a labels toggle, fullscreen, keyboard shortcuts, theme-aware colours, the simplifications panel, a screen-reader status line and `prefers-reduced-motion` handling for free:

```ts
import type { MountFn } from '@core/embed/types';
import { SimShell } from '@core/sim-kit/SimShell';

export const mount: MountFn = (el, { meta, opts }) => {
  let t = 0;
  const shell = new SimShell(el, {
    title: meta.title,
    simplifications: meta.simplifications ?? [],
    width: 960, height: 540,              // logical canvas units
    autoplay: true,                        // ignored if the user prefers reduced motion
    update: (dt) => { t += dt; },          // dt is seconds, already scaled by the speed control
    draw: (ctx, colors, showLabels) => { /* Canvas 2D; use colors.* so dark mode works */ },
    reset: () => { t = 0; },
    describe: () => `Plain-text description of the current state, for screen readers.`,
    buildControls: (host, shell) => { /* optional extra controls; call shell.requestDraw() after changes */ },
  });
  return { destroy: () => shell.destroy() };
};
```

Rules:

- **No network.** No `fetch` to external hosts, no CDN scripts, no remote fonts or images. `npm run build` fails if the output could load anything external.
- Keep the **model separate from drawing** (see `sims/plate-boundaries/model.ts` vs `render.ts`) and **unit-test the model** in `tests/unit/`.
- Anything computed (like the seismic shadow zones) should *emerge from the model*, not be drawn by hand.
- Use colours from the palette (`colors.mantle`, `colors.p`, ...) defined as `--sim-*` variables in `src/core/styles/tokens.css`. Add new ones for both themes there if needed.
- Use 3D (three.js) only where it clearly beats 2D. Import it inside your sim so it is only loaded on pages that embed that sim.

## 4. Add a tool (calculator)

Same as a sim but in `tools/<id>/`, `"kind": "tool"`, and no `SimShell` needed (see `tools/magnitude-calculator/`). Keep the maths in a pure `physics.ts` with unit tests, and show caveats and valid ranges in the UI.

## 5. Add a diagram

Draw an SVG by hand (preferred over sourcing images) and save it as `src/modules/<topic>/diagrams/<id>.svg`.

- Include `<title id="x-t">` and `<desc id="x-d">` and `role="img" aria-labelledby="x-t x-d"`. The `<desc>` text becomes the visible caption.
- Use the theme-aware classes from `src/core/styles/prose.css` (`dg-text`, `dg-mantle`, `dg-water`, ...) instead of hard-coded colours so it works in light and dark mode.
- Make SVG ids (markers etc.) unique across diagrams.

## 6. Search

Nothing to do: articles, sims and tools are indexed at build time (`src/pages/search-index.json.ts`) from titles, tags, summaries and body text.

## 7. Images and data: licensing

Only add material that is **public domain or openly licensed** (NASA, USGS, NOAA, Natural Earth, CC0/CC-BY/CC-BY-SA Wikimedia Commons). Put files under `src/` or `public/`, and **add a row to `CREDITS.md`** with the source URL, author, licence and any required attribution. If you cannot name the licence, do not add the file.

## 8. Before you open a pull request

- [ ] `npm test` passes (unit tests for any new maths/models)
- [ ] `npm run build` passes (type-check, frontmatter and shortcode validation, external-URL and broken-link scan)
- [ ] `npm run test:e2e` passes (loads every page, mounts every sim and tool with the **network off**)
- [ ] Every sim has a non-empty `simplifications` list and respects reduced motion (`SimShell` does this for you)
- [ ] Facts have a source listed at the foot of the article; common misconceptions are addressed
- [ ] `CREDITS.md` updated for any new asset, dataset or formula
- [ ] Looked at the result in light and dark mode at desktop and tablet width (`npm run screenshots -- <dir> [light|dark]` helps)

## Languages (i18n)

Content is in `content/en/` and UI strings are in `src/core/i18n/en.json`, accessed through `t()`. To add a language later: add `content/<lang>/topics/...`, a matching `<lang>.json`, and a locale-aware loader in `src/content.config.ts` and `src/core/i18n/t.ts`. Only English exists today.

## Desktop app (Tauri), later

The app is a pure static site with root-relative asset paths and no runtime network use, so it can be wrapped without changes. The service worker is skipped automatically on `file:` and `tauri:` protocols and when `PUBLIC_TARGET=tauri` is set at build time. Hosting under a sub-path? Build with `BASE_PATH=/sub/path/`.
