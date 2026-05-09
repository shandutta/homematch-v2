/**
 * Guards the Supabase client/server boundary policy.
 *
 * Server-only modules (server.ts, service-role-client.ts, standalone.ts,
 * actions.ts) must never be imported by files that ship to the browser
 * bundle. Browser-eligible files are:
 *   1. Anything declaring `'use client'` at the top
 *   2. The browser entry point itself (src/lib/supabase/client.ts)
 *
 * The browser entry point must additionally:
 *   - Not reference SUPABASE_SERVICE_ROLE_KEY
 *   - Not import server-only Next.js primitives (next/headers, next/cookies)
 */
// Phase 0/1 closure: P1-auth-client-consolidation

import { describe, expect, test } from '@jest/globals'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const projectRoot = process.cwd()
const sourceRoot = join(projectRoot, 'src')
const browserEntryPoint = join(projectRoot, 'src/lib/supabase/client.ts')

const ignoredDirectories = new Set(['node_modules', '.next', '.git'])
const sourceExtensions = new Set(['.ts', '.tsx'])

// Module specifiers that must never appear in browser-eligible code.
const SERVER_ONLY_IMPORT_SPECIFIERS = [
  '@/lib/supabase/server',
  '@/lib/supabase/service-role-client',
  '@/lib/supabase/standalone',
  '@/lib/supabase/actions',
  'next/headers',
]

const SERVER_ONLY_ENV_REFERENCES = ['SUPABASE_SERVICE_ROLE_KEY']

function collectSourceFiles(path: string): string[] {
  if (!existsSync(path)) return []

  const stat = statSync(path)
  if (stat.isFile()) {
    return sourceExtensions.has(path.slice(path.lastIndexOf('.'))) ? [path] : []
  }

  return readdirSync(path).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return []
    return collectSourceFiles(join(path, entry))
  })
}

function isUseClientFile(contents: string): boolean {
  // Match `'use client'` or `"use client"` directive on the first
  // non-empty / non-comment line. A simple prefix check is sufficient
  // because Next.js requires the directive at the top of the file.
  const trimmed = contents.replace(/^\uFEFF/, '').trimStart()
  return (
    trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"')
  )
}

function importsAnySpecifier(contents: string, specifiers: string[]): string[] {
  const matched: string[] = []
  for (const specifier of specifiers) {
    // Match `from '<specifier>'`, `from "<specifier>"`, `import('<specifier>')`,
    // and `require('<specifier>')`. We escape the specifier and check both
    // quote styles. Sub-path imports like `@/lib/supabase/server/foo` are
    // intentionally not matched — only the canonical module entries count.
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `(?:from|import\\(|require\\()\\s*['"]${escaped}['"]`,
    )
    if (re.test(contents)) matched.push(specifier)
  }
  return matched
}

function referencesAnyEnv(contents: string, names: string[]): string[] {
  const matched: string[] = []
  for (const name of names) {
    const re = new RegExp(`process\\.env\\.${name}\\b`)
    if (re.test(contents)) matched.push(name)
  }
  return matched
}

describe('Supabase client/server boundary policy', () => {
  test('files declaring "use client" do not import server-only Supabase modules', () => {
    const offenders = collectSourceFiles(sourceRoot)
      .map((file) => ({ file, contents: readFileSync(file, 'utf8') }))
      .filter(({ contents }) => isUseClientFile(contents))
      .flatMap(({ file, contents }) => {
        const violations = importsAnySpecifier(
          contents,
          SERVER_ONLY_IMPORT_SPECIFIERS,
        )
        return violations.length > 0
          ? [{ file: relative(projectRoot, file), violations }]
          : []
      })

    expect(offenders).toEqual([])
  })

  test('files declaring "use client" do not reference SUPABASE_SERVICE_ROLE_KEY', () => {
    const offenders = collectSourceFiles(sourceRoot)
      .map((file) => ({ file, contents: readFileSync(file, 'utf8') }))
      .filter(({ contents }) => isUseClientFile(contents))
      .flatMap(({ file, contents }) => {
        const violations = referencesAnyEnv(contents, SERVER_ONLY_ENV_REFERENCES)
        return violations.length > 0
          ? [{ file: relative(projectRoot, file), violations }]
          : []
      })

    expect(offenders).toEqual([])
  })

  test('browser entry point src/lib/supabase/client.ts only uses anon-safe surfaces', () => {
    expect(existsSync(browserEntryPoint)).toBe(true)
    const contents = readFileSync(browserEntryPoint, 'utf8')

    expect(importsAnySpecifier(contents, SERVER_ONLY_IMPORT_SPECIFIERS)).toEqual([])
    expect(referencesAnyEnv(contents, SERVER_ONLY_ENV_REFERENCES)).toEqual([])

    // Sanity: the browser client should still pull from @supabase/ssr's
    // browser factory, so the file remains the canonical anon entrypoint.
    expect(contents).toContain("from '@supabase/ssr'")
    expect(contents).toContain('createBrowserClient')
  })
})
