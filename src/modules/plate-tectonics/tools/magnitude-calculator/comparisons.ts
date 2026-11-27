import type { Reference } from './physics';

/**
 * Everyday energy yardsticks (all in joules). Each value is an order-of-magnitude
 * reference, not a precise measurement. Sources are also listed in CREDITS.md.
 */
export const REFERENCES: Reference[] = [
  { id: 'gallon', label: 'a gallon of gasoline', joules: 1.2e8, note: 'About 33.7 kWh of heat energy per US gallon (US EIA).' },
  { id: 'lightning', label: 'a typical lightning bolt', joules: 1e9, note: 'Roughly one billion joules (NOAA/NWS); real bolts vary by a factor of ten or more.' },
  { id: 'tnt-ton', label: 'one tonne of TNT', joules: 4.184e9, note: 'Defined as 4.184 × 10⁹ J.' },
  { id: 'home-year', label: 'a US home’s electricity for a year', joules: 3.8e10, note: 'About 10,500 kWh per year (US EIA, 2022), at 3.6 × 10⁶ J per kWh.' },
  { id: 'hiroshima', label: 'the Hiroshima bomb', joules: 6.3e13, note: 'About 15 kilotonnes of TNT; published estimates range from about 12 to 18 kt.' },
  { id: 'castle-bravo', label: 'the Castle Bravo H-bomb test (1954)', joules: 6.3e16, note: 'About 15 megatonnes of TNT, the largest US nuclear test.' },
  { id: 'tsar-bomba', label: 'the Tsar Bomba test (1961)', joules: 2.1e17, note: 'About 50 megatonnes of TNT, the largest nuclear device ever detonated.' },
  { id: 'world-year', label: 'all the energy humanity uses in a year', joules: 6e20, note: 'About 600 exajoules of primary energy per year (recent global estimates).' },
];

export interface NotableQuake { name: string; year: number; mw: number; note: string }

/** Moment magnitudes as published by the USGS catalogue. */
export const NOTABLE_QUAKES: NotableQuake[] = [
  { name: 'Napa, California', year: 2014, mw: 6.0, note: 'Damaging but moderate' },
  { name: 'Northridge, California', year: 1994, mw: 6.7, note: 'Under a major city' },
  { name: 'Haiti', year: 2010, mw: 7.0, note: 'Shallow, near Port-au-Prince' },
  { name: 'Ridgecrest, California', year: 2019, mw: 7.1, note: 'Strike-slip, sparsely populated' },
  { name: 'Turkey–Syria', year: 2023, mw: 7.8, note: 'Strike-slip on the East Anatolian Fault' },
  { name: 'Alaska', year: 1964, mw: 9.2, note: 'Second-largest ever recorded' },
  { name: 'Tohoku, Japan', year: 2011, mw: 9.1, note: 'Generated a huge tsunami' },
  { name: 'Valdivia, Chile', year: 1960, mw: 9.5, note: 'Largest ever recorded' },
];
