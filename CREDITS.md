# Credits and licences

Everything in this repository is either written for this project or comes from the openly licensed sources below.
**No third-party images, photographs or datasets are used.** All diagrams are original SVG drawings and all simulations are original code.

When you add an asset, add a row here **in the same commit** (see CONTRIBUTING.md).

## Software (bundled locally, never loaded from a CDN)

| Component | Use | Licence |
|---|---|---|
| [Astro](https://astro.build) | Static site generator | MIT |
| [Vite](https://vitejs.dev) (via Astro) | Bundler | MIT |
| [MiniSearch](https://github.com/lucaong/minisearch) | Offline full-text search | MIT |
| [@vite-pwa/astro](https://github.com/vite-pwa/astro) + Workbox | Service worker generation | MIT / MIT |
| Vitest, Playwright | Testing (dev only) | MIT / Apache-2.0 |
| sharp | Rendering PNG icons from SVG (dev only) | Apache-2.0 |

## Fonts (self-hosted via Fontsource, files copied into the build)

| Font | Package | Licence |
|---|---|---|
| Inter (variable) | `@fontsource-variable/inter` | SIL Open Font License 1.1 |
| Source Serif 4 (variable) | `@fontsource-variable/source-serif-4` | SIL Open Font License 1.1 |

## Images and diagrams

| Asset | Source | Licence |
|---|---|---|
| `src/modules/plate-tectonics/diagrams/*.svg` (earth-layers, lithosphere-asthenosphere, boundary-types, magnetic-stripes, plate-forces) | Drawn by the project authors | Same licence as this project |
| `public/icons/*` (app icon) | Drawn by the project authors | Same licence as this project |

## Scientific data and formulas used in code

These are published scientific results (facts and equations), not copied datasets. They are cited so they can be checked.

| Where | What | Source |
|---|---|---|
| `sims/seismic-waves/earth-model.ts` | Layer radii (Moho 6346.6 km, CMB 3480 km, ICB 1221.5 km) and approximate P/S speeds | Dziewonski & Anderson (1981), PREM, *Phys. Earth Planet. Inter.* 25, 297–356. **The speeds in the code are simplified, piecewise-linear approximations typed in by hand, not the published polynomial fits. They are good to a few percent. Verify against PREM tables before using for anything quantitative.** |
| `tools/magnitude-calculator/physics.ts` | Mw = (2/3)(log₁₀ M₀ − 9.1) | Hanks & Kanamori (1979); IASPEI standard formula |
| same | log₁₀ E = 1.5 M + 4.8 (joules) | Gutenberg & Richter (1956), as published by USGS |
| same | 1 tonne TNT = 4.184 × 10⁹ J | Defined value |
| same | Ms → Mw and mb → Mw conversions | Scordilis (2006), *J. Seismology* 10, 225–236. Slopes (0.67 and 0.99 for Ms; 0.85 for mb) and the 2.07 intercept were confirmed against published summaries. **The intercepts 0.08 (Ms 6.2–8.2) and 1.03 (mb) were not independently confirmed; check them against the paper.** |
| `tools/magnitude-calculator/comparisons.ts` | Everyday energy yardsticks (gasoline, lightning, bombs, household electricity, world energy use) | US EIA (gasoline, household electricity), NOAA/NWS (lightning), widely published yield estimates. Order-of-magnitude figures only. |
| same | Notable earthquake magnitudes | USGS earthquake catalogue (public domain) |
| `content/` | Article text | Written for this project, drawing on the sources listed at the foot of each article (USGS *This Dynamic Earth*, textbooks, and the papers cited there). USGS publications are US-government works in the public domain. |

## Not used (and why)

Natural Earth, NASA, NOAA and Wikimedia Commons images or datasets were considered for maps (for example a plate-boundary world map). None are included in Phase 1: accurate plate boundary lines need a real dataset, and a hand-drawn map would risk being wrong. When one is added, record its exact source, version and licence in the table above.
