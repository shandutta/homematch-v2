import { SignIn } from '@clerk/nextjs'
import { clerkAppearance } from '@/lib/clerk-appearance'

export default function SignInPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030712] text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 480px at 18% 18%, rgba(2,26,68,0.8), transparent 65%), radial-gradient(820px 560px at 82% 12%, rgba(6,58,158,0.55), transparent 65%)',
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[440px] flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
        <SignIn appearance={clerkAppearance} />
      </div>
    </main>
  )
}
