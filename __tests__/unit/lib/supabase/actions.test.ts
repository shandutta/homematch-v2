import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'
import { signOut } from '@/lib/supabase/actions'

const redirectMock = jest.fn()
const revalidatePathMock = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  redirect: (...args: unknown[]) => redirectMock(...args),
}))
jest.mock('next/cache', () => ({
  __esModule: true,
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

jest.mock('@/lib/supabase/server', () => {
  const auth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    signInWithOAuth: jest.fn(),
  }
  return {
    __esModule: true,
    createClient: jest.fn().mockResolvedValue({ auth }),
    __auth: auth,
  }
})

jest.mock('@/lib/utils/server-url', () => ({
  __esModule: true,
  buildServerRedirectUrl: jest.fn().mockResolvedValue('http://redirect.test'),
}))

import { __auth as supabaseAuth, createClient } from '@/lib/supabase/server'

describe('supabase actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createClient.mockResolvedValue({ auth: supabaseAuth })
    supabaseAuth.signInWithPassword.mockReset()
    supabaseAuth.signUp.mockReset()
    supabaseAuth.signOut.mockReset()
    supabaseAuth.signInWithOAuth.mockReset()
  })

  test('only keeps wired server actions', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/supabase/actions.ts'),
      'utf8'
    )

    expect(source).toContain('export async function signOut')
    expect(source).not.toContain('export async function login')
    expect(source).not.toContain('export async function signup')
    expect(source).not.toContain('export async function signInWithGoogle')
  })

  test('signOut redirects home on success', async () => {
    supabaseAuth.signOut.mockResolvedValue({ error: null })

    await signOut()

    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
    expect(redirectMock).toHaveBeenCalledWith('/')
  })
})
