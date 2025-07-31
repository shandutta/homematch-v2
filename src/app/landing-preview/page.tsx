import { Header } from '@/components/features/landing/Header'
import { HeroSection } from '@/components/features/landing/HeroSection'
import { HowItWorksSection } from '@/components/features/landing/HowItWorksSection'
import { SocialProofSection } from '@/components/features/landing/SocialProofSection'
import { CtaSection } from '@/components/features/landing/CtaSection'
import { Footer } from '@/components/features/landing/Footer'

export default function LandingPreviewPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
