'use client'

import { useEffect } from 'react'

const ADSENSE_SCRIPT_ID = 'adsbygoogle-init'

export function AdSenseScript() {
  const publisherId =
    process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'ca-pub-9556502662108721'

  useEffect(() => {
    // Skip loading in development to avoid noisy console warnings and test pollution
    if (process.env.NODE_ENV !== 'production') return

    if (document.getElementById(ADSENSE_SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = ADSENSE_SCRIPT_ID
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
  }, [publisherId])

  return null
}

export default AdSenseScript
