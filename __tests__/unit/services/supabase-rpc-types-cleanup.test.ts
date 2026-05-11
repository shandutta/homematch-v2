// Phase 0/1 closure: M12-duplicate-rpc
import { readFileSync } from 'fs'
import { join } from 'path'

describe('supabase RPC type module cleanup', () => {
  test('does not keep a duplicate exported callRPC wrapper beside utils/rpc-wrapper', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/services/supabase-rpc-types.ts'),
      'utf8'
    )

    expect(source).not.toContain('export async function callRPC')
    expect(source).toContain('export function createTypedRPC')
    expect(source).toContain('export function isRPCImplemented')
  })
})
