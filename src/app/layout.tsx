import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import '../styles/mobile-enhancements.css'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { PerformanceProvider } from '@/components/shared/PerformanceProvider'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'HomeMatch - AI-Powered Home Search',
  description:
    'Find your perfect home with AI-powered matching and personalized recommendations',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  ),
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <PerformanceProvider>{children}</PerformanceProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
