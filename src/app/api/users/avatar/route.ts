import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { rateLimit } from '@/lib/middleware/rateLimiter'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const BUCKET_NAME = 'avatars'

// Magic bytes for file type validation
// These are the first bytes that identify each image format
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], // PNG header
  'image/jpeg': [
    [0xff, 0xd8, 0xff, 0xe0], // JFIF
    [0xff, 0xd8, 0xff, 0xe1], // EXIF
    [0xff, 0xd8, 0xff, 0xe8], // SPIFF
    [0xff, 0xd8, 0xff, 0xdb], // Raw JPEG
    [0xff, 0xd8, 0xff, 0xee], // JPEG with Adobe metadata
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP uses RIFF container)
}

/**
 * Validate file magic bytes match claimed MIME type
 * Prevents MIME type spoofing attacks
 */
function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer)
  const validPatterns = MAGIC_BYTES[mimeType]

  if (!validPatterns) return false

  return validPatterns.some((pattern) => {
    if (bytes.length < pattern.length) return false
    return pattern.every((byte, index) => bytes[index] === byte)
  })
}

/**
 * POST /api/users/avatar
 * Upload a custom avatar image
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting (strict tier for file uploads)
  const rateLimitResponse = await rateLimit(request, 'strict')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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

    // Get file buffer for magic byte validation
    const arrayBuffer = await file.arrayBuffer()

    // Validate magic bytes match claimed MIME type (prevents MIME spoofing)
    if (!validateMagicBytes(arrayBuffer, file.type)) {
      return ApiErrorHandler.badRequest(
        'File content does not match declared file type'
      )
    }

    // Get file extension from mime type
    const ext =
      file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filePath = `${user.id}/avatar.${ext}`

    // UPLOAD FIRST, then delete old files (fixes race condition)
    // This ensures we have the new file before removing the old one
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

    // Delete any OTHER avatar files for this user (different extensions)
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id)

    if (existingFiles && existingFiles.length > 0) {
      // Get the filename we just uploaded
      const uploadedFilename = `avatar.${ext}`
      // Find files to delete (other avatars with different extensions)
      const filesToDelete = existingFiles
        .filter((f) => f.name !== uploadedFilename)
        .map((f) => `${user.id}/${f.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete)
      }
    }

    // Get public URL with cache busting
    const timestamp = Date.now()
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)

    // Append cache buster to URL
    const cacheBustedUrl = `${publicUrl}?t=${timestamp}`

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
            value: cacheBustedUrl,
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

    return ApiErrorHandler.success({ url: cacheBustedUrl })
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
  // Apply rate limiting
  const rateLimitResponse = await rateLimit(request, 'standard')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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

    // Clear avatar from preferences FIRST
    // This ensures users don't see a broken avatar URL
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return ApiErrorHandler.notFound('User profile not found')
    }

    const currentPreferences = (profile.preferences || {}) as Record<
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

    // Then delete all avatar files for this user from storage
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id)

    if (listError) {
      // Log but don't fail - preferences already cleared
      console.warn('Failed to list avatar files for cleanup:', listError)
    } else if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)

      if (deleteError) {
        // Log but don't fail - preferences already cleared
        console.warn('Failed to delete avatar files from storage:', deleteError)
      }
    }

    return ApiErrorHandler.success({ deleted: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return ApiErrorHandler.serverError('Failed to delete avatar')
  }
}
