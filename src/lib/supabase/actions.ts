'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from './server'
import { buildServerRedirectUrl } from '@/lib/utils/server-url'

const requireFormString = (formData: FormData, key: string): string => {
  const value = formData.get(key)
  if (typeof value !== 'string') {
    throw new Error(`Expected form field "${key}" to be a string`)
  }
  return value
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: requireFormString(formData, 'email'),
    password: requireFormString(formData, 'password'),
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: requireFormString(formData, 'email'),
    password: requireFormString(formData, 'password'),
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const redirectTo = await buildServerRedirectUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) {
    redirect('/error')
  }

  if (data.url) {
    redirect(data.url)
  }
}
