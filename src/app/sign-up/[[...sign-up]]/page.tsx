import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12">
      <SignUp />
    </main>
  )
}
