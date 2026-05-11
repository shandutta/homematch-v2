// Stub Pages Router _app for Next.js 15 build compatibility.
// The actual app uses App Router (src/app/layout.tsx). This file only
// exists so Next.js's internal Pages Router fallback for static /404
// and /500 prerendering can find a valid _app context.
// See: https://github.com/vercel/next.js/issues/56403
import type { AppProps } from 'next/app'

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
