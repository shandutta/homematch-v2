// Phase 0/1 closure: P1-auth-client-consolidation
import { describe, expect, test } from '@jest/globals'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, sep } from 'path'

const projectRoot = process.cwd()
const productionRoots = [
  join(projectRoot, 'src'),
  join(projectRoot, 'middleware.ts'),
]

const ignoredDirectories = new Set(['node_modules', '.next', '.git'])
const sourceExtensions = new Set(['.ts', '.tsx'])

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

function toPosixRelative(absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(sep).join('/')
}

const SSR_FACTORY_IMPORT = /from\s+['"]@supabase\/ssr['"]/
const SSR_ALLOWED_FILES: ReadonlySet<string> = new Set([
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'middleware.ts',
])

const SUPABASE_JS_IMPORT_GROUP =
  /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]@supabase\/supabase-js['"]/g
const SUPABASE_JS_VALUE_ALLOWED_FILES: ReadonlySet<string> = new Set([
  'src/lib/supabase/standalone.ts',
  'src/lib/data/loader.ts',
  'src/lib/services/base.ts',
])

function importsCreateClientAsValue(source: string): boolean {
  for (const match of source.matchAll(SUPABASE_JS_IMPORT_GROUP)) {
    const isTypeOnly = Boolean(match[1])
    if (isTypeOnly) continue

    const bindings = match[2]
      .split(',')
      .map((binding) => binding.trim())
      .filter((binding) => binding.length > 0)

    for (const binding of bindings) {
      if (/^createClient(\s|$)/.test(binding)) {
        return true
      }
    }
  }
  return false
}

describe('Auth client singleton guard', () => {
  test('@supabase/ssr factories are constructed only in the canonical client modules', () => {
    const offenders = productionRoots
      .flatMap(collectSourceFiles)
      .filter((file) => SSR_FACTORY_IMPORT.test(readFileSync(file, 'utf8')))
      .map(toPosixRelative)
      .filter((relativePath) => !SSR_ALLOWED_FILES.has(relativePath))
      .sort()

    expect(offenders).toEqual([])
  })

  test('@supabase/supabase-js createClient value imports stay within indexed exceptions', () => {
    const offenders = productionRoots
      .flatMap(collectSourceFiles)
      .filter((file) => importsCreateClientAsValue(readFileSync(file, 'utf8')))
      .map(toPosixRelative)
      .filter(
        (relativePath) => !SUPABASE_JS_VALUE_ALLOWED_FILES.has(relativePath)
      )
      .sort()

    expect(offenders).toEqual([])
  })

  test('every indexed exception still imports the module it is exempted for', () => {
    for (const relativePath of SSR_ALLOWED_FILES) {
      const fullPath = join(projectRoot, ...relativePath.split('/'))
      expect(existsSync(fullPath)).toBe(true)
      const source = readFileSync(fullPath, 'utf8')
      expect(SSR_FACTORY_IMPORT.test(source)).toBe(true)
    }

    for (const relativePath of SUPABASE_JS_VALUE_ALLOWED_FILES) {
      const fullPath = join(projectRoot, ...relativePath.split('/'))
      expect(existsSync(fullPath)).toBe(true)
      const source = readFileSync(fullPath, 'utf8')
      expect(importsCreateClientAsValue(source)).toBe(true)
    }
  })
})
