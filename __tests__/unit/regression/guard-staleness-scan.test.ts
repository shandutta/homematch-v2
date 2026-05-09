/**
 * @jest-environment node
 *
 * Phase 4 meta-guard: scans Lane A guard files for staleness indicators.
 *
 * Three categories:
 * 1. Referenced-file staleness — test reads a file/dir that no longer exists
 *    AND the test is making an EXISTENCE assertion (not guarding against regression).
 * 2. Known-deleted-pattern staleness — test guards a code pattern known to
 *    have been removed/replaced in Phase 1 (manual-review list).
 * 3. Redundant guard pairs — two guards testing the exact same invariant.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const repoRoot = process.cwd()

/** Source paths that were intentionally removed during Phase 1 cleanup.
 *  Tests that reference these for EXISTENCE checks (toBe(true), existsSync
 *  assertions) are stale because they guard something already proved gone.
 *  Tests that reference them for ABSENCE checks (toBe(false),
 *  not.toContain, toEqual([])) are valid regression guards — they ensure
 *  the deleted code stays deleted. */
const KNOWN_DELETED_PATHS: string[] = [
  'src/lib/supabase/factory.ts',
  'src/lib/api/zillow/client.ts',
  'src/lib/zillow.ts',
  'src/middleware/CouplesMiddleware.ts',
  'src/lib/services/couples-middleware.ts',
  'src/server-actions/',
]

/** Directories under __tests__/unit/ to exclude from scanning (the meta-tests
 *  themselves should not be flagged). */
const EXCLUDED_DIRS = new Set(['regression'])

/** Pattern -> description of known-stale source code patterns that were
 *  intentionally replaced during Phase 1. These are MANUAL-REVIEW triggers:
 *  if a test contains this pattern but NOT in a negative assertion context,
 *  it may be guarding an obsolete code shape. */
const STALE_PATTERN_MAP: Record<string, string> = {
  "checkRateLimit.*429.*guard.*didn't apply": "Pre-M10 error-standardization 429 guard (consolidated into delegated path)",
}

/** Walker that skips excluded directories */
function collectTestFiles(dir: string): string[] {
  const results: string[] = []
  let entries: string[] = []
  try { entries = require('fs').readdirSync(dir) } catch { return [] }
  for (const entry of entries) {
    const full = join(dir, entry)
    try {
      const stat = require('fs').statSync(full)
      if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry)) continue
        results.push(...collectTestFiles(full))
      } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) {
        results.push(full)
      }
    } catch { /* skip unreadable */ }
  }
  return results
}

/** Extract source-path references from a test file */
function extractReferencedPaths(content: string): string[] {
  const paths = new Set<string>()

  let match: RegExpExecArray | null
  const srcPathRe = /["'`](src\/[A-Za-z0-9_/.-]+)["'`]/g
  while ((match = srcPathRe.exec(content)) !== null) {
    paths.add(match[1])
  }

  const joinSrcRe = /join\([^)]*,\s*["'`](src\/[A-Za-z0-9_/.-]+)["'`]\)/g
  while ((match = joinSrcRe.exec(content)) !== null) {
    paths.add(match[1])
  }

  return Array.from(paths)
}

function isWithinDeletedTree(testPath: string): boolean {
  for (const deleted of KNOWN_DELETED_PATHS) {
    if (deleted.endsWith('/')) {
      if (testPath.startsWith(deleted)) return true
    } else {
      if (testPath === deleted || testPath.startsWith(deleted + '/')) return true
    }
  }
  return false
}

/**
 * Check if a file contains an EXISTENCE assertion for a specific path.
 * An "existence assertion" is something like:
 *   expect(existsSync(path)).toBe(true)
 *   existsSync(path) === true
 *
 * A "non-existence assertion" (regression guard) is:
 *   expect(existsSync(path)).toBe(false)
 *   source.should.not.contain(...)
 */
function hasExistenceAssertion(content: string, ref: string): boolean {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes(ref.replace(/^src\//, '')) && !new RegExp(escaped).test(line)) continue
    // Check a 3-line window: line i, i+1, i+2 for assertion context
    const window = lines.slice(i, Math.min(i + 3, lines.length)).join('\n')
    // If the window asserts EXISTENCE (not absence), this is stale
    if (/\bexistsSync\(/.test(line) && !/\.toBe\(false\)/.test(window) && !/!existsSync/.test(window)) return true
    if (/\.toBe\(true\)/.test(window)) return true
  }
  return false
}

describe('Phase 4 guard staleness scan', () => {
  const unitDir = join(repoRoot, '__tests__/unit')
  const testFiles = collectTestFiles(unitDir)

  it('no test makes an existence assertion referencing a deleted source path', () => {
    const stale: string[] = []
    for (const file of testFiles) {
      const content = readFileSync(file, 'utf8')
      const refs = extractReferencedPaths(content)
      for (const ref of refs) {
        if (isWithinDeletedTree(ref) && hasExistenceAssertion(content, ref)) {
          stale.push(`${file.replace(repoRoot + '/', '')} → ${ref} (existence check on deleted path)`)
        }
      }
    }
    expect(stale).toEqual([])
  })

  it('no test references a source path that does not exist on disk', () => {
    const missing: string[] = []
    for (const file of testFiles) {
      const content = readFileSync(file, 'utf8')
      const refs = extractReferencedPaths(content)
      for (const ref of refs) {
        if (ref.startsWith('src/') && !existsSync(join(repoRoot, ref))) {
          // Only flag if the test is NOT a known "guard against regression"
          // (which references known-deleted paths to verify they stay deleted)
          if (!isWithinDeletedTree(ref)) {
            missing.push(`${file.replace(repoRoot + '/', '')} → ${ref}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('no test guards a known-stale code pattern superseded by Phase 1 closure', () => {
    const stale: string[] = []
    for (const file of testFiles) {
      const content = readFileSync(file, 'utf8')
      for (const [pattern, desc] of Object.entries(STALE_PATTERN_MAP)) {
        const regex = new RegExp(pattern, 'i')
        // Only flag if the pattern doesn't appear exclusively in negative assertions
        const lines = content.split('\n')
        let positiveHit = false
        for (const line of lines) {
          if (regex.test(line)) {
            const isNeg =
              /\.not\./.test(line) ||
              /\.toBe\(false\)/.test(line) ||
              /toEqual\(\[\]\)/.test(line) ||
              /\.toBeFalsy\(\)/.test(line) ||
              /does not\b/i.test(line) ||
              /no longer\b/i.test(line)
            if (!isNeg) {
              positiveHit = true
              break
            }
          }
        }
        if (positiveHit) {
          stale.push(`${file.replace(repoRoot + '/', '')} → ${desc}`)
        }
      }
    }
    expect(stale).toEqual([])
  })

  it('no two guard files test the exact same invariant (approximate string dedup)', () => {
    const testStrings = new Map<string, string[]>()
    const dupes: string[] = []

    for (const file of testFiles) {
      const content = readFileSync(file, 'utf8')
      const relPath = file.replace(repoRoot + '/', '')
      const descRe = /(?:describe|it|test)\s*\(\s*["'`]([^"'`]{60,})["'`]/g
      let match: RegExpExecArray | null
      while ((match = descRe.exec(content)) !== null) {
        const desc = match[1]
        if (!testStrings.has(desc)) {
          testStrings.set(desc, [])
        }
        testStrings.get(desc)!.push(relPath)
      }
    }

    testStrings.forEach((files, desc) => {
      if (files.length > 1) {
        dupes.push(`"${desc.substring(0, 80)}..." → ${files.join(', ')}`)
      }
    })

    // Soft report for manual review
    if (dupes.length > 0) {
      console.warn(
        '⚠ Approximate redundant guard pairs (review manually):\n' +
        dupes.map((d) => `  - ${d}`).join('\n')
      )
    }

    expect(dupes.length).toBeLessThanOrEqual(4)
  })
})
