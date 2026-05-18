import { SignIn } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-hm-canvas text-hm-ink">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 480px at 18% 18%, rgba(194,129,65,0.16), transparent 65%), radial-gradient(820px 560px at 82% 12%, rgba(120,113,108,0.12), transparent 65%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-var(--cookie-banner-offset,0px))] w-full max-w-[440px] flex-col items-center justify-center px-3 py-2 sm:px-4 sm:py-12">
        <SignIn appearance={clerkAppearance} />
      </div>
    </main>
  )
}
