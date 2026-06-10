'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Upload, User, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PRESET_AVATARS,
  AvatarData,
  PresetAvatarId,
} from '@/lib/constants/avatars'
import { AvatarUploader } from './AvatarUploader'

interface AvatarPickerProps {
  /** Whether the picker dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when an avatar is selected */
  onSelect: (avatar: AvatarData | null) => void
  /** Currently selected avatar */
  currentAvatar?: AvatarData | null
  /** Enable custom upload option */
  enableUpload?: boolean
}

type PickerView = 'presets' | 'upload'

/**
 * Avatar picker dialog with preset animal avatars
 * and optional custom upload
 */
export function AvatarPicker({
  isOpen,
  onClose,
  onSelect,
  currentAvatar,
  enableUpload = false,
}: AvatarPickerProps) {
  const [view, setView] = useState<PickerView>('presets')
  const isPresetAvatarId = (value: string): value is PresetAvatarId =>
    PRESET_AVATARS.some((avatar) => avatar.id === value)
  const [selectedPreset, setSelectedPreset] = useState<PresetAvatarId | null>(
    currentAvatar?.type === 'preset'
      ? isPresetAvatarId(currentAvatar.value)
        ? currentAvatar.value
        : null
      : null
  )

  const handlePresetSelect = (presetId: PresetAvatarId) => {
    setSelectedPreset(presetId)
  }

  const handleSave = () => {
    if (selectedPreset) {
      onSelect({ type: 'preset', value: selectedPreset })
    }
    onClose()
  }

  const handleRemoveAvatar = () => {
    setSelectedPreset(null)
    onSelect(null)
    onClose()
  }

  const handleUploadComplete = (url: string) => {
    onSelect({ type: 'custom', value: url })
    setView('presets')
    onClose()
  }

  const handleDialogClose = () => {
    setView('presets')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="border-hm-border bg-hm-surface text-hm-ink sm:max-w-md">
        <DialogHeader>
          {view === 'upload' && (
            <button
              type="button"
              onClick={() => setView('presets')}
              className="text-hm-muted hover:text-hm-ink absolute top-4 left-4 flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <DialogTitle className="text-hm-ink">
            {view === 'presets' ? 'Choose your avatar' : 'Upload photo'}
          </DialogTitle>
          <DialogDescription className="text-hm-muted">
            {view === 'presets'
              ? 'Select an avatar that represents you'
              : 'Upload a custom profile picture'}
          </DialogDescription>
        </DialogHeader>

        {view === 'presets' ? (
          <>
            {/* Preset Avatars Grid */}
            <div className="mt-4 grid grid-cols-5 gap-3">
              {PRESET_AVATARS.map((avatar) => {
                const isSelected = selectedPreset === avatar.id
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handlePresetSelect(avatar.id)}
                    className={cn(
                      'group relative aspect-square rounded-xl p-1 transition-all',
                      'hover:bg-hm-canvas focus-visible:ring-hm-accent focus:outline-none focus-visible:ring-2',
                      isSelected && 'bg-hm-canvas ring-hm-accent ring-2'
                    )}
                    title={avatar.name}
                  >
                    <Image
                      src={avatar.src}
                      alt={avatar.name}
                      width={64}
                      height={64}
                      className="h-full w-full rounded-lg"
                    />
                    {isSelected && (
                      <div className="bg-hm-accent absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom Upload Option */}
            {enableUpload && (
              <div className="border-hm-border mt-4 border-t pt-4">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl',
                    'border-hm-border border-2 border-dashed p-4',
                    'text-hm-muted transition-colors',
                    'hover:text-hm-ink-soft hover:border-hm-border-strong hover:bg-hm-canvas'
                  )}
                  onClick={() => setView('upload')}
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload custom photo</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemoveAvatar}
                className="text-hm-muted hover:text-hm-ink hover:bg-hm-canvas"
              >
                <User className="mr-2 h-4 w-4" />
                Use initials
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-hm-ink-soft border-hm-border hover:border-hm-border-strong hover:bg-hm-canvas hover:text-hm-ink bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedPreset}
                  className="bg-hm-accent hover:bg-hm-accent-strong text-white shadow-lg transition-colors disabled:opacity-50"
                >
                  Save
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <AvatarUploader
              onUpload={handleUploadComplete}
              onCancel={() => setView('presets')}
              currentUrl={
                currentAvatar?.type === 'custom' ? currentAvatar.value : null
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
