# Earth Science Encyclopedia (offline)

A fully offline learning app for earth science: readable articles, hand-drawn diagrams, animated simulations and small calculators.
**Phase 1 covers plate tectonics** and is the template for every later topic.

- 5 articles (Earth's layers · what plates are · the three boundary types · evidence for plate tectonics · earthquakes and volcanoes at boundaries)
- 2 simulations: **plate boundaries over time**, **seismic waves through the Earth** (P/S rays, shadow zones)
- 1 tool: **earthquake magnitude calculator**
- Offline full-text search, light/dark mode, installable PWA, no network requests at runtime

## Run it

```bash
npm install
npm run dev          # development server
npm run build        # type-check + build + offline/links guard  →  dist/
npm run preview      # serve dist/ at http://localhost:4321
```

Serve `dist/` from any static host or `npm run preview`, open it once, and the service worker caches the whole site (about 0.7 MB). After that it works with no connection, and Chrome/Edge/Safari offer to install it as an app.
(Service workers do not run from `file://`, so open it through a local server the first time.)

## Tests

```bash
npm test                    # unit tests: magnitude maths, ray tracer / shadow zones, plate model
npm run test:e2e            # real Chrome, network OFF and external hosts blocked: every page, sim, tool and search
npm run test:offline-proof  # installs the service worker, KILLS the server, relaunches the browser, browses the site
```

`npm run build` also fails if the output could load anything from an external host or contains a broken internal link.
End-to-end tests use your installed Google Chrome (`channel: 'chrome'`), so no browser download is needed.

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| Articles | `content/en/topics/<topic>/*.md` | Markdown + validated frontmatter; `{{sim:id}}`, `{{tool:id}}`, `{{diagram:id}}` shortcodes |
| Topics | `content/en/topics/<topic>/_topic.md` | |
| Sims, tools, diagrams | `src/modules/<topic>/{sims,tools,diagrams}/` | Self-contained; discovered automatically |
| App shell, search, embed system, sim kit | `src/core/` | Not edited when adding content |
| Search | `src/pages/search-index.json.ts` | MiniSearch index built at build time, loaded on first search |
| Offline | `@vite-pwa/astro` (Workbox) | Precaches all pages, scripts, fonts and the search index |

See **CONTRIBUTING.md** for how to add a topic, article, simulation, tool or diagram, and **CREDITS.md** for sources and licences.

## Accuracy notes

Scientific accuracy comes before flashiness, and every simulation lists its simplifications next to it. In particular:

- The seismic simulation traces rays through a **simplified** PREM-like model with hand-entered, approximate speeds. Its P-wave shadow zone starts at ≈98° in ray theory; textbooks quote 104° because weak diffracted waves persist a few degrees further.
- The plate-boundary simulation is a **schematic**, not a physical model.
- The magnitude calculator's cross-scale conversions are statistical fits and are flagged as approximate. Two intercept constants are marked unverified in `CREDITS.md`.
- Articles should be reviewed by a geoscience teacher before being relied on for teaching.

## Not in Phase 1

No three.js globe (a 2D cross-section teaches the seismic content better), no Tauri build (Rust is not installed here; the app is built to be wrappable, see CONTRIBUTING.md), and no ESLint/Prettier setup yet.



**testing 123**