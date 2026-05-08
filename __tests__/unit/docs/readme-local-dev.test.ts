import { readFileSync } from 'fs'
import path from 'path'

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
  })
})
