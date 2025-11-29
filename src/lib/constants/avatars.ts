/**
 * Preset avatar configuration and types for user profiles.
 * Users can select from these friendly animal avatars or upload a custom image.
 */

export const PRESET_AVATARS = [
  { id: 'bear', name: 'Bear', src: '/avatars/bear.svg' },
  { id: 'cat', name: 'Cat', src: '/avatars/cat.svg' },
  { id: 'dog', name: 'Dog', src: '/avatars/dog.svg' },
  { id: 'fox', name: 'Fox', src: '/avatars/fox.svg' },
  { id: 'koala', name: 'Koala', src: '/avatars/koala.svg' },
  { id: 'owl', name: 'Owl', src: '/avatars/owl.svg' },
  { id: 'panda', name: 'Panda', src: '/avatars/panda.svg' },
  { id: 'penguin', name: 'Penguin', src: '/avatars/penguin.svg' },
  { id: 'rabbit', name: 'Rabbit', src: '/avatars/rabbit.svg' },
  { id: 'sloth', name: 'Sloth', src: '/avatars/sloth.svg' },
] as const

export type PresetAvatarId = (typeof PRESET_AVATARS)[number]['id']

export interface AvatarData {
  type: 'preset' | 'custom'
  value: string // preset ID like "fox" or Supabase storage URL for custom
}

/**
 * Get the full source URL for an avatar
 */
export function getAvatarSrc(
  avatar: AvatarData | undefined | null
): string | null {
  if (!avatar) return null

  if (avatar.type === 'preset') {
    const preset = PRESET_AVATARS.find((p) => p.id === avatar.value)
    return preset?.src ?? null
  }

  // Custom avatar - value is the full URL
  return avatar.value
}

/**
 * Get a preset avatar by ID
 */
export function getPresetAvatar(id: string) {
  return PRESET_AVATARS.find((p) => p.id === id)
}
