import { readFileSync } from 'fs'
import * as path from 'path'

describe('dashboard DB select typing cleanup', () => {
  const loaderSource = readFileSync(
    path.join(process.cwd(), 'src/lib/data/loader.ts'),
    'utf8'
  )

  it('builds DASHBOARD_PROPERTY_SELECT from typed property row keys instead of an inline raw SQL string', () => {
    expect(loaderSource).toContain('DASHBOARD_PROPERTY_SELECT_COLUMNS')
    expect(loaderSource).toContain('satisfies readonly DashboardPropertySelectColumn[]')
    expect(loaderSource).not.toMatch(/export\s+const\s+DASHBOARD_PROPERTY_SELECT\s*=\s*`/)
  })
})
