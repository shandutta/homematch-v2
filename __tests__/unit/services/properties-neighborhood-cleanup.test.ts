// Phase 0/1 closure: M15-stale-neighborhood-todo
import { readFileSync } from 'fs'
import path from 'path'

describe('neighborhood service cleanup guard', () => {
  const sourcePath = path.join(
    process.cwd(),
    'src/lib/services/properties/neighborhood.ts'
  )

  it('does not carry stale TODO markers for intentionally deferred RPC fallbacks', () => {
    const source = readFileSync(sourcePath, 'utf8')

    expect(source).not.toMatch(/TODO:/)
    expect(source).toContain('Intentional fallback')
  })
})
