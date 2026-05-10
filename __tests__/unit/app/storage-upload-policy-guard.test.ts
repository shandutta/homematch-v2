/**
 * @jest-environment node
 *
 * Static guard for storage upload boundaries (P1).
 *
 * Locks down three policy lines for any route that writes user-controlled
 * bytes into Supabase Storage:
 *   - Auth boundary: `requireUserFromRequest` + `rateLimit(..., 'strict')`.
 *   - Size/type boundary: declared `MAX_FILE_SIZE` + `ALLOWED_MIME_TYPES`
 *     constants validated before `.upload(...)`, plus magic-byte sniffing
 *     so a forged `Content-Type` cannot smuggle non-image bytes.
 *   - No-public-secret boundary: storage paths are scoped to `user.id`
 *     with a server-derived extension - never raw `formData` fields,
 *     bearer tokens, or anon/service-role keys.
 *
 * If a new upload route is added, this test fails and forces an explicit
 * audit instead of silently widening the upload surface.
 */
// Phase 0/1 closure: P1-security-definer-paths

// Phase 0/1 closure: P1-security-definer-paths
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const repoRoot = process.cwd()
const appDir = join(repoRoot, 'src/app')

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return listSourceFiles(fullPath)
    if (/\.(ts|tsx)$/.test(entry)) return [fullPath]
    return []
  })

const STORAGE_WRITE_PATTERNS: RegExp[] = [
  /\.storage\s*\.\s*from\s*\(/,
  /\brequest\.formData\s*\(/,
  /\bcreateSignedUploadUrl\s*\(/,
]

const findStorageWriteRoutes = (): string[] =>
  listSourceFiles(appDir).filter((filePath) => {
    const source = readFileSync(filePath, 'utf8')
    return STORAGE_WRITE_PATTERNS.some((pattern) => pattern.test(source))
  })

describe('storage upload policy guard', () => {
  test('only the avatar route exercises Supabase Storage writes or multipart parsing', () => {
    const routes = findStorageWriteRoutes()
      .map((filePath) => relative(repoRoot, filePath).replace(/\\/g, '/'))
      .sort()

    expect(routes).toEqual(['src/app/api/users/avatar/route.ts'])
  })

  describe('src/app/api/users/avatar/route.ts boundaries', () => {
    const avatarSource = readFileSync(
      join(appDir, 'api/users/avatar/route.ts'),
      'utf8'
    )

    test('enforces the auth boundary on every storage-touching method', () => {
      expect(avatarSource).toContain("from '@/lib/api/auth'")
      expect(avatarSource).toMatch(/requireUserFromRequest\s*\(/)
      const requireCalls = avatarSource.match(/requireUserFromRequest\s*\(/g)
      // POST and DELETE both gate on auth before touching storage.
      expect(requireCalls?.length ?? 0).toBeGreaterThanOrEqual(2)
    })

    test('applies strict-tier rate limiting before parsing multipart bodies', () => {
      expect(avatarSource).toContain("from '@/lib/middleware/rateLimiter'")
      expect(avatarSource).toMatch(
        /rateLimit\s*\(\s*request\s*,\s*'strict'\s*\)/
      )
      const formDataIndex = avatarSource.indexOf('request.formData(')
      const strictRateLimitIndex = avatarSource.search(
        /rateLimit\s*\(\s*request\s*,\s*'strict'\s*\)/
      )
      expect(strictRateLimitIndex).toBeGreaterThanOrEqual(0)
      expect(strictRateLimitIndex).toBeLessThan(formDataIndex)
    })

    test('declares size + type constants and validates them before .upload(...)', () => {
      expect(avatarSource).toMatch(
        /const\s+MAX_FILE_SIZE\s*=\s*[^\n]*1024\s*\*\s*1024/
      )
      expect(avatarSource).toMatch(
        /const\s+ALLOWED_MIME_TYPES\s*=\s*\[[^\]]*'image\/png'[^\]]*'image\/jpeg'[^\]]*'image\/webp'[^\]]*\]/
      )

      expect(avatarSource).toMatch(
        /ALLOWED_MIME_TYPES\.includes\s*\(\s*file\.type\s*\)/
      )
      expect(avatarSource).toMatch(/file\.size\s*>\s*MAX_FILE_SIZE/)

      const sizeCheckIndex = avatarSource.search(
        /file\.size\s*>\s*MAX_FILE_SIZE/
      )
      const typeCheckIndex = avatarSource.search(
        /ALLOWED_MIME_TYPES\.includes\s*\(\s*file\.type\s*\)/
      )
      const uploadCallIndex = avatarSource.search(/\.upload\s*\(/)
      expect(typeCheckIndex).toBeGreaterThanOrEqual(0)
      expect(sizeCheckIndex).toBeGreaterThanOrEqual(0)
      expect(uploadCallIndex).toBeGreaterThanOrEqual(0)
      expect(typeCheckIndex).toBeLessThan(uploadCallIndex)
      expect(sizeCheckIndex).toBeLessThan(uploadCallIndex)
    })

    test('rejects MIME spoofing by validating magic bytes before .upload(...)', () => {
      expect(avatarSource).toMatch(/function\s+validateMagicBytes\s*\(/)
      const magicCheckIndex = avatarSource.search(
        /if\s*\(\s*!\s*validateMagicBytes\s*\(/
      )
      const uploadCallIndex = avatarSource.search(/\.upload\s*\(/)
      expect(magicCheckIndex).toBeGreaterThanOrEqual(0)
      expect(magicCheckIndex).toBeLessThan(uploadCallIndex)
    })

    test('scopes storage paths to user.id with a server-derived extension only', () => {
      // Storage path must be `${user.id}/avatar.${ext}`. Locking down the
      // exact template prevents future drift toward path components sourced
      // from formData (e.g., file.name) which would enable traversal /
      // collision attacks across users.
      expect(avatarSource).toMatch(
        /const\s+filePath\s*=\s*`\$\{user\.id\}\/avatar\.\$\{ext\}`/
      )

      // ext must be derived from the server-validated MIME type, never from
      // file.name or any client-supplied path component.
      expect(avatarSource).toMatch(
        /const\s+ext\s*=[\s\S]*?file\.type\.split\('\/'\)\[1\]/
      )
      expect(avatarSource).not.toMatch(/file\.name/)
      expect(avatarSource).not.toMatch(/formData\.get\(\s*['"]path['"]/)
    })

    test('never bakes anon/service-role keys or bearer tokens into storage paths', () => {
      // The path/upload code must not reach for the kinds of secrets that
      // would let any caller infer or spoof a privileged storage location.
      const uploadBlock = avatarSource.slice(
        avatarSource.indexOf('const filePath'),
        avatarSource.indexOf('.getPublicUrl(')
      )
      expect(uploadBlock).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
      expect(uploadBlock).not.toMatch(/SUPABASE_ANON_KEY/)
      expect(uploadBlock).not.toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
      expect(uploadBlock).not.toMatch(/Bearer\s+/i)
      expect(uploadBlock).not.toMatch(/process\.env\./)
    })
  })
})
