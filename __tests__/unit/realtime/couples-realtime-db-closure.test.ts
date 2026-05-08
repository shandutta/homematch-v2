import { readFileSync } from 'fs'
import * as path from 'path'

describe('CouplesRealtime DB performance closure', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/lib/realtime/couples-realtime.ts'),
    'utf8'
  )
  const appDatabaseSource = readFileSync(
    path.join(process.cwd(), 'src/types/app-database.ts'),
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

  it('passes the migration parameter names through the RPC call', () => {
    expect(source).toMatch(/p_current_user_id:\s*user\.id/)
    expect(source).toMatch(/p_partner_user_id:\s*interaction\.user_id/)
    expect(source).toMatch(/p_property_id:\s*interaction\.property_id/)
  })

  it('derives the RPC payload type from AppDatabase Functions instead of inline duplicating the select shape', () => {
    expect(source).toContain(
      "AppDatabase['public']['Functions']['get_realtime_mutual_like_payload']['Returns']"
    )
    expect(source).not.toMatch(
      /type\s+RealtimeMutualLikePayload\s*=\s*\{[\s\S]*?has_mutual_like[\s\S]*?partner_name[\s\S]*?property_address[\s\S]*?\}/
    )
  })

  it('declares the typed RPC payload contract in AppDatabase Functions', () => {
    expect(appDatabaseSource).toMatch(/get_realtime_mutual_like_payload:\s*\{/)
    expect(appDatabaseSource).toMatch(/p_current_user_id:\s*string/)
    expect(appDatabaseSource).toMatch(/p_partner_user_id:\s*string/)
    expect(appDatabaseSource).toMatch(/p_property_id:\s*string/)
    expect(appDatabaseSource).toMatch(
      /Returns:\s*Array<\{[\s\S]*?has_mutual_like:\s*boolean[\s\S]*?partner_name:\s*string\s*\|\s*null[\s\S]*?property_address:\s*string\s*\|\s*null[\s\S]*?\}>/
    )
  })
})
