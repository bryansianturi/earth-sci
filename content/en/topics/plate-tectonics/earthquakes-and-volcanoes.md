---
title: Earthquakes and Volcanoes at Plate Boundaries
topic: plate-tectonics
summary: "Why most earthquakes and volcanoes occur in narrow belts along plate boundaries, why each boundary type behaves differently, and how earthquake size is measured."
level: core
tags: [earthquakes, volcanoes, magnitude, subduction, ring of fire, faults, tsunami]
related:
  - plate-tectonics/plate-boundaries
  - plate-tectonics/earths-layers
order: 5
sources:
  - title: "USGS Earthquake Hazards Program, Earthquake Glossary and Magnitude/Intensity pages"
    url: "https://www.usgs.gov/programs/earthquake-hazards"
  - title: "Kious, W. J. & Tilling, R. I., This Dynamic Earth: The Story of Plate Tectonics (USGS, 1996)"
    url: "https://pubs.usgs.gov/gip/dynamic/dynamic.html"
  - title: "Hanks, T. C. & Kanamori, H., A moment magnitude scale, Journal of Geophysical Research 84, 2348–2350 (1979)"
  - title: "Gutenberg, B. & Richter, C. F., Magnitude and energy of earthquakes, Annali di Geofisica 9, 1–15 (1956)"
  - title: "Grove, T. L., Till, C. B. & Krawczynski, M. J., The role of H₂O in subduction zone magmatism, Annual Review of Earth and Planetary Sciences 40, 413–439 (2012)"
updated: 2026-11-26
---

If you plot every earthquake and every active volcano on a map, they do not scatter evenly. They trace narrow belts, and those belts are the plate boundaries. About **90% of the world's earthquakes** and a large majority of its active volcanoes lie along the **Ring of Fire** around the Pacific Ocean, where plates are converging or sliding past. But the *kind* of earthquake and volcano depends on the *kind* of boundary.

## Earthquakes: sudden slip on a fault

Plates move steadily, but the rock at their edges is rough and sticks. Stress builds for years or centuries. When the stress exceeds the friction, the fault suddenly slips and the stored elastic energy is released as seismic waves. This is the **elastic rebound** idea. Earthquakes are simply the fast part of a very slow process.

| Boundary | Typical earthquakes | Depth |
|---|---|---|
| Divergent | Small to moderate; normal faults | Shallow (under ~15 km) |
| Transform | Can be large (M7–8); strike-slip | Shallow (under ~20 km) |
| Convergent | The **largest** earthquakes on Earth (M9+ "megathrusts") | Shallow to **very deep** (down to ~700 km) |

Only subduction zones produce **deep earthquakes**. Because the sinking slab stays cold and brittle for a long time, earthquakes occur along it in a tilted plane called the **Wadati–Benioff zone**, deeper the further you go from the trench. You can see this in the [plate boundary simulation](../plate-boundaries/): the yellow dots mark earthquakes along the slab.

At subduction zones the locked boundary between the two plates can also lift or drop the sea floor suddenly by metres, pushing up the water above it and causing a **tsunami**. This is what happened in 2004 (Sumatra) and 2011 (Japan).

### Measuring size: magnitude

An earthquake's **magnitude** is a number describing its size on a logarithmic scale. The modern standard is **moment magnitude (Mw)**, calculated from the area of the fault that slipped, the average slip and the stiffness of the rock. Each whole number up is about **10 times larger ground motion** but about **32 times more energy released**. So a magnitude 7 releases roughly 32 times the energy of a magnitude 6 and about 1,000 times that of a magnitude 5.

{{tool:magnitude-calculator}}

> **Common misconception.** "Earthquakes are measured on the Richter scale." Charles Richter's 1935 scale (now called local magnitude, ML) was designed for moderate earthquakes in southern California. Seismologists today almost always report moment magnitude, which stays accurate for the largest quakes. News outlets often still say "Richter".

> **Common misconception.** "Earthquakes only happen at plate boundaries." Most do, but some occur inside plates, such as the 1811–12 New Madrid earthquakes in the central United States. Intraplate earthquakes happen on old weak faults and are rarer but can be damaging.

## Volcanoes: where rock melts

Mantle rock is solid, so a volcano needs a reason for it to melt. There are three main reasons, and each is tied to a setting:

1. **Divergent boundaries: decompression melting.** As plates separate, hot mantle rock rises and the pressure on it drops. Lower pressure lets it partially melt without being heated further. The magma erupts quietly, forming new sea floor at ridges (basalt, often pillow-shaped under water).
2. **Subduction zones: flux melting.** The sinking slab carries water in its minerals. At about 100 km depth, that water is released into the hot mantle above, lowering its melting point, like salt on ice. The resulting magma is rich in gas and silica and tends to erupt explosively. This builds volcanic arcs such as the Andes, Cascades and Japan.
3. **Hotspots: mantle plumes.** A few volcanoes, such as Hawaii and Yellowstone, are far from plate boundaries. They sit over unusually hot upwelling mantle rock, so they are "intraplate".

**Transform boundaries** generally have no volcanoes because nothing is rising or sinking: the plates just slide.

Notice that **melting happens in solid rock under special conditions** (lower pressure, or added water, or extra heat), not because the mantle is liquid.

> **Common misconception.** "The sinking slab melts and that is the magma." Mostly not: it's the *mantle above* the slab that melts, helped by water released from the slab.

<details>
<summary>Go deeper: seismic waves and how earthquakes are located</summary>

An earthquake generates P-waves, which are fast, and S-waves, which are slower, plus surface waves, which cause most shaking and damage. Because P-waves travel faster than S-waves, the gap between the first P arrival and the first S arrival at a seismometer tells you how far away the earthquake was: roughly 8 seconds of gap per 100 km, for typical crust. Three or more stations let you triangulate the epicentre.

**Magnitude vs. intensity.** Magnitude measures the earthquake's size at its source, and there is one value per earthquake. **Intensity** (the Modified Mercalli scale) describes shaking and damage at a *place*, and it varies with distance, local geology and building quality. A magnitude 6 under a city can cause more damage than a magnitude 7 far offshore.

**The energy formula.** The widely used relationship log₁₀ E = 1.5 M + 4.8 (E in joules) from Gutenberg and Richter estimates the radiated seismic energy. It is only a statistical relationship, and the radiated energy is just a small part of the total energy released, since most goes into breaking rock and heat. That is why the calculator reports "radiated energy" and treats comparisons as approximate.

**Why not just use one scale?** Older scales (ML, mb, Ms) each measure the amplitude of one type of wave at one frequency, and **saturate**: past a certain size, bigger earthquakes stop producing bigger readings. Moment magnitude does not saturate. The calculator's conversions between scales use published statistical fits (Scordilis, 2006), so they are rough.
</details>
