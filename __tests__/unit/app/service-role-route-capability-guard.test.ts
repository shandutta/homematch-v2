/**
 * @jest-environment node
 */
// Phase 0/1 closure: D1-service-role-rbac

// Phase 0/1 closure: D1-service-role-rbac
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const appDir = join(process.cwd(), 'src/app')

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) return listSourceFiles(fullPath)
    if (/\.(ts|tsx)$/.test(entry)) return [fullPath]
    return []
  })
}

describe('service-role route capability guard', () => {
  test('requires production app routes importing getServiceRoleClient to carry explicit capability rationale', () => {
    const routesUsingServiceRole = listSourceFiles(appDir).filter((filePath) =>
      readFileSync(filePath, 'utf8').includes('getServiceRoleClient')
    )

    expect(
      routesUsingServiceRole
        .map((filePath) => filePath.replace(process.cwd(), '.'))
        .sort()
    ).toEqual([
      './src/app/api/couples/disputed/route.ts',
      './src/app/api/users/search/route.ts',
      './src/app/api/webhooks/clerk/route.ts',
      './src/app/invite/[token]/actions.ts',
      './src/app/invite/[token]/page.tsx',
    ])

    for (const filePath of routesUsingServiceRole) {
      const source = readFileSync(filePath, 'utf8')
      expect(source).toContain('@service-role-capability:')
      expect(source).toContain('TODO(D1 follow-up): replace with')
    }
  })
})
