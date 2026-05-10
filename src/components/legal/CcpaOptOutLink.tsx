'use client'

/**
 * CCPA "Do Not Sell or Share My Personal Information" opt-out link.
 *
 * Rendered as a discreet footer link. Only visible to users in California
 * (or wherever CCPA applies). The link navigates to the privacy settings page
 * where users can exercise their CCPA opt-out right.
 */
export function CcpaOptOutLink() {
  return (
    <div className="fixed bottom-4 left-4 z-40 text-xs text-muted-foreground">
      <a
        href="/privacy#ccpa-opt-out"
        className="underline underline-offset-2 hover:text-foreground transition-colors"
        aria-label="Do Not Sell or Share My Personal Information (CCPA)"
      >
        Do Not Sell or Share My Info
      </a>
    </div>
  )
}
