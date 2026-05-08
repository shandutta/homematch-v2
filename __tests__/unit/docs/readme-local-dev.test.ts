import { readFileSync } from 'fs'
import * as path from 'path'

describe('README local development closure', () => {
  const readme = readFileSync(path.join(process.cwd(), 'README.md'), 'utf8')

  it('documents the fast no-Docker dev loop and guarded Supabase bypass', () => {
    expect(readme).toContain('SKIP_SUPABASE_GUARD=true pnpm dev')
    expect(readme).toContain('Docker is optional')
    expect(readme).toContain('pnpm dev:db')
    expect(readme).toContain('SKIP_DOCKER=1')
  })

  it('keeps secret handling explicit without committing production env values', () => {
    expect(readme).toContain('.env.local')
    expect(readme).toContain('Never commit secrets')
    expect(readme).toContain('docs/secrets.md')
    expect(readme).toContain('`.env.prod` is intentionally untracked')
    expect(readme).toContain('config/supabase-production-hosts.json')
    expect(readme).toContain(
      'store only hostnames there, never keys or database URLs'
    )
  })
})
