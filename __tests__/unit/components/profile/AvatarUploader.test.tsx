import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvatarUploader } from '@/components/profile/AvatarUploader'

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn()
const mockRevokeObjectURL = jest.fn()
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('AvatarUploader Component', () => {
  const mockOnUpload = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:test-preview-url')
  })

  describe('Rendering', () => {
    test('renders upload area/drop zone', () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)
      expect(screen.getByTestId('avatar-drop-zone')).toBeInTheDocument()
    })

    test('shows drag-drop instructions', () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)
      expect(screen.getByText('Drop your photo here')).toBeInTheDocument()
      expect(
        screen.getByText(/or click to browse.*PNG, JPEG, WebP.*max 2MB/i)
      ).toBeInTheDocument()
    })

    test('renders hidden file input', () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)
      const fileInput = screen.getByTestId('avatar-file-input')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveClass('hidden')
    })

    test('renders cancel button', () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('File Validation', () => {
    test('accepts valid PNG image files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })
    })

    test('accepts valid JPEG image files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })
    })

    test('accepts valid WebP image files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.webp', { type: 'image/webp' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })
    })

    test('rejects files over 2MB', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      // Create a file larger than 2MB
      const largeContent = new ArrayBuffer(3 * 1024 * 1024) // 3MB
      const file = new File([largeContent], 'large.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(
          screen.getByText('File size must be less than 2MB')
        ).toBeInTheDocument()
      })
    })

    test('rejects non-image files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'document.pdf', {
        type: 'application/pdf',
      })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(
          screen.getByText('Please select a PNG, JPEG, or WebP image')
        ).toBeInTheDocument()
      })
    })

    test('rejects GIF files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'animation.gif', { type: 'image/gif' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(
          screen.getByText('Please select a PNG, JPEG, or WebP image')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Preview', () => {
    test('shows preview after file selection', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        // Check that createObjectURL was called for preview
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file)
      })
    })

    test('shows upload button after preview', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })
    })

    test('hides drop zone when previewing', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(
          screen.queryByText('Drop your photo here')
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('Upload Flow', () => {
    test('calls onUpload with URL on success', async () => {
      const mockUrl = 'https://storage.example.com/avatar.png'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { url: mockUrl } }),
      } as Response)

      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload'))

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(mockUrl)
      })
    })

    test('sends POST request to /api/users/avatar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { url: 'https://example.com/avatar.png' } }),
      } as Response)

      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/users/avatar', {
          method: 'POST',
          body: expect.any(FormData),
        })
      })
    })

    test('shows error state on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' }),
      } as Response)

      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload'))

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
      })
    })

    test('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload'))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel', () => {
    test('calls onCancel when cancel button clicked', () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    test('disables cancel button during upload', async () => {
      // Create a promise that doesn't resolve immediately
      let resolveUpload: (value: Response) => void
      const uploadPromise = new Promise<Response>((resolve) => {
        resolveUpload = resolve
      })
      mockFetch.mockReturnValueOnce(uploadPromise)

      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const fileInput = screen.getByTestId('avatar-file-input')

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Upload'))

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeDisabled()
      })

      // Clean up by resolving the promise
      resolveUpload!({
        ok: true,
        json: async () => ({ data: { url: 'https://example.com/avatar.png' } }),
      } as Response)
    })
  })

  describe('Drag and Drop', () => {
    test('accepts dropped files', async () => {
      render(<AvatarUploader onUpload={mockOnUpload} onCancel={mockOnCancel} />)

      const file = new File(['test'], 'avatar.png', { type: 'image/png' })
      const dropZone = screen.getByTestId('avatar-drop-zone')

      // Simulate drag and drop
      fireEvent.dragOver(dropZone)
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      })

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(file)
      })
    })
  })
})
