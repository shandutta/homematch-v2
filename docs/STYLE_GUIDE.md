# HomeMatch UX/UI Style Guide

This style guide outlines visual and interaction guidelines for the HomeMatch real‑estate platform. It reflects best practices from leading consumer apps such as Stripe, Figma, Notion, Slack and Linear and is tailored to millennial homebuyers. Use this guide to ensure a cohesive and accessible user experience across the web application.

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

Select a palette that conveys trust and modernity:

| Role              | Example colours                         | Notes                                                                                                                              |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Primary brand** | Deep blue gradient (#0E1E40 → #1D4ED8)  | A sophisticated gradient for headers, navigation and accent elements.                                                              |
| **Secondary**     | Vibrant purple (#8B5CF6)                | Modern accent for buttons, highlights and interactive elements. Creates a vibrant contrast with the blue gradient.                 |
| **Tertiary**      | Soft neutrals (#F5F5F5, #E5E7EB)        | Background sections, cards and modals. Light neutrals soften dark themes and support white space.                                  |
| **Error/Warning** | Coral red (#FF6B6B) and Amber (#F59E0B) | Feedback colours for errors, warnings and alerts.                                                                                  |

Support dark and light modes. Maintain sufficient contrast ratios (>4.5:1) for text and interactive elements.

### Typography

- **Primary font** – Use a modern sans‑serif such as Inter or SF Pro. These fonts are highly legible and align with tech‑focused brands.
- **Hierarchy** – Establish a clear typographic hierarchy:
  - **Headings (H1–H3):** Bold weight, 1.75–2.5 rem sizes, minimal letter‑spacing.
  - **Body text:** Regular weight, 1 rem size with comfortable line height (~1.5). Use dark text on light backgrounds or light text on dark backgrounds.
  - **Labels and captions:** 0.875 rem with medium weight.
- **Usage** – Limit to two font families and avoid excessive styles.

### Icons

- Use a consistent icon set (e.g., Lucide icons, included with shadcn/ui). Icons should be simple, line‑based and match the stroke weight of text.
- Provide context with tooltips or labels. Avoid using icons alone for critical actions.
- Ensure icons have descriptive labels for screen readers.

## 3. Layout and spacing

- **Grid system:** Use a responsive 12‑column grid. Adjust breakpoints for mobile‑first design (e.g., 375px, 768px, 1024px, 1440px).
- **Spacing scale:** Adopt a consistent spacing scale (e.g., 4px increments). Use Tailwind’s spacing utilities for consistency.
- **Container widths:** Limit content width to ~1200px for desktop. Maintain generous margins for readability.

## 4. Components (shadcn/ui)

- **Buttons:** Use primary buttons for main actions, secondary for supporting actions. Support loading and disabled states.
- **Cards:** Present property information in clean cards with image, price, location, and quick‑action buttons.
- **Modals & Dialogs:** For onboarding, filters, and property details. Always include clear close actions.
- **Forms:** Use React Hook Form with validation. Provide inline error messages and confirmation states.
- **Toasts:** Use for non‑blocking notifications (e.g., saved search confirmation).

## 5. Animations

- Use Framer Motion or CSS animations for subtle transitions.
- Avoid overwhelming animations. Keep durations between 150–300ms.
- Provide haptic or visual feedback on swipe actions.

## 6. Accessibility

- Ensure all interactive elements are keyboard‑navigable.
- Provide ARIA roles for complex components (carousels, modals).
- Support dark mode with proper contrast.

## 7. Implementation tips

- Use Tailwind design tokens for colours, spacing, and typography.
- Extend shadcn/ui components for custom needs while preserving accessibility.
- Optimize images with Next.js Image component.
- Implement lazy loading for property lists and galleries.

---

This guide establishes a modern, accessible design system for HomeMatch, ensuring consistency across the app experience.
