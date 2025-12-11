const slugify = (value: string, fallback: string): string => {
  if (!value) return fallback

  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  )
}

const getProjectFingerprint = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let projectSlug = 'supabase'
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      const hostSlug = slugify(parsed.hostname, 'supabase')
      const pathSlug = slugify(
        parsed.pathname === '/' ? '' : parsed.pathname,
        ''
      )
      projectSlug = pathSlug ? `${hostSlug}-${pathSlug}` : hostSlug
    } catch {
      projectSlug = 'supabase'
    }
  }

  const anonFingerprint = anonKey
    ? slugify(anonKey.slice(0, 8), 'anon')
    : 'anon'

  return `${projectSlug}-${anonFingerprint}`
}

export const getSupabaseAuthStorageKey = (hostname?: string | null): string => {
  const hostSlug = slugify(hostname || 'localhost', 'localhost')
  const projectFingerprint = getProjectFingerprint()

  return `sb-${hostSlug}-${projectFingerprint}-auth-token`
}
