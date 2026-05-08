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
})
