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
      <DialogContent className="border-white/10 bg-[#0c0a09] text-white sm:max-w-md">
        <DialogHeader>
          {view === 'upload' && (
            <button
              type="button"
              onClick={() => setView('presets')}
              className="text-hm-stone-400 hover:text-hm-stone-200 absolute top-4 left-4 flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <DialogTitle className="text-hm-stone-200">
            {view === 'presets' ? 'Choose your avatar' : 'Upload photo'}
          </DialogTitle>
          <DialogDescription className="text-hm-stone-400">
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
                      'hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                      isSelected && 'bg-white/10 ring-2 ring-amber-500'
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
                      <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom Upload Option */}
            {enableUpload && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl',
                    'border-2 border-dashed border-white/20 p-4',
                    'text-hm-stone-400 transition-colors',
                    'hover:text-hm-stone-300 hover:border-white/30 hover:bg-white/5'
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
                className="text-hm-stone-400 hover:text-hm-stone-200 hover:bg-white/5"
              >
                <User className="mr-2 h-4 w-4" />
                Use initials
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-hm-stone-300 border-white/10 bg-transparent hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedPreset}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50"
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
