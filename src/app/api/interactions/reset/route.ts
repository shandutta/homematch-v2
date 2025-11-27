import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user

    console.log('[Interactions RESET] Auth result:', {
      userId: user?.id,
      error: authError?.message,
    })

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

    console.log(
      '[Interactions RESET] Deleting all interactions for user:',
      user.id
    )

    // Delete all interactions for this user
    const { data: deletedRows, error } = await supabase
      .from('user_property_interactions')
      .delete()
      .eq('user_id', user.id)
      .select('id')

    console.log('[Interactions RESET] Result:', {
      deletedCount: deletedRows?.length ?? 0,
      error: error?.message,
    })

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
