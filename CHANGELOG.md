# Changelog

Notable changes per release. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Pin `postcss >= 8.5.10` via pnpm override to patch GHSA-qx2v-qp2m-jg93 (XSS via unescaped `</style>` in CSS stringify output, moderate). Next.js 15.5.18 still resolves postcss to 8.4.31 transitively; the override forces 8.5.14 everywhere.
- Upgrade Next.js 15.5.9 → 15.5.18 — covers 7 High advisories (App Router middleware/proxy bypass, segment-prefetch route bypass, DoS via Server Components, DoS via Cache Components connection exhaustion, dynamic route parameter injection, WebSocket SSRF, Pages Router i18n bypass), 4 Moderate (CSP nonce XSS, beforeInteractive XSS, image-optimization DoS, RSC response cache poisoning), and 2 Low (RSC cache-busting + middleware redirect cache poisoning).
- Tighten Content Security Policy in `middleware.ts`:
  - Add prod Clerk subdomains (`clerk.homematch.pro`, `accounts.homematch.pro`) to `script-src`, `connect-src`, `frame-src`. Was blocking the Clerk widget after the test→live tenant swap.
  - Add `blob:` to `script-src` and a dedicated `worker-src 'self' blob:` directive so Clerk's session-sync Web Worker can spawn.

### Changed

- Migrate Clerk from development to production tenant on `clerk.homematch.pro`. Removes the orange "Development mode" badge from every auth screen.
- Add 5 CNAME records to Vercel DNS (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) pointing at Clerk's edge.
- Marketing surface polish from `/design-review`:
  - Branded glass-morphic appearance theme (`src/lib/clerk-appearance.ts`) applied to `<SignIn />` and `<SignUp />` widgets so the auth screens match the marketing palette.
  - Width-constrained wrapper around the Clerk widget — fixes horizontal overflow at 375px viewport.
  - Hero secondary CTA softened to ghost so it stops competing with the primary action.
  - Preview card: 3 floating info badges → 2 (third was duplicate signal).
  - `FeatureGrid` copy rewrite: outcome-shaped titles ("One shortlist for the whole household") instead of buzzwords ("AI That Gets Everyone").
  - `CtaBand` differentiated from hero — "Bring your partner into the search." headline / "Invite your partner" primary / "Already swiping? Sign in" text link secondary.
  - Footer column hierarchy: 11px/0.18em uppercase muted-white headings vs `text-sm` `text-white/85` body links.
  - Cookie banner: narrower max-width + tighter vertical padding — ~50% less screen real estate while staying GDPR-compliant.
  - Homepage background grid: opacity 0.20 → 0.50 with 28px → 40px cell so the pattern actually reads.

### Fixed

- Clerk appearance readability bugs: "Continue with Google" button text was rendering Clerk-default-white on Clerk-default-white background; "Don't have an account?" footer text rendered white-on-white. Add Tailwind `!` important modifier to every appearance element class so they win against Clerk's internal specificity.
- Mobile Clerk widget overflow at 375×812 viewport — wrap the widget in a max-w-[440px] flex container with reduced horizontal padding.
