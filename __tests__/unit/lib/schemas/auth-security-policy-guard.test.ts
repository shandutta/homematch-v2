/**
 * @jest-environment node
 *
 * Server form validation security policy guard for `src/lib/schemas/auth.ts`.
 *
 * The login, signup, and email-verification schemas are the front line of
 * input validation for every credential-bearing form. They are consumed both
 * client-side (via `useValidatedForm`) and server-side (anywhere a route or
 * server action calls `safeParse` on a credential payload). A silent
 * weakening of length caps, password complexity, mismatch refinement, or OTP
 * shape would propagate to every caller — bypassing the form/API security
 * boundary without a callsite change.
 *
 * This guard pins the security-critical invariants directly to the schemas
 * so that relaxing them requires an explicit, reviewable diff against this
 * file alongside the schema change.
 */

import {
  LoginSchema,
  SignupSchema,
  VerifyEmailSchema,
} from '@/lib/schemas/auth'

const validSignup = {
  email: 'good@example.com',
  displayName: 'Alice',
  password: 'CorrectHorse1',
  confirmPassword: 'CorrectHorse1',
}

describe('auth schemas — server form validation security policy', () => {
  describe('SignupSchema', () => {
    it('accepts a representative compliant payload', () => {
      expect(SignupSchema.safeParse(validSignup).success).toBe(true)
    })

    it('rejects an empty display name', () => {
      const result = SignupSchema.safeParse({ ...validSignup, displayName: '' })
      expect(result.success).toBe(false)
    })

    it('caps display names at 50 characters', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        displayName: 'A'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('requires passwords to be at least 8 characters', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        password: 'Aa1aaaa',
        confirmPassword: 'Aa1aaaa',
      })
      expect(result.success).toBe(false)
    })

    it('requires passwords to contain a lowercase letter', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        password: 'PASSWORD1',
        confirmPassword: 'PASSWORD1',
      })
      expect(result.success).toBe(false)
    })

    it('requires passwords to contain an uppercase letter', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        password: 'password1',
        confirmPassword: 'password1',
      })
      expect(result.success).toBe(false)
    })

    it('requires passwords to contain a digit', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        password: 'PasswordOnly',
        confirmPassword: 'PasswordOnly',
      })
      expect(result.success).toBe(false)
    })

    it('reports password mismatches on the confirmPassword field', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        confirmPassword: 'Different1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const paths = result.error.issues.map((issue) => issue.path.join('.'))
        expect(paths).toContain('confirmPassword')
      }
    })

    it('rejects malformed email addresses', () => {
      const result = SignupSchema.safeParse({
        ...validSignup,
        email: 'not-an-email',
      })
      expect(result.success).toBe(false)
    })

    it('strips unknown fields so signup payloads cannot smuggle privileged keys', () => {
      const payload = {
        ...validSignup,
        is_admin: true,
        household_id: 'attacker-controlled',
        role: 'service_role',
      } as Record<string, unknown>
      const result = SignupSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        const data = result.data as Record<string, unknown>
        expect('is_admin' in data).toBe(false)
        expect('household_id' in data).toBe(false)
        expect('role' in data).toBe(false)
      }
    })
  })

  describe('LoginSchema', () => {
    it('rejects an empty password', () => {
      const result = LoginSchema.safeParse({
        email: 'good@example.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords shorter than 6 characters', () => {
      const result = LoginSchema.safeParse({
        email: 'good@example.com',
        password: 'short',
      })
      expect(result.success).toBe(false)
    })

    it('rejects malformed email addresses', () => {
      const result = LoginSchema.safeParse({
        email: 'not-an-email',
        password: 'whatever',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('VerifyEmailSchema (OTP)', () => {
    it('accepts a valid 6-digit numeric token', () => {
      expect(
        VerifyEmailSchema.safeParse({
          email: 'good@example.com',
          token: '123456',
        }).success
      ).toBe(true)
    })

    it('rejects tokens that contain non-digit characters', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'good@example.com',
        token: '12345A',
      })
      expect(result.success).toBe(false)
    })

    it('rejects tokens shorter than 6 digits', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'good@example.com',
        token: '12345',
      })
      expect(result.success).toBe(false)
    })

    it('rejects tokens longer than 6 digits', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'good@example.com',
        token: '1234567',
      })
      expect(result.success).toBe(false)
    })

    it('rejects whitespace-padded tokens', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'good@example.com',
        token: ' 12345',
      })
      expect(result.success).toBe(false)
    })
  })
})
