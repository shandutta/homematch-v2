// Stub Pages Router _error for Next.js 15 build compatibility.
// The actual app uses App Router (src/app/error.tsx + global-error.tsx).
// This file exists only so Next.js's internal Pages Router fallback
// for static /500 prerendering wraps with HtmlContext.Provider correctly.
// See: https://github.com/vercel/next.js/issues/90349 family of bugs.
import type { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on server`
        : 'An error occurred on client'}
    </p>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
