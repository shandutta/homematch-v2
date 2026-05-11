'use client'

/**
 * CCPA "Do Not Sell or Share My Personal Information" opt-out link.
 * Renders a small footer link that opens the cookie preferences panel.
 * Hidden from view by default — only surfaced when relevant for California
 * residents (CCPA/CPRA compliance).
 */
export function CcpaOptOutLink() {
  const handleClick = () => {
    // Dispatch a custom event that CookiePreferencesPanel listens to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hm:open-cookie-prefs'))
    }
  }

  return (
    <div className="fixed right-4 bottom-16 z-40 hidden" id="ccpa-opt-out">
      <button
        type="button"
        onClick={handleClick}
        className="text-muted-foreground hover:text-foreground text-[11px] underline underline-offset-2 transition-colors"
        aria-label="Do Not Sell or Share My Personal Information"
      >
        Do Not Sell My Info
      </button>
    </div>
  )
}
