import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import {
  login,
  signup,
  signOut,
  signInWithGoogle,
} from '@/lib/supabase/actions'

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

const buildFormData = (entries: Record<string, string>) => {
  const fd = new FormData()
  Object.entries(entries).forEach(([k, v]) => fd.append(k, v))
  return fd
}

describe('supabase actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createClient.mockResolvedValue({ auth: supabaseAuth })
    supabaseAuth.signInWithPassword.mockReset()
    supabaseAuth.signUp.mockReset()
    supabaseAuth.signOut.mockReset()
    supabaseAuth.signInWithOAuth.mockReset()
  })

  test('login redirects home on success', async () => {
    supabaseAuth.signInWithPassword.mockResolvedValue({ error: null })

    await login(buildFormData({ email: 'a@b.com', password: 'pw' }))

    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
    expect(redirectMock).toHaveBeenCalledWith('/')
  })

  test('login redirects to error on failure', async () => {
    supabaseAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'boom' },
    })

    await login(buildFormData({ email: 'a@b.com', password: 'pw' }))

    expect(redirectMock).toHaveBeenCalledWith('/error')
  })

  test('signup redirects home on success', async () => {
    supabaseAuth.signUp.mockResolvedValue({ error: null })

    await signup(buildFormData({ email: 'a@b.com', password: 'pw' }))

    expect(revalidatePathMock).toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith('/')
  })

  test('signOut redirects home on success', async () => {
    supabaseAuth.signOut.mockResolvedValue({ error: null })

    await signOut()

    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
    expect(redirectMock).toHaveBeenCalledWith('/')
  })

  test('signInWithGoogle redirects to provider url', async () => {
    supabaseAuth.signInWithOAuth.mockResolvedValue({
      data: { url: 'http://google.test' },
      error: null,
    })

    await signInWithGoogle()

    expect(redirectMock).toHaveBeenCalledWith('http://google.test')
  })

  test('signInWithGoogle redirects to error on failure', async () => {
    supabaseAuth.signInWithOAuth.mockResolvedValue({
      data: {},
      error: { message: 'fail' },
    })

    await signInWithGoogle()

    expect(redirectMock).toHaveBeenCalledWith('/error')
  })
})
