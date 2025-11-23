import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const SignupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginData = z.infer<typeof LoginSchema>
export type SignupData = z.infer<typeof SignupSchema>

export const VerifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
})

export type VerifyEmailData = z.infer<typeof VerifyEmailSchema>
