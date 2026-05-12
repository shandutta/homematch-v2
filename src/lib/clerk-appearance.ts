import type { Appearance } from '@clerk/ui'

/**
 * Shared Clerk widget appearance for HomeMatch.
 *
 * Pulls from the same palette as the marketing surface so users don't
 * feel a brand jump between the homepage and the auth flow:
 * - Surface: `#030712` matched to HeroSection background
 * - Card: glass-morphic `bg-white/5` with `backdrop-blur-xl`
 * - Primary action: deep navy gradient matching `Button variant="prime"`
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#0c1426',
    colorBackground: 'rgba(15, 23, 42, 0.85)',
    colorForeground: '#ffffff',
    colorMutedForeground: 'rgba(255, 255, 255, 0.7)',
    colorInput: 'rgba(255, 255, 255, 0.06)',
    colorInputForeground: '#ffffff',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    colorBorder: 'rgba(255, 255, 255, 0.1)',
    fontFamily: 'var(--font-sans, system-ui)',
  },
  elements: {
    rootBox: 'w-full',
    card: 'w-full !bg-white/5 backdrop-blur-xl !border-white/10 shadow-2xl !rounded-2xl',
    headerTitle: '!text-white text-2xl font-bold',
    headerSubtitle: '!text-white/70',
    socialButtonsBlockButton:
      '!border !border-white/20 !bg-white/5 hover:!bg-white/10',
    socialButtonsBlockButtonText: '!text-white font-medium',
    socialButtonsProviderIcon: 'brightness-110',
    dividerLine: '!bg-white/10',
    dividerText: '!text-white/50',
    formFieldLabel: '!text-white/80 font-medium',
    formFieldInput:
      '!bg-white/5 !border !border-white/10 !text-white placeholder:!text-white/40 focus:!border-sky-400/60',
    formFieldInputShowPasswordButton: '!text-white/60 hover:!text-white',
    formButtonPrimary:
      '!bg-gradient-to-b !from-[#0c1426] !to-[#0a0f1d] hover:!from-[#0e1730] hover:!to-[#0c1426] !text-white font-semibold !shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
    footer: '!bg-transparent',
    footerAction: '!text-white/70',
    footerActionText: '!text-white/70',
    footerActionLink: '!text-sky-300 hover:!text-sky-200 font-medium',
    identityPreviewText: '!text-white',
    identityPreviewEditButton: '!text-sky-300 hover:!text-sky-200',
    formResendCodeLink: '!text-sky-300 hover:!text-sky-200',
    otpCodeFieldInput: '!bg-white/5 !border-white/10 !text-white',
    alert: '!bg-white/5 !border-white/10 !text-white',
    alertText: '!text-white',
    formFieldAction: '!text-sky-300 hover:!text-sky-200',
    formFieldHintText: '!text-white/60',
    formFieldErrorText: '!text-rose-300',
    formHeaderTitle: '!text-white',
    formHeaderSubtitle: '!text-white/70',
  },
}
