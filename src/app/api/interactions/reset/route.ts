import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

    // Rate limiting - use stricter rate limit for destructive operations
    const rateLimitResult = await apiRateLimiter.check(user.id)
    if (!rateLimitResult.success) {
      return ApiErrorHandler.badRequest(
        'Too many requests. Please try again later.'
      )
    }

    // Delete all interactions for this user
    // Add timeout to prevent hanging
    const deletePromise = supabase
      .from('user_property_interactions')
      .delete()
      .eq('user_id', user.id)
      .select('id')

    type DeleteResult = Awaited<typeof deletePromise>

    const timeoutPromise: Promise<DeleteResult> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Reset interactions timed out')), 10000)
    )

    let deletedRows: DeleteResult['data']
    let error: DeleteResult['error']
    try {
      const result = await Promise.race([deletePromise, timeoutPromise])
      deletedRows = result.data
      error = result.error
    } catch (e) {
      console.error('Reset interactions timed out or failed:', e)
      return ApiErrorHandler.serverError(
        'Failed to reset interactions (timeout)',
        e
      )
    }

    if (error) {
      console.error('[Interactions RESET] Error:', error)
      return ApiErrorHandler.serverError('Failed to reset interactions', error)
    }

    return ApiErrorHandler.success({
      deleted: true,
      count: deletedRows?.length ?? 0,
    })
  } catch (err) {
    console.error('[Interactions RESET] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to reset interactions', err)
  }
}
