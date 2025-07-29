/**
 * Metro Area to State Mapping
 * Fixes the issue where all neighborhoods defaulted to "CA"
 */

export const METRO_AREA_STATE_MAPPING: Record<string, string> = {
  // California metros
  'San Francisco–Oakland–San Jose': 'CA',
  'Los Angeles–Long Beach–Anaheim': 'CA',
  'San Diego–Chula Vista–Carlsbad': 'CA',

  // Multi-state metros - use primary state
  'New York–Newark–Jersey City': 'NY',
  'Washington–Arlington–Alexandria': 'DC',
  'Philadelphia–Camden–Wilmington': 'PA',
  'Chicago–Naperville–Elgin': 'IL',
  'Minneapolis–St. Paul–Bloomington': 'MN',
  'Miami–Fort Lauderdale–West Palm Beach': 'FL',
  'Atlanta–Sandy Springs–Roswell': 'GA',
  'Denver–Aurora–Lakewood': 'CO',
  'Dallas–Fort Worth–Arlington': 'TX',
  'Houston–Pasadena–The Woodlands': 'TX',
  'Phoenix–Mesa–Chandler': 'AZ',
  'Seattle–Tacoma–Bellevue': 'WA',
  'Boston–Cambridge–Newton': 'MA',
  'Detroit–Warren–Dearborn': 'MI',
  'Tampa–St. Petersburg–Clearwater': 'FL',
  'Orlando–Kissimmee–Sanford': 'FL',
  'St. Louis': 'MO',
  'Baltimore–Columbia–Towson': 'MD',
  'Charlotte–Concord–Gastonia': 'NC',
  'Portland–Vancouver–Hillsboro': 'OR',
  'San Antonio–New Braunfels': 'TX',
  Pittsburgh: 'PA',
  Cincinnati: 'OH',
  'Kansas City': 'MO',
  'Las Vegas–Henderson–Paradise': 'NV',
  'Cleveland–Elyria': 'OH',
  Columbus: 'OH',
  'Indianapolis–Carmel–Anderson': 'IN',
  'San Jose–Sunnyvale–Santa Clara': 'CA',
  'Austin–Round Rock–Georgetown': 'TX',
  'Virginia Beach–Norfolk–Newport News': 'VA',
  'Providence–Warwick': 'RI',
  'Milwaukee–Waukesha': 'WI',
  Jacksonville: 'FL',
  Memphis: 'TN',
  'Oklahoma City': 'OK',
  'Louisville/Jefferson County': 'KY',
  Richmond: 'VA',
  'New Orleans–Metairie': 'LA',
  'Raleigh–Cary': 'NC',
  'Birmingham–Hoover': 'AL',
  'Salt Lake City': 'UT',
  Rochester: 'NY',
  'Grand Rapids–Kentwood': 'MI',
  Tucson: 'AZ',
  'Urban Honolulu': 'HI',
  Tulsa: 'OK',
  Fresno: 'CA',
  Worcester: 'MA',
  'Bridgeport–Stamford–Norwalk': 'CT',
  'Albany–Schenectady–Troy': 'NY',
  'Omaha–Council Bluffs': 'NE',
  Albuquerque: 'NM',
  'Greenville–Anderson': 'SC',
  'Oxnard–Thousand Oaks–Ventura': 'CA',
  Knoxville: 'TN',
  'McAllen–Edinburg–Mission': 'TX',
  'Baton Rouge': 'LA',
  'Dayton–Kettering': 'OH',
  Stockton: 'CA',
  Bakersfield: 'CA',
  'Charleston–North Charleston': 'SC',
  Akron: 'OH',
  Madison: 'WI',
  'Colorado Springs': 'CO',
  'Cape Coral–Fort Myers': 'FL',
  'Deltona–Daytona Beach–Ormond Beach': 'FL',
  Modesto: 'CA',
  'El Paso': 'TX',
  Syracuse: 'NY',
  'Sarasota–Bradenton–Venice': 'FL',
  'Youngstown–Warren–Boardman': 'OH',
  'Scranton–Wilkes-Barre': 'PA',
  'Harrisburg–York–Lebanon': 'PA',
  Springfield: 'MA',
  'Lakeland–Winter Haven': 'FL',
  Toledo: 'OH',
  'Augusta–Richmond County': 'GA',
  Chattanooga: 'TN',
  'North Port–Sarasota–Bradenton': 'FL',
}

/**
 * Get state for metro area, with fallback
 */
export function getStateForMetroArea(metroArea: string): string {
  // Direct lookup
  const state = METRO_AREA_STATE_MAPPING[metroArea]
  if (state) return state

  // Fallback patterns for unmapped metros
  if (metroArea.includes('California') || metroArea.includes('CA')) return 'CA'
  if (metroArea.includes('Texas') || metroArea.includes('TX')) return 'TX'
  if (metroArea.includes('Florida') || metroArea.includes('FL')) return 'FL'
  if (metroArea.includes('New York') || metroArea.includes('NY')) return 'NY'

  // Default to CA for unknown metros (most current data is CA-based)
  console.warn(`Unknown metro area: ${metroArea}, defaulting to CA`)
  return 'CA'
}
