/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Phase 1 auth boundary consolidation', () => {
  it.each([
    'src/app/api/couples/check-mutual/route.ts',
    'src/app/api/couples/stats/route.ts',
    'src/app/api/couples/mutual-likes/route.ts',
  ])(
    '%s uses requireUserFromRequest instead of open-coded auth extraction',
    (path) => {
      const source = read(path)

      expect(source).toContain('requireUserFromRequest')
      expect(source).not.toContain('getUserFromRequest')
      expect(source).not.toContain('authError || !user')
    }
  )

  it('keeps bearer-token fallback in the canonical auth helper instead of monkey-patching the API client', () => {
    const authHelperSource = read('src/lib/api/auth.ts')
    const serverClientSource = read('src/lib/supabase/server.ts')

    expect(authHelperSource).toContain('supabase.auth.getUser(bearerToken ?? undefined)')
    expect(authHelperSource).toContain('return supabase.auth.getUser()')
    expect(serverClientSource).not.toContain('supabase.auth.getUser =')
    expect(serverClientSource).not.toContain('getUserWithBearer')
  })

  it('does not use service-role fallback in the user-scoped interactions write path', () => {
    const source = read('src/app/api/interactions/route.ts')

    expect(source).not.toContain('getServiceRoleClient')
    expect(source).not.toContain('fetchHouseholdIdWithServiceRole')
    expect(source).not.toContain('Service role lookup failed')
    expect(source).toContain(".select('household_id')")
  })
})
