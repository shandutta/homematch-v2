import { jest, describe, test, expect, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AvatarPicker } from '@/components/profile/AvatarPicker'
import { AvatarData, PRESET_AVATARS } from '@/lib/constants/avatars'

// Mock the AvatarUploader component
jest.mock('@/components/profile/AvatarUploader', () => ({
  AvatarUploader: ({
    onUpload,
    onCancel,
  }: {
    onUpload: (url: string) => void
    onCancel: () => void
  }) => (
    <div data-testid="avatar-uploader">
      <button onClick={() => onUpload('https://example.com/avatar.png')}>
        Mock Upload
      </button>
      <button onClick={onCancel}>Mock Cancel</button>
    </div>
  ),
}))

describe('AvatarPicker Component', () => {
  const mockOnClose = jest.fn()
  const mockOnSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Dialog Behavior', () => {
    test('renders dialog content when isOpen=true', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      expect(screen.getByText('Choose your avatar')).toBeInTheDocument()
    })

    test('does not render dialog content when isOpen=false', () => {
      render(
        <AvatarPicker
          isOpen={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      expect(screen.queryByText('Choose your avatar')).not.toBeInTheDocument()
    })

    test('calls onClose when cancel clicked', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      fireEvent.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Preset Selection', () => {
    test('renders all 10 preset avatars', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      const presetButtons = screen.getAllByRole('button', {
        name: /bear|cat|dog|fox|koala|owl|panda|penguin|rabbit|sloth/i,
      })
      expect(presetButtons).toHaveLength(10)
    })

    test('highlights currently selected preset', () => {
      const currentAvatar: AvatarData = { type: 'preset', value: 'fox' }
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          currentAvatar={currentAvatar}
        />
      )
      const foxButton = screen.getByRole('button', { name: /fox/i })
      expect(foxButton).toHaveClass('ring-2', 'ring-amber-500')
    })

    test('updates selection on preset click', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      const catButton = screen.getByRole('button', { name: /cat/i })
      fireEvent.click(catButton)
      // After clicking, the button should have the selected styles
      expect(catButton).toHaveClass('ring-2', 'ring-amber-500')
    })

    test('calls onSelect with preset data on save', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      // Select a preset first
      fireEvent.click(screen.getByRole('button', { name: /bear/i }))
      // Then click save
      fireEvent.click(screen.getByText('Save'))

      expect(mockOnSelect).toHaveBeenCalledWith({
        type: 'preset',
        value: 'bear',
      })
      expect(mockOnClose).toHaveBeenCalled()
    })

    test('renders images for all preset avatars', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThanOrEqual(10)

      PRESET_AVATARS.forEach((avatar) => {
        expect(screen.getByAltText(avatar.name)).toBeInTheDocument()
      })
    })
  })

  describe('Use Initials', () => {
    test('calls onSelect with null when "Use initials" clicked', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      fireEvent.click(screen.getByText('Use initials'))
      expect(mockOnSelect).toHaveBeenCalledWith(null)
    })

    test('closes dialog after removing avatar', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      fireEvent.click(screen.getByText('Use initials'))
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Save Button', () => {
    test('is disabled when no preset selected', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      const saveButton = screen.getByText('Save')
      expect(saveButton).toBeDisabled()
    })

    test('is enabled when preset is selected', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      // Select a preset
      fireEvent.click(screen.getByRole('button', { name: /dog/i }))
      const saveButton = screen.getByText('Save')
      expect(saveButton).not.toBeDisabled()
    })

    test('is enabled when currentAvatar is preset', () => {
      const currentAvatar: AvatarData = { type: 'preset', value: 'fox' }
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          currentAvatar={currentAvatar}
        />
      )
      const saveButton = screen.getByText('Save')
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('Upload Option', () => {
    test('does not show upload button when enableUpload is false', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={false}
        />
      )
      expect(screen.queryByText('Upload custom photo')).not.toBeInTheDocument()
    })

    test('shows upload button when enableUpload is true', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      expect(screen.getByText('Upload custom photo')).toBeInTheDocument()
    })

    test('switches to upload view when upload button clicked', async () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      fireEvent.click(screen.getByText('Upload custom photo'))

      await waitFor(() => {
        expect(screen.getByText('Upload photo')).toBeInTheDocument()
        expect(screen.getByTestId('avatar-uploader')).toBeInTheDocument()
      })
    })

    test('shows back button in upload view', async () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      fireEvent.click(screen.getByText('Upload custom photo'))

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })

    test('returns to presets view when back clicked', async () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      fireEvent.click(screen.getByText('Upload custom photo'))

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Back'))

      await waitFor(() => {
        expect(screen.getByText('Choose your avatar')).toBeInTheDocument()
      })
    })

    test('calls onSelect with custom avatar on upload complete', async () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      fireEvent.click(screen.getByText('Upload custom photo'))

      await waitFor(() => {
        expect(screen.getByText('Mock Upload')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Mock Upload'))

      expect(mockOnSelect).toHaveBeenCalledWith({
        type: 'custom',
        value: 'https://example.com/avatar.png',
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Dialog Title', () => {
    test('shows correct title for presets view', () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      )
      expect(screen.getByText('Choose your avatar')).toBeInTheDocument()
      expect(
        screen.getByText('Select an avatar that represents you')
      ).toBeInTheDocument()
    })

    test('shows correct title for upload view', async () => {
      render(
        <AvatarPicker
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          enableUpload={true}
        />
      )
      fireEvent.click(screen.getByText('Upload custom photo'))

      await waitFor(() => {
        expect(screen.getByText('Upload photo')).toBeInTheDocument()
        expect(
          screen.getByText('Upload a custom profile picture')
        ).toBeInTheDocument()
      })
    })
  })
})
