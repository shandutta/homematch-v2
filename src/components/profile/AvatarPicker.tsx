'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Upload, User } from 'lucide-react'
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

interface AvatarPickerProps {
  /** Whether the picker dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when an avatar is selected */
  onSelect: (avatar: AvatarData | null) => void
  /** Currently selected avatar */
  currentAvatar?: AvatarData | null
  /** Enable custom upload option (Phase 2) */
  enableUpload?: boolean
}

/**
 * Avatar picker dialog with preset animal avatars
 * and optional custom upload (Phase 2)
 */
export function AvatarPicker({
  isOpen,
  onClose,
  onSelect,
  currentAvatar,
  enableUpload = false,
}: AvatarPickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetAvatarId | null>(
    currentAvatar?.type === 'preset'
      ? (currentAvatar.value as PresetAvatarId)
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/10 bg-[#0c0a09] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-hm-stone-200">
            Choose your avatar
          </DialogTitle>
          <DialogDescription className="text-hm-stone-400">
            Select an avatar that represents you
          </DialogDescription>
        </DialogHeader>

        {/* Preset Avatars Grid */}
        <div className="mt-4 grid grid-cols-5 gap-3">
          {PRESET_AVATARS.map((avatar) => {
            const isSelected = selectedPreset === avatar.id
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => handlePresetSelect(avatar.id as PresetAvatarId)}
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

        {/* Custom Upload Option (Phase 2) */}
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
              onClick={() => {
                // TODO: Implement custom upload in Phase 2
                console.log('Custom upload coming in Phase 2')
              }}
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
      </DialogContent>
    </Dialog>
  )
}
