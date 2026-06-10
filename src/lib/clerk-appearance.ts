import type { Appearance } from '@clerk/ui'

/**
 * Shared Clerk widget appearance for HomeMatch.
 *
 * Warm editorial palette — ivory surface, stone ink, burnished-amber accent —
 * so the auth flow feels native to the marketing site instead of a separate
 * dark island. Clerk derives the full widget theme from these variables.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#9a6514',
    colorBackground: '#fffaf2',
    colorForeground: '#1f1a17',
    colorMutedForeground: '#5f554d',
    colorInput: '#ffffff',
    colorInputForeground: '#1f1a17',
    colorDanger: '#b42318',
    colorSuccess: '#16764b',
    colorBorder: '#e4d8c4',
    fontFamily: 'var(--font-sans, system-ui)',
  },
  elements: {
    rootBox: 'w-full',
    card: 'w-full',
  },
}
