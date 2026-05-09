import {
  LoginSchema,
  SignupSchema,
  VerifyEmailSchema,
} from '@/lib/schemas/auth'

describe('auth schemas', () => {
  describe('LoginSchema', () => {
    it('accepts a valid email + password', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: 'secret123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = LoginSchema.safeParse({
        email: 'not-an-email',
        password: 'secret123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('rejects passwords shorter than 6 chars', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must be at least 6 characters'
        )
      }
    })

    it('rejects missing fields', () => {
      expect(LoginSchema.safeParse({}).success).toBe(false)
      expect(LoginSchema.safeParse({ email: 'user@example.com' }).success).toBe(
        false
      )
    })
  })

  describe('SignupSchema', () => {
    const validInput = {
      email: 'user@example.com',
      displayName: 'Alice',
      password: 'Strong1Pass',
      confirmPassword: 'Strong1Pass',
    }

    it('accepts a valid signup payload', () => {
      const result = SignupSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('rejects when passwords do not match', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        confirmPassword: 'Different1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const mismatch = result.error.issues.find(
          (issue) => issue.path[0] === 'confirmPassword'
        )
        expect(mismatch?.message).toBe('Passwords do not match')
      }
    })

    it('rejects empty display name', () => {
      const result = SignupSchema.safeParse({ ...validInput, displayName: '' })
      expect(result.success).toBe(false)
    })

    it('rejects display names longer than 50 chars', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        displayName: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords shorter than 8 chars', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        password: 'Sho1t',
        confirmPassword: 'Sho1t',
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords missing uppercase', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        password: 'lowercase1',
        confirmPassword: 'lowercase1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords missing lowercase', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        password: 'UPPERCASE1',
        confirmPassword: 'UPPERCASE1',
      })
      expect(result.success).toBe(false)
    })

    it('rejects passwords missing a digit', () => {
      const result = SignupSchema.safeParse({
        ...validInput,
        password: 'NoDigitsHere',
        confirmPassword: 'NoDigitsHere',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('VerifyEmailSchema', () => {
    it('accepts a valid email and 6-digit code', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'user@example.com',
        token: '123456',
      })
      expect(result.success).toBe(true)
    })

    it('rejects non-6-digit codes', () => {
      expect(
        VerifyEmailSchema.safeParse({
          email: 'user@example.com',
          token: '12345',
        }).success
      ).toBe(false)
      expect(
        VerifyEmailSchema.safeParse({
          email: 'user@example.com',
          token: '1234567',
        }).success
      ).toBe(false)
      expect(
        VerifyEmailSchema.safeParse({
          email: 'user@example.com',
          token: 'abcdef',
        }).success
      ).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = VerifyEmailSchema.safeParse({
        email: 'not-an-email',
        token: '123456',
      })
      expect(result.success).toBe(false)
    })
  })
})
