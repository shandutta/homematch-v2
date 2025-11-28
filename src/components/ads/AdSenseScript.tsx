'use client'

import { useEffect } from 'react'

const ADSENSE_SCRIPT_ID = 'adsbygoogle-init'
const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9556502662108721'

export function AdSenseScript() {
  useEffect(() => {
    // Skip loading in development to avoid noisy console warnings and test pollution
    if (process.env.NODE_ENV !== 'production') return

    if (document.getElementById(ADSENSE_SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = ADSENSE_SCRIPT_ID
    script.async = true
    script.src = ADSENSE_SRC
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
  }, [])

  return null
}

export default AdSenseScript
