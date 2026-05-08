import { describe, expect, test } from '@jest/globals'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const projectRoot = process.cwd()
const deprecatedFactoryPath = join(projectRoot, 'src/lib/supabase/factory.ts')
const productionRoots = [join(projectRoot, 'src'), join(projectRoot, 'middleware.ts')]

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

describe('Supabase client factory consolidation guard', () => {
  test('keeps the deprecated unified factory module removed', () => {
    expect(existsSync(deprecatedFactoryPath)).toBe(false)
  })

  test('keeps production code on the canonical Supabase client modules', () => {
    const offenders = productionRoots
      .flatMap(collectSourceFiles)
      .filter((file) => readFileSync(file, 'utf8').includes('@/lib/supabase/factory'))
      .map((file) => relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
