/**
 * Bay Area city allowlist used by every ingest path.
 *
 * Single source of truth — `scripts/cleanup-properties-bayarea.ts` and the
 * I4-rebuilt `discover` step both consume this. Add a new city here, not
 * in the script copies.
 */
const BAY_AREA_CITIES = [
  'SAN FRANCISCO',
  'OAKLAND',
  'BERKELEY',
  'SAN JOSE',
  'PALO ALTO',
  'MOUNTAIN VIEW',
  'SUNNYVALE',
  'SANTA CLARA',
  'FREMONT',
  'HAYWARD',
  'WALNUT CREEK',
  'CONCORD',
  'SAN MATEO',
  'REDWOOD CITY',
  'MENLO PARK',
  'SAN RAFAEL',
  'SANTA ROSA',
  'NAPA',
  'VALLEJO',
  'DALY CITY',
  'SOUTH SAN FRANCISCO',
  'SAN BRUNO',
  'BURLINGAME',
  'MILLBRAE',
  'BELMONT',
  'FOSTER CITY',
  'LOS ALTOS',
  'LOS ALTOS HILLS',
  'CUPERTINO',
  'CAMPBELL',
  'SARATOGA',
  'LOS GATOS',
  'MILPITAS',
  'SAN LEANDRO',
  'ALAMEDA',
  'EMERYVILLE',
  'ALBANY',
  'RICHMOND',
  'EL CERRITO',
  'PLEASANTON',
  'DUBLIN',
  'LIVERMORE',
  'UNION CITY',
  'NEWARK',
  'MORGAN HILL',
  'GILROY',
] as const

export type BayAreaCity = (typeof BAY_AREA_CITIES)[number]

export const BAY_AREA_CITY_SET = new Set<string>(BAY_AREA_CITIES)

const _isBayAreaCity = (city: string): city is BayAreaCity =>
  BAY_AREA_CITY_SET.has(city.trim().toUpperCase())

/**
 * Default `location` queries to feed into RapidAPI propertyExtendedSearch.
 * These are the metro entry points; results are then filtered against
 * BAY_AREA_CITY_SET for the final allowlist check.
 */
export const BAY_AREA_DISCOVERY_LOCATIONS = [
  'San Francisco, CA',
  'Oakland, CA',
  'San Jose, CA',
  'Berkeley, CA',
  'Palo Alto, CA',
  'San Mateo, CA',
] as const
