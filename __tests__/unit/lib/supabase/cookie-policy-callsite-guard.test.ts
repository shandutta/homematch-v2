/**
 * Static guard: every place in production code that writes a Supabase session
 * cookie must route options through buildSupabaseSessionCookieOptions, and no
 * source file may explicitly write `httpOnly: false` on a Supabase auth cookie.
 *
 * The positive policy is enforced at runtime by cookie-options.ts; this guard
 * exists so a future refactor that reintroduces a manual cookies.set() does
 * not silently bypass the helper.
 */
import { describe, expect, test } from '@jest/globals'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const projectRoot = process.cwd()
const productionRoots = [
  join(projectRoot, 'src'),
  join(projectRoot, 'middleware.ts'),
]

const ignoredDirectories = new Set(['node_modules', '.next', '.git'])
const sourceExtensions = new Set(['.ts', '.tsx'])

const collectSourceFiles = (path: string): string[] => {
  if (!existsSync(path)) return []
  const stat = statSync(path)
  if (stat.isFile()) {
    return sourceExtensions.has(path.slice(path.lastIndexOf('.'))) ? [path] : []
  }
  return readdirSync(path).flatMap((entry) =>
    ignoredDirectories.has(entry) ? [] : collectSourceFiles(join(path, entry))
  )
}

const productionFiles = productionRoots.flatMap(collectSourceFiles)

describe('Supabase session cookie call-site guard', () => {
  test('no production file writes httpOnly: false', () => {
    const offenders = productionFiles
      .filter((file) => /httpOnly\s*:\s*false/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(projectRoot, file))

    expect(offenders).toEqual([])
  })

  test('every file that writes session cookies routes through buildSupabaseSessionCookieOptions', () => {
    // Any file that calls `.cookies.set(` or `cookieStore.set(` is a candidate
    // for writing the Supabase session cookie. Such files must reference the
    // helper so the policy (httpOnly + secure-in-prod + sameSite=lax) applies.
    const sessionCookieWriteRe = /(?:\.cookies\.set\(|cookieStore\.set\()/
    const helperRe = /buildSupabaseSessionCookieOptions/

    const offenders = productionFiles
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        if (!sessionCookieWriteRe.test(source)) return false
        return !helperRe.test(source)
      })
      .map((file) => relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
