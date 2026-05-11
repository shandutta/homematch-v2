// Stub Pages Router _document for Next.js 15 build compatibility.
// The actual app uses App Router (src/app/layout.tsx). This file only
// exists because Next.js's internal Pages Router fallback for static
// /404 and /500 prerendering looks for it and crashes without one.
// See: https://github.com/vercel/next.js/issues/56403
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
