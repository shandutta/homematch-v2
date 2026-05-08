/**
 * @jest-environment node
 */

import { describe, expect, test } from '@jest/globals'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const projectRoot = process.cwd()
const serverModulePath = join(projectRoot, 'src/lib/supabase/server.ts')
const serviceRoleClientPath = join(
  projectRoot,
  'src/lib/supabase/service-role-client.ts'
)
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
    return sourceExtensions.has(path.slice(path.lastIndexOf('.')))
      ? [path]
      : []
  }

  return readdirSync(path).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return []
    return collectSourceFiles(join(path, entry))
  })
}

function parseTypeUnionMembers(source: string): string[] {
  const match = source.match(
    /export type ApprovedServiceRoleCapability =([\s\S]*?)\n\n/
  )
  if (!match) return []
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
}

function parseAllowlistMembers(source: string): string[] {
  const match = source.match(
    /APPROVED_SERVICE_ROLE_CAPABILITIES = new Set<ApprovedServiceRoleCapability>\(\[([\s\S]*?)\]\)/
  )
  if (!match) return []
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
}

describe('service-role capability boundary guard', () => {
  test('runtime allowlist members match the static ApprovedServiceRoleCapability union', () => {
    const source = readFileSync(serverModulePath, 'utf8')
    const unionMembers = parseTypeUnionMembers(source).sort()
    const allowlistMembers = parseAllowlistMembers(source).sort()

    expect(unionMembers.length).toBeGreaterThan(0)
    expect(allowlistMembers).toEqual(unionMembers)
  })

  test('only the service-role-client wrapper imports createServiceClient from @/lib/supabase/server', () => {
    const offenders = productionRoots
      .flatMap(collectSourceFiles)
      .filter((file) => file !== serviceRoleClientPath)
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        if (!source.includes("from '@/lib/supabase/server'")) return false
        const importMatches = source.matchAll(
          /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*'@\/lib\/supabase\/server'/g
        )
        for (const match of importMatches) {
          const named = match[1]
            .split(',')
            .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
          if (named.includes('createServiceClient')) return true
        }
        return false
      })
      .map((file) => relative(projectRoot, file))

    expect(offenders).toEqual([])
  })
})
