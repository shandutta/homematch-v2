import { readFileSync } from 'fs'
import * as path from 'path'

describe('CouplesRealtime DB performance closure', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/lib/realtime/couples-realtime.ts'),
    'utf8'
  )

  it('uses generated database row types instead of inline interaction payload typing', () => {
    expect(source).toContain("AppDatabase['public']['Tables']['user_property_interactions']['Row']")
    expect(source).not.toMatch(/type\s+PropertyInteractionPayload\s*=\s*\{[\s\S]*?interaction_type:[\s\S]*?created_at:[\s\S]*?\}/)
  })

  it('uses one server-side RPC for mutual-like enrichment instead of per-event profile/property lookups', () => {
    expect(source).toMatch(/rpc\(\s*'get_realtime_mutual_like_payload'/)
    expect(source).not.toMatch(/from\('user_property_interactions'\)[\s\S]*?select\('id'\)[\s\S]*?eq\('interaction_type', 'like'\)/)
    expect(source).not.toMatch(/from\('properties'\)[\s\S]*?select\('address'\)/)
  })
})
