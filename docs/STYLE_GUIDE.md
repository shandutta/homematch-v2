# HomeMatch UX/UI Style Guide

This guide captures the design rules used in the current HomeMatch UI. The source of truth for tokens and utilities is `src/app/globals.css`.

## 1. Design Principles

- Clarity and purpose: keep layouts focused, one primary action per screen.
- Storytelling: lean into lifestyle cues, not just raw listing data.
- Consistency: reuse tokens, spacing, and components across surfaces.
- Accessibility: meet WCAG 2.1 AA for contrast, focus, and labeling.

## 2. Typography

HomeMatch uses three primary fonts configured in `src/app/layout.tsx`:

- Display: Fraunces (`--font-display`) for hero headlines and prices.
- Body: Plus Jakarta Sans (`--font-body`) for UI text.
- Sans fallback: Geist Sans via `--font-sans`.
- Mono: Geist Mono via `--font-mono`.

Hierarchy guidance:

- H1-H3: bold, 1.75-2.5rem, minimal letter spacing.
- Body: 1rem with comfortable line height (~1.5).
- Labels: 0.875rem, medium weight.

## 3. Color System

The palette blends warm obsidian neutrals with amber accents. Marketing and couples surfaces have their own semantic tokens.

Core tokens (from `src/app/globals.css`):

- Base neutrals: `--hm-obsidian-*`, `--hm-stone-*`
- Accents: `--hm-amber-400/500/600`, `--color-token-primary-500/600`
- Feedback: `--color-token-success-*`, `--color-token-warning-*`, `--color-token-error-*`
- Marketing gradients: `--gradient-marketing-primary`, `--gradient-marketing-card`
- Couples accents: `--color-couples-*`, `--gradient-couples-mutual`
- Hero gradient: `--gradient-token-hero` (use sparingly)

Contrast: keep text/background contrast above 4.5:1 for body text. Use `--color-text-on-dark-*` tokens on dark surfaces.

## 4. Layout and Spacing

- Use Tailwind spacing for layout; custom spacing tokens exist (`--spacing-*`) for CSS use.
- Use `max-w-*` utilities for content width. Marketing sections typically cap at 1200px.
- Backgrounds should use gradient mesh or layered overlays rather than flat fills.
  - See `GradientMeshBackground` and `--mesh-*` tokens.

## 5. Components (shadcn/ui)

- Buttons: primary CTA uses gradients (`--gradient-token-cta`); secondary buttons stay neutral.
- Cards: use glassmorphism styles (`.card-glassmorphism-style`, `.bg-marketing-glass`).
- Forms: use React Hook Form + Zod with clear inline error text.
- Modals/dialogs: always include a clear close action and focus trap.

## 6. Motion

- Use Framer Motion for reveals and swipe interactions.
- Prefer tokenized durations: `--duration-fast` (150ms), `--duration-normal` (300ms).
- Avoid heavy motion on dense pages; focus on meaningful transitions.

## 7. Accessibility

- All interactive elements must be keyboard navigable.
- Provide ARIA labels for icon-only controls.
- Avoid color-only communication; pair with icon/text.

## 8. Design Tokens and Utilities

Tokens live in `src/app/globals.css`. Utility classes are provided for common tokens.

Marketing utilities:

- `.text-marketing-primary`, `.text-marketing-secondary`, `.text-marketing-error`
- `.bg-gradient-marketing-primary`, `.bg-gradient-marketing-card`
- `.bg-marketing-glass`, `.border-marketing-glass`

Couples utilities:

- `.text-couples-primary`, `.text-couples-secondary`, `.text-couples-accent`
- `.bg-couples-primary`, `.bg-couples-secondary`, `.bg-couples-accent`
- `.bg-gradient-couples-mutual`, `.border-couples-primary`

Glassmorphism utilities:

- `.glass-subtle`, `.glass-strong`
- `.blur-glass-sm`, `.blur-glass-md`, `.blur-glass-lg`
- `.bg-token-glass-light`, `.bg-token-glass-medium`, `.bg-token-glass-strong`

## 9. Component-Specific Notes

### Property Storytelling

`src/components/features/storytelling/StorytellingDescription.tsx` generates lifestyle tags and descriptions based on property and neighborhood data. Keep output concise and avoid overloading cards with text. Tags are capped to three.

### Parallax Stars

The parallax stars effect on the marketing hero is a one-off flourish. Do not reuse it in other sections.
