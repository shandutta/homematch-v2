# HomeMatch UX/UI Style Guide

This style guide outlines visual and interaction guidelines for the HomeMatch real‑estate platform. It reflects the actual implementation patterns used in the current application and is tailored to millennial homebuyers. Use this guide to ensure a cohesive and accessible user experience across the web application.

## 1. Design principles

### Focus on clarity and purpose

- **Minimalism with intent** – Use clean layouts with generous white space so content stands out. Keep components simple and avoid clutter.
- **Human‑centred storytelling** – Highlight aspirational lifestyle imagery (beautiful homes, happy couples) rather than only transactional data. Use narrative copy and visuals to connect emotionally with millennials.
- **Single goal per page** – Each page should support a primary user task (swipe properties, adjust filters, save favourites). Use concise copy and a clear call‑to‑action.

### Build trust

- **Transparency and social proof** – Include testimonials, partner badges and statistics that reinforce credibility.
- **Consistency** – Use consistent colours, typography, component sizes and interaction patterns. Consistency reduces cognitive load and builds user confidence.
- **Accessibility first** – Adhere to WCAG 2.1 AA. Use high contrast, clear labeling, keyboard navigation and ARIA attributes.

### Subtle motion

- **Micro‑interactions** – Provide feedback when users interact with cards, buttons and sliders. Hover effects, like/unlike animations and swipe confirmations provide interactive feedback.
- **Progressive disclosure** – Reveal advanced options (filters, scoring breakdown) only when the user needs them.

## 2. Colour, typography and icons

### Colour palette

The HomeMatch colour palette is designed to convey trust, modernity, and sophistication while maintaining accessibility. The teal/cyan gradient (#29e3ff → #1ecfea) is reserved for primary actions like "Get started" buttons and should be used sparingly for high visibility elements.

| Role              | Colours & Usage                                  | Notes                                                                                                               |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Primary brand** | Deep navy gradient (#020b1f → #03123b → #041a52) | Used for main backgrounds and immersive sections. Creates a sophisticated, premium feel.                            |
| **Secondary**     | Rich purple (#6D28D9)                            | New accent color for buttons, highlights, and interactive elements. Creates a vibrant contrast with the navy theme. |
| **Tertiary**      | Soft neutrals (white/gray with transparency)     | Background sections, cards and modals. Light neutrals soften dark themes and support white space.                   |
| **Error/Warning** | Coral red (#FF6B6B) and Amber (#F59E0B)          | Feedback colours for errors, warnings and alerts.                                                                   |

Support dark and light modes. Maintain sufficient contrast ratios (>4.5:1) for text and interactive elements.

### Typography

- **Font family** – Use Geist (via `--font-geist-sans` and `--font-geist-mono`) for a modern, clean appearance.
- **Heading font** – Custom heading font (via `--font-heading`) for prominent titles.
- **Body font** – Custom body font (via `--font-body`) for descriptive text.
- **Hierarchy** – Establish a clear typographic hierarchy:
  - **Headings (H1–H3):** Bold weight, 1.75–2.5 rem sizes, minimal letter‑spacing.
  - **Body text:** Regular weight, 1 rem size with comfortable line height (~1.5). Use dark text on light backgrounds or light text on dark backgrounds.
  - **Labels and captions:** 0.875 rem with medium weight.
- **Usage** – Limit to two font families and avoid excessive styles.

### Icons

- Use Lucide icons (included with shadcn/ui). Icons should be simple, line‑based and match the stroke weight of text.
- Provide context with tooltips or labels. Avoid using icons alone for critical actions.
- Ensure icons have descriptive labels for screen readers.

## 3. Layout and spacing

- **Grid system:** Use a responsive 12‑column grid. Adjust breakpoints for mobile‑first design (e.g., 375px, 768px, 1024px, 1440px).
- **Spacing scale:** Adopt a consistent spacing scale based on Tailwind's default spacing (4px increments). Use Tailwind's spacing utilities for consistency.
- **Container widths:** Limit content width to ~1200px for desktop. Maintain generous margins for readability.
- **Layered backgrounds:** Use a combination of:
  - Radial gradients for depth: `radial-gradient(1200px 600px at 50% -10%, rgba(2,26,68,0.06) 0%, rgba(2,26,68,0.03) 35%, rgba(255,255,255,1) 65%)`
  - Grid overlays: `repeating-linear-gradient` with 28px grid pattern
  - Additional radial overlays for visual interest

## 4. Components (shadcn/ui)

- **Buttons:**
  - Primary buttons: High visibility gradient with hover glow effect
  - Secondary buttons: White with navy border and subtle hover effects
  - Support loading and disabled states
- **Cards:**
  - Glass-morphism effect with backdrop blur (`backdrop-blur-[2px]`)
  - Soft shadows: `shadow-[0_6px_28px_rgba(2,6,23,0.08)]`
  - Hover effects with enhanced shadows
- **Modals & Dialogs:** For onboarding, filters, and property details. Always include clear close actions.
- **Forms:** Use React Hook Form with validation. Provide inline error messages and confirmation states.
- **Toasts:** Use for non‑blocking notifications (e.g., saved search confirmation).

## 5. Animations

- Use Framer Motion for subtle transitions and micro-interactions.
- Apply animations to:
  - Page transitions and section reveals
  - Hover states on interactive elements
  - Button feedback and loading states
- Avoid overwhelming animations. Keep durations between 150–300ms.
- Provide haptic or visual feedback on swipe actions.

## 6. Accessibility

- Ensure all interactive elements are keyboard‑navigable.
- Provide ARIA roles for complex components (carousels, modals).
- Support dark mode with proper contrast.
- Test with screen readers and accessibility tools.

## 7. Implementation tips

- Use Tailwind design tokens for colours, spacing, and typography.
- Extend shadcn/ui components for custom needs while preserving accessibility.
- Optimize images with Next.js Image component.
- Implement lazy loading for property lists and galleries.
- **Note on Parallax Effects:** The parallax stars effect used on the homepage hero section is a special-case implementation and should not be replicated elsewhere in the application.

---

This guide establishes a modern, accessible design system for HomeMatch, ensuring consistency across the app experience while reflecting the actual implemented design patterns.
