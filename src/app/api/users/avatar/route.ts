import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { ApiErrorHandler } from '@/lib/api/errors'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const BUCKET_NAME = 'avatars'

/**
 * POST /api/users/avatar
 * Upload a custom avatar image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return ApiErrorHandler.badRequest('No file provided')
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return ApiErrorHandler.badRequest(
        'Invalid file type. Allowed types: PNG, JPEG, WebP'
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return ApiErrorHandler.badRequest('File size must be less than 2MB')
    }

    // Get file extension from mime type
    const ext =
      file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filePath = `${user.id}/avatar.${ext}`

    // Delete any existing avatar files for this user
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
      await supabase.storage.from(BUCKET_NAME).remove(filesToDelete)
    }

    // Upload new avatar
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return ApiErrorHandler.serverError('Failed to upload avatar')
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    // Update user preferences with custom avatar
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const currentPreferences = (profile?.preferences || {}) as Record<
      string,
      unknown
    >

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        preferences: {
          ...currentPreferences,
          avatar: {
            type: 'custom',
            value: publicUrl,
          },
        },
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      // Try to clean up uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([filePath])
      return ApiErrorHandler.serverError('Failed to update profile')
    }

    return ApiErrorHandler.success({ url: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return ApiErrorHandler.serverError('Failed to upload avatar')
  }
}

/**
 * DELETE /api/users/avatar
 * Remove custom avatar from storage and preferences
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

    // Delete all avatar files for this user
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
      await supabase.storage.from(BUCKET_NAME).remove(filesToDelete)
    }

    // Clear avatar from preferences
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const currentPreferences = (profile?.preferences || {}) as Record<
      string,
      unknown
    >

    // Remove avatar from preferences

    const { avatar: _, ...preferencesWithoutAvatar } = currentPreferences

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        preferences: preferencesWithoutAvatar,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return ApiErrorHandler.serverError('Failed to update profile')
    }

    return ApiErrorHandler.success({ deleted: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return ApiErrorHandler.serverError('Failed to delete avatar')
  }
}
