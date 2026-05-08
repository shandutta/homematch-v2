import { readFileSync } from 'fs'
import path from 'path'

const routePaths = [
  'src/app/api/maps/geocode/route.ts',
  'src/app/api/maps/places/autocomplete/route.ts',
  'src/app/api/maps/proxy-script/route.ts',
]

describe('M8 external call timeout adoption', () => {
  it.each(routePaths)('%s wraps outbound Google fetches with a timeout', (routePath) => {
    const source = readFileSync(path.join(process.cwd(), routePath), 'utf8')

    expect(source).toContain("@/lib/api/fetch-timeout")
    expect(source).toContain('fetchWithTimeout(')
  })
})
