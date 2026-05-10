import type { Metadata, Viewport } from 'next'
import {
  Geist,
  Geist_Mono,
  Fraunces,
  Plus_Jakarta_Sans,
} from 'next/font/google'
import './globals.css'
import '../styles/mobile-enhancements.css'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { MotionProvider } from '@/components/shared/MotionProvider'
import { PerformanceProvider } from '@/components/shared/PerformanceProvider'
import { Toaster } from '@/components/ui/sonner'
import { AnalyticsGate } from '@/components/legal/AnalyticsGate'
import { AdSenseGate } from '@/components/legal/AdSenseGate'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'
import { CcpaOptOutLink } from '@/components/legal/CcpaOptOutLink'
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from '@/lib/adsense'
import {
  createOrganizationJsonLd,
  createWebApplicationJsonLd,
  SEO_KEYWORDS,
} from '@/lib/seo/route-metadata'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

const organizationJsonLd = createOrganizationJsonLd()
const webApplicationJsonLd = createWebApplicationJsonLd()

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Premium display font for prices and headlines
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

// Clean body font with warmth
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export const metadata: Metadata = {
  title: 'HomeMatch - AI-Powered Home Search',
  description:
    'Find your perfect home with AI-powered matching and personalized recommendations',
  keywords: SEO_KEYWORDS.join(', '),
  metadataBase: new URL(siteUrl),
  applicationName: 'HomeMatch',
  authors: [{ name: 'HomeMatch' }],
  creator: 'HomeMatch',
  publisher: 'HomeMatch',
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'HomeMatch — Collaborative Home Search for Couples & Households',
    description:
      'Find your perfect home with AI-powered matching and personalized recommendations',
    url: siteUrl,
    siteName: 'HomeMatch',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'HomeMatch — Collaborative Home Search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@homematch',
    creator: '@homematch',
    title: 'HomeMatch — Collaborative Home Search for Couples & Households',
    description:
      'Find your perfect home with AI-powered matching and personalized recommendations',
    images: [`${siteUrl}/twitter-image.jpg`],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-test-mode={isTestMode ? 'true' : undefined}>
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {ADSENSE_ENABLED && process.env.NODE_ENV === 'production' ? (
          <meta name="google-adsense-account" content={ADSENSE_CLIENT_ID} />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webApplicationJsonLd),
          }}
        />
        {/* 
          SECURITY NOTE: Google Maps loading moved to SecureMapLoader component
          This reduces exposure and provides better error handling
        */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <ErrorBoundary>
          <PerformanceProvider>
            <MotionProvider>
              <main>{children}</main>
            </MotionProvider>
          </PerformanceProvider>
        </ErrorBoundary>
        <Toaster position="top-right" />
        <AnalyticsGate />
        <AdSenseGate />
        <CookieConsentBanner />
        <CcpaOptOutLink />
      </body>
    </html>
  )
}
