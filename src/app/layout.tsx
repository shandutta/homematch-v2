import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  Fraunces,
  Plus_Jakarta_Sans,
} from 'next/font/google'
import './globals.css'
import '../styles/mobile-enhancements.css'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { PerformanceProvider } from '@/components/shared/PerformanceProvider'
import { AdSenseScript } from '@/components/ads/AdSenseScript'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'https://homematch.pro'

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

export const metadata: Metadata = {
  title: 'HomeMatch - AI-Powered Home Search',
  description:
    'Find your perfect home with AI-powered matching and personalized recommendations',
  metadataBase: new URL(siteUrl),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'HomeMatch',
              url: siteUrl,
              logo: `${siteUrl}/favicon.ico`,
            }),
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
          <PerformanceProvider>{children}</PerformanceProvider>
        </ErrorBoundary>

        <AdSenseScript />
      </body>
    </html>
  )
}
