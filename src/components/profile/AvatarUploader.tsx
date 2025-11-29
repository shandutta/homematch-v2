'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Loader2, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface AvatarUploaderProps {
  /** Callback when upload completes successfully */
  onUpload: (url: string) => void
  /** Callback to cancel/close the uploader */
  onCancel: () => void
  /** Current custom avatar URL for preview */
  currentUrl?: string | null
}

type UploadState = 'idle' | 'previewing' | 'uploading' | 'error'

/**
 * Avatar upload component with drag-and-drop, preview, and upload functionality
 */
export function AvatarUploader({
  onUpload,
  onCancel,
  currentUrl,
}: AvatarUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentUrl || null
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select a PNG, JPEG, or WebP image'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 2MB'
    }
    return null
  }

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setState('error')
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setState('previewing')
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setState('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onUpload(result.data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  const handleClearPreview = () => {
    if (previewUrl && previewUrl !== currentUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    setState('idle')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        className="hidden"
        data-testid="avatar-file-input"
      />

      {/* Upload area or preview */}
      {state === 'idle' || state === 'error' ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3',
            'rounded-xl border-2 border-dashed p-8',
            'transition-colors',
            isDragging
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-white/20 hover:border-white/30 hover:bg-white/5',
            state === 'error' && 'border-red-500/50'
          )}
          data-testid="avatar-drop-zone"
        >
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              'bg-white/5'
            )}
          >
            <Upload className="text-hm-stone-400 h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="text-hm-stone-300 text-sm font-medium">
              Drop your photo here
            </p>
            <p className="text-hm-stone-500 mt-1 text-xs">
              or click to browse (PNG, JPEG, WebP - max 2MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Preview image */}
          <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-xl">
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Avatar preview"
                fill
                className="object-cover"
                unoptimized={previewUrl.startsWith('blob:')}
              />
            )}
            {state === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Clear button */}
          {state === 'previewing' && (
            <button
              type="button"
              onClick={handleClearPreview}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={state === 'uploading'}
          className="text-hm-stone-300 border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
        >
          Cancel
        </Button>
        {state === 'previewing' && (
          <Button
            type="button"
            onClick={handleUpload}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
          >
            Upload
          </Button>
        )}
      </div>
    </div>
  )
}
