// Phase 0/1 closure: P0-strict-anon-protected
import {
  isProtectedPath,
  PROTECTED_PATH_PREFIXES,
} from '@/lib/routing/protected-routes'

describe('protected route policy', () => {
  it('protects product and account routes that require a user session', () => {
    expect(isProtectedPath('/dashboard')).toBe(true)
    expect(isProtectedPath('/dashboard/liked')).toBe(true)
    expect(isProtectedPath('/profile')).toBe(true)
    expect(isProtectedPath('/settings')).toBe(true)
    expect(isProtectedPath('/couples/decisions')).toBe(true)
    expect(isProtectedPath('/properties/abc123')).toBe(true)
  })

  it('protects singular household onboarding routes', () => {
    expect(isProtectedPath('/household/create')).toBe(true)
    expect(isProtectedPath('/household/join')).toBe(true)
    expect(PROTECTED_PATH_PREFIXES).not.toContain('/households')
  })

  it('does not overmatch marketing, auth, or similarly named public paths', () => {
    expect(isProtectedPath('/')).toBe(false)
    expect(isProtectedPath('/login')).toBe(false)
    expect(isProtectedPath('/signup')).toBe(false)
    expect(isProtectedPath('/properties-public')).toBe(false)
    expect(isProtectedPath('/householdish')).toBe(false)
  })
})
