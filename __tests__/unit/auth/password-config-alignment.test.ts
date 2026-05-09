// Phase 0/1 closure: P1-cookie-httpOnly
import { readFileSync } from 'fs'
import path from 'path'

describe('Supabase auth password config alignment', () => {
  const config = readFileSync(
    path.join(process.cwd(), 'supabase/config.toml'),
    'utf8'
  )

  it('matches the app signup schema minimum length and composition requirements', () => {
    expect(config).toContain('minimum_password_length = 8')
    expect(config).toContain(
      'password_requirements = "lower_upper_letters_digits"'
    )
  })
})
