# Component Inventory & Quality Scan — HomeMatch v2

**Date:** 2026-05-09
**Branch:** `autonomy/component-scan`
**Scope:** all `.tsx`/`.ts` files under `src/components/`
**Mode:** READ-ONLY (no code changes)

## Summary

| Metric                                     | Count     |
| ------------------------------------------ | --------- |
| Total component files                      | 112       |
| Files with at least one test               | 63 (~56%) |
| Files **without** test coverage            | 49 (~44%) |
| Files with at least one a11y issue flagged | 13        |
| Distinct a11y issue codes raised           | 11        |

### Test-coverage gap by area

| Area                       | Untested files | Notes                                                                                                                   |
| -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ui/*` (shadcn primitives) | 18             | most unwrapped radix primitives have no harness; only `button`, `card`, `dialog`, `input`, `property-image` are covered |
| `marketing/*`              | 7              | decorative/motion pieces (ParallaxStars, GradientMesh*, ScrollZoom*, HeroMotionEnhancer, etc.)                          |
| `couples/*`                | 7              | hero/stats/loading/microinteractions/activity feed                                                                      |
| `legal/*`                  | 4              | consent banner, gates, prefs panel — important for compliance, no tests                                                 |
| `shared/*`                 | 4              | logo, ProfileMenu, PerformanceProvider, PropertyCardSkeleton                                                            |
| `dashboard/*`              | 3              | DashboardSkeleton, EnhancedDashboardPageImpl, HouseholdActivityPage                                                     |
| `property/*`               | 3              | EnhancedPropertyMap, PropertyDetailProvider, PropertyDetailRouteModal                                                   |
| `features/couples/*`       | 1              | CouplesMilestoneCelebration                                                                                             |
| `providers/*`              | 1              | CouplesProgressProvider                                                                                                 |
| `settings/*`               | 1              | LocationMapSelector                                                                                                     |

### A11y issue codes (legend)

| Code                  | Meaning                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| `div-as-button`       | `<div>`/`<span>` with `onClick` lacks `role="button"`, `tabIndex`, AND keyboard handler |
| `no-kbd-handler`      | non-button element handles `onClick` but has no `onKeyDown`/`onKeyUp`                   |
| `missing-aria-label`  | icon-only button or link lacks `aria-label`                                             |
| `img-no-alt`          | `<img>` or Next `<Image>` without `alt`                                                 |
| `input-no-label`      | input/textarea not associated with label or `aria-label`                                |
| `dialog-no-title`     | dialog/modal opened without `DialogTitle` / `aria-labelledby`                           |
| `modal-no-focus-trap` | custom modal without focus management                                                   |
| `live-region-missing` | dynamic status updates without `aria-live` / `role="status"`                            |
| `swipe-no-kbd-alt`    | swipe/drag interaction without keyboard alternative                                     |
| `map-no-alt-content`  | interactive map without text/list alternative                                           |
| `nav-no-aria-label`   | `<nav>` without `aria-label`                                                            |

> **Note on `ui/input.tsx`:** The primitive itself does not associate a label — that is delegated to callers via shadcn `<Form>`/`<Label>` patterns. Flagged here for awareness; not a defect of the primitive.

---

## A11y issue summary (13 components)

| File                                                              | Issues                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/components/ui/input.tsx`                                     | input-no-label _(primitive — caller responsibility)_                    |
| `src/components/couples/DisputedPropertiesAlert.tsx`              | missing-aria-label                                                      |
| `src/components/couples/DisputedPropertiesView.tsx`               | missing-aria-label                                                      |
| `src/components/features/couples/CouplesMilestoneCelebration.tsx` | div-as-button, no-kbd-handler, modal-no-focus-trap, live-region-missing |
| `src/components/features/dashboard/DashboardPropertyGrid.tsx`     | swipe-no-kbd-alt                                                        |
| `src/components/profile/AvatarPicker.tsx`                         | img-no-alt                                                              |
| `src/components/profile/AvatarUploader.tsx`                       | div-as-button, no-kbd-handler, missing-aria-label, input-no-label       |
| `src/components/profile/HouseholdSection.tsx`                     | input-no-label, missing-aria-label                                      |
| `src/components/profile/ProfilePageClient.tsx`                    | missing-aria-label                                                      |
| `src/components/property/EnhancedPropertyMap.tsx`                 | map-no-alt-content                                                      |
| `src/components/property/PropertyDetailModal.tsx`                 | swipe-no-kbd-alt                                                        |
| `src/components/property/PropertyMap.tsx`                         | map-no-alt-content                                                      |
| `src/components/property/SwipeContainer.tsx`                      | swipe-no-kbd-alt                                                        |

The most concerning pattern is `CouplesMilestoneCelebration.tsx` — a custom modal with click-only dismiss, no focus trap, and no live region for the celebration announcement. `AvatarUploader.tsx` has a similar cluster (div drop target with onClick, hidden input lacking label).

Cross-reference: see also `reports/home-match-revival/a11y-audit-2026-05-09.md` (6 critical / 7 major / 5 minor) for the full a11y narrative.

---

## Full component inventory

Columns: **Component | File | Props Interface | Export | shadcn deps | Test Coverage | A11y Issues**

### `ui/` — shadcn primitives (23)

| Component        | File                                    | Props                                                     | Export | shadcn deps                    | Tests                                                  | A11y             |
| ---------------- | --------------------------------------- | --------------------------------------------------------- | ------ | ------------------------------ | ------------------------------------------------------ | ---------------- |
| AlertDialog+sub  | src/components/ui/alert-dialog.tsx      | `React.ComponentProps<typeof AlertDialogPrimitive.Root>`  | named  | radix:alert-dialog, button     | none                                                   | none             |
| Alert+sub        | src/components/ui/alert.tsx             | inline                                                    | named  | —                              | none                                                   | none             |
| Avatar+sub       | src/components/ui/avatar.tsx            | `React.ComponentProps<typeof AvatarPrimitive.Root>`       | named  | radix:avatar                   | none                                                   | none             |
| Badge            | src/components/ui/badge.tsx             | inline                                                    | named  | radix:slot                     | none                                                   | none             |
| Button           | src/components/ui/button.tsx            | `React.ComponentProps<'button'>`                          | named  | radix:slot                     | `__tests__/unit/components/ui/button.test.tsx`         | none             |
| Card+sub         | src/components/ui/card.tsx              | `React.ComponentProps<'div'>`                             | named  | —                              | `__tests__/unit/components/ui/card.test.tsx`           | none             |
| Checkbox         | src/components/ui/checkbox.tsx          | `React.ComponentProps<typeof CheckboxPrimitive.Root>`     | named  | radix:checkbox                 | none                                                   | none             |
| Dialog+sub       | src/components/ui/dialog.tsx            | `React.ComponentProps<typeof DialogPrimitive.Root>`       | named  | radix:dialog                   | `__tests__/unit/components/ui/dialog.test.tsx`         | none             |
| DropdownMenu+sub | src/components/ui/dropdown-menu.tsx     | `React.ComponentProps<typeof DropdownMenuPrimitive.Root>` | named  | radix:dropdown-menu            | none                                                   | none             |
| Form+sub         | src/components/ui/form.tsx              | inline                                                    | named  | label, radix:label, radix:slot | none                                                   | none             |
| Input            | src/components/ui/input.tsx             | `React.ComponentProps<'input'>`                           | named  | —                              | `__tests__/unit/components/ui/input.test.tsx`          | input-no-label\* |
| Label            | src/components/ui/label.tsx             | `React.ComponentProps<typeof LabelPrimitive.Root>`        | named  | radix:label                    | none                                                   | none             |
| MotionButton     | src/components/ui/motion-button.tsx     | `MotionButtonProps`                                       | named  | —                              | none                                                   | none             |
| MotionDiv+sub    | src/components/ui/motion-components.tsx | `React.ComponentProps<typeof motion.div>`                 | named  | —                              | none                                                   | none             |
| Progress         | src/components/ui/progress.tsx          | `React.ComponentProps<typeof ProgressPrimitive.Root>`     | named  | radix:progress                 | none                                                   | none             |
| PropertyImage    | src/components/ui/property-image.tsx    | `PropertyImageProps`                                      | named  | —                              | `__tests__/unit/components/ui/property-image.test.tsx` | none             |
| Select+sub       | src/components/ui/select.tsx            | `React.ComponentProps<typeof SelectPrimitive.Root>`       | named  | radix:select                   | none                                                   | none             |
| Sheet+sub        | src/components/ui/sheet.tsx             | `React.ComponentProps<typeof SheetPrimitive.Root>`        | named  | radix:dialog                   | none                                                   | none             |
| Skeleton         | src/components/ui/skeleton.tsx          | `React.HTMLAttributes<HTMLDivElement>`                    | named  | —                              | none                                                   | none             |
| Slider           | src/components/ui/slider.tsx            | `React.ComponentProps<typeof SliderPrimitive.Root>`       | named  | radix:slider                   | none                                                   | none             |
| Toaster          | src/components/ui/sonner.tsx            | `ToasterProps`                                            | named  | —                              | none                                                   | none             |
| Switch           | src/components/ui/switch.tsx            | `React.ComponentProps<typeof SwitchPrimitive.Root>`       | named  | radix:switch                   | none                                                   | none             |
| Tabs+sub         | src/components/ui/tabs.tsx              | `React.ComponentProps<typeof TabsPrimitive.Root>`         | named  | radix:tabs                     | none                                                   | none             |

\* primitive only — actual labelling expected at the form-level `<Form>`/`<Label>` site.

### `marketing/` (16)

| Component                  | File                                                    | Props                             | Export | shadcn deps | Tests                                                                 | A11y |
| -------------------------- | ------------------------------------------------------- | --------------------------------- | ------ | ----------- | --------------------------------------------------------------------- | ---- |
| AdMonetizationMockup       | src/components/marketing/AdMonetizationMockup.tsx       | none                              | named  | card        | none                                                                  | none |
| CtaBand                    | src/components/marketing/CtaBand.tsx                    | none                              | named  | button      | `__tests__/unit/components/marketing/CtaBand.test.tsx`                | none |
| DopamineCtaPreview         | src/components/marketing/DopamineCtaPreview.tsx         | inline                            | named  | —           | none                                                                  | none |
| FeatureGrid                | src/components/marketing/FeatureGrid.tsx                | none                              | named  | card        | `__tests__/unit/components/marketing/FeatureGrid.test.tsx`            | none |
| Footer                     | src/components/marketing/Footer.tsx                     | none                              | named  | —           | `__tests__/unit/components/marketing/Footer.test.tsx`                 | none |
| GradientMeshBackground     | src/components/marketing/GradientMeshBackground.tsx     | `GradientMeshBackgroundProps`     | named  | —           | `__tests__/unit/components/marketing/GradientMeshBackground.test.tsx` | none |
| Header                     | src/components/marketing/Header.tsx                     | none                              | named  | —           | `__tests__/unit/components/marketing/Header.test.tsx`                 | none |
| HeroMotionEnhancer         | src/components/marketing/HeroMotionEnhancer.tsx         | none                              | named  | —           | none                                                                  | none |
| HeroSection                | src/components/marketing/HeroSection.tsx                | none                              | named  | button      | `__tests__/unit/components/marketing/HeroSection.test.tsx`            | none |
| HowItWorks                 | src/components/marketing/HowItWorks.tsx                 | none                              | named  | card        | `__tests__/unit/components/marketing/HowItWorks.test.tsx`             | none |
| MarketingPreviewCardStatic | src/components/marketing/MarketingPreviewCardStatic.tsx | `MarketingPreviewCardStaticProps` | named  | —           | none                                                                  | none |
| MarketingPreviewCard       | src/components/marketing/MarketingPreviewCard.tsx       | `MarketingPreviewCardProps`       | named  | —           | `__tests__/unit/components/marketing/MarketingPreviewCard.test.tsx`   | none |
| ParallaxStarsCanvas        | src/components/marketing/ParallaxStarsCanvas.tsx        | inline                            | named  | —           | none                                                                  | none |
| ParallaxStars              | src/components/marketing/ParallaxStars.tsx              | none                              | named  | —           | none                                                                  | none |
| PhoneMockup                | src/components/marketing/PhoneMockup.tsx                | none                              | named  | —           | `__tests__/components/PhoneMockup.test.tsx`                           | none |
| ScrollZoomShowcase         | src/components/marketing/ScrollZoomShowcase.tsx         | inline                            | named  | badge       | none                                                                  | none |

### `couples/` + `features/couples/` + `providers/` (16)

| Component                   | File                                                            | Props                              | Export | shadcn deps                         | Tests                                                                    | A11y                                                                    |
| --------------------------- | --------------------------------------------------------------- | ---------------------------------- | ------ | ----------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| CouplesActivityFeed         | src/components/couples/CouplesActivityFeed.tsx                  | `CouplesActivityFeedProps`         | named  | button, card                        | none                                                                     | none                                                                    |
| NoHouseholdState            | src/components/couples/CouplesEmptyStates.tsx                   | `NoHouseholdStateProps`            | named  | button, card                        | `__tests__/unit/components/couples/CouplesEmptyStates.test.tsx`          | none                                                                    |
| CouplesErrorBoundary        | src/components/couples/CouplesErrorBoundary.tsx                 | `Props`                            | named  | button, card                        | `__tests__/unit/components/couples/CouplesErrorBoundary.test.tsx`        | none                                                                    |
| CouplesHero                 | src/components/couples/CouplesHero.tsx                          | `CouplesHeroProps`                 | named  | card, skeleton                      | none                                                                     | none                                                                    |
| CouplesHeroSkeleton         | src/components/couples/CouplesLoadingStates.tsx                 | none                               | named  | card, skeleton                      | none                                                                     | none                                                                    |
| FloatingHearts              | src/components/couples/CouplesMicroInteractions.tsx             | inline                             | named  | —                                   | none                                                                     | none                                                                    |
| CouplesMutualLikesSection   | src/components/couples/CouplesMutualLikesSection.tsx            | `CouplesMutualLikesSectionProps`   | named  | button, card                        | none                                                                     | none                                                                    |
| CouplesPageClient           | src/components/couples/CouplesPageClient.tsx                    | none                               | named  | button, card                        | `__tests__/unit/components/couples/CouplesPageClient.test.tsx`           | none                                                                    |
| CouplesStats                | src/components/couples/CouplesStats.tsx                         | `CouplesStatsProps`                | named  | card                                | none                                                                     | none                                                                    |
| DisputedPropertiesAlert     | src/components/couples/DisputedPropertiesAlert.tsx              | `DisputedPropertiesAlertProps`     | named  | badge, button, card                 | none                                                                     | missing-aria-label                                                      |
| DisputedPropertiesView      | src/components/couples/DisputedPropertiesView.tsx               | `DisputedPropertiesViewProps`      | named  | badge, button, card                 | `__tests__/unit/components/couples/DisputedPropertiesView.test.tsx`      | missing-aria-label                                                      |
| InvitePartnerModal          | src/components/couples/InvitePartnerModal.tsx                   | `InvitePartnerModalProps`          | named  | alert, badge, button, dialog, input | `__tests__/unit/components/couples/InvitePartnerModal.test.tsx`          | none                                                                    |
| CouplesMilestoneCelebration | src/components/features/couples/CouplesMilestoneCelebration.tsx | `CouplesMilestoneCelebrationProps` | named  | —                                   | none                                                                     | div-as-button, no-kbd-handler, modal-no-focus-trap, live-region-missing |
| MutualLikesBadge            | src/components/features/couples/MutualLikesBadge.tsx            | `MutualLikesBadgeProps`            | named  | badge                               | `__tests__/unit/components/features/couples/MutualLikesBadge.test.tsx`   | none                                                                    |
| MutualLikesSection          | src/components/features/couples/MutualLikesSection.tsx          | `MutualLikesSectionProps`          | named  | button, card, skeleton              | `__tests__/unit/components/features/couples/MutualLikesSection.test.tsx` | none                                                                    |
| CouplesProgressProvider     | src/components/providers/CouplesProgressProvider.tsx            | `CouplesProgressProviderProps`     | named  | —                                   | none                                                                     | none                                                                    |

### `dashboard/` + `features/dashboard/` + `features/properties/` + `features/storytelling/` + `properties/` (14)

| Component                   | File                                                             | Props                            | Export | shadcn deps                                               | Tests                                                                              | A11y             |
| --------------------------- | ---------------------------------------------------------------- | -------------------------------- | ------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- |
| DashboardErrorBoundary      | src/components/dashboard/DashboardErrorBoundary.tsx              | `Props`                          | named  | button, card                                              | `__tests__/unit/components/dashboard/DashboardErrorBoundary.test.tsx`              | none             |
| DashboardSkeleton           | src/components/dashboard/DashboardSkeleton.tsx                   | none                             | named  | card, skeleton                                            | none                                                                               | none             |
| EnhancedDashboardPageImpl   | src/components/dashboard/EnhancedDashboardPageImpl.tsx           | `EnhancedDashboardPageImplProps` | named  | skeleton                                                  | none                                                                               | none             |
| EnhancedPropertyCard        | src/components/dashboard/EnhancedPropertyCard.tsx                | `EnhancedPropertyCardProps`      | named  | property-image, card, badge, button                       | `__tests__/unit/components/dashboard/EnhancedPropertyCard.test.tsx`                | none             |
| GroupedViewedPropertiesPage | src/components/dashboard/GroupedViewedPropertiesPage.tsx         | `PropertySectionProps`           | named  | button                                                    | `__tests__/unit/components/dashboard/GroupedViewedPropertiesPage.test.tsx`         | none             |
| HouseholdActivityPage       | src/components/dashboard/HouseholdActivityPage.tsx               | none                             | named  | button, skeleton                                          | none                                                                               | none             |
| InteractionsListPage        | src/components/dashboard/InteractionsListPage.tsx                | `InteractionsListPageProps`      | named  | button                                                    | `__tests__/unit/components/InteractionsListPage.test.tsx`                          | none             |
| MutualLikesComparePanel     | src/components/dashboard/MutualLikesComparePanel.tsx             | `MutualLikesComparePanelProps`   | named  | card, button, property-image                              | `__tests__/unit/components/dashboard/MutualLikesComparePanel.test.tsx`             | none             |
| MutualLikesListPage         | src/components/dashboard/MutualLikesListPage.tsx                 | none                             | named  | card, button, skeleton, property-image, motion-components | `__tests__/unit/components/dashboard/MutualLikesListPage.test.tsx`                 | none             |
| DashboardPropertyGrid       | src/components/features/dashboard/DashboardPropertyGrid.tsx      | `DashboardPropertyGridProps`     | named  | button                                                    | `__tests__/unit/components/features/dashboard/DashboardPropertyGrid.test.tsx`      | swipe-no-kbd-alt |
| DashboardStats              | src/components/features/dashboard/DashboardStats.tsx             | `DashboardStatsProps`            | named  | skeleton                                                  | `__tests__/unit/components/DashboardStats.test.tsx`                                | none             |
| PropertySwiper              | src/components/features/properties/PropertySwiper.tsx            | `PropertySwiperProps`            | named  | —                                                         | `__tests__/unit/components/PropertySwiper.test.tsx`                                | none             |
| StorytellingDescription     | src/components/features/storytelling/StorytellingDescription.tsx | `StorytellingDescriptionProps`   | named  | badge, motion-components                                  | `__tests__/unit/components/features/storytelling/StorytellingDescription.test.tsx` | none             |
| SwipeablePropertyCard       | src/components/properties/SwipeablePropertyCard.tsx              | `SwipeablePropertyCardProps`     | named  | motion-components, motion-button                          | `__tests__/unit/components/properties/SwipeablePropertyCard.test.tsx`              | none             |

### `features/auth/` + `profile/` + `settings/` + `legal/` (22)

| Component              | File                                               | Props                         | Export | shadcn deps                                                  | Tests                                                                | A11y                                                              |
| ---------------------- | -------------------------------------------------- | ----------------------------- | ------ | ------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| AuthPageShell          | src/components/features/auth/AuthPageShell.tsx     | `AuthPageShellProps`          | named  | —                                                            | `__tests__/unit/components/features/auth/AuthPageShell.test.tsx`     | none                                                              |
| LoginForm              | src/components/features/auth/LoginForm.tsx         | none                          | named  | button, input, card, alert, form                             | `__tests__/unit/components/auth/LoginForm.test.tsx`                  | none                                                              |
| ResetPasswordForm      | src/components/features/auth/ResetPasswordForm.tsx | none                          | named  | button, form, input, card, alert                             | `__tests__/unit/components/features/auth/ResetPasswordForm.test.tsx` | none                                                              |
| SignupForm             | src/components/features/auth/SignupForm.tsx        | none                          | named  | button, input, card, alert, form                             | `__tests__/unit/components/auth/SignupForm.test.tsx`                 | none                                                              |
| VerifyEmailForm        | src/components/features/auth/VerifyEmailForm.tsx   | none                          | named  | button, input, card, alert, form                             | `__tests__/unit/components/auth/VerifyEmailForm.test.tsx`            | none                                                              |
| ActivityStats          | src/components/profile/ActivityStats.tsx           | `ActivityStatsProps`          | named  | —                                                            | `__tests__/unit/components/profile/ActivityStats.test.tsx`           | none                                                              |
| AvatarPicker           | src/components/profile/AvatarPicker.tsx            | `AvatarPickerProps`           | named  | dialog, button                                               | `__tests__/unit/components/profile/AvatarPicker.test.tsx`            | img-no-alt                                                        |
| AvatarUploader         | src/components/profile/AvatarUploader.tsx          | `AvatarUploaderProps`         | named  | button                                                       | `__tests__/unit/components/profile/AvatarUploader.test.tsx`          | div-as-button, no-kbd-handler, missing-aria-label, input-no-label |
| HouseholdSection       | src/components/profile/HouseholdSection.tsx        | `HouseholdSectionProps`       | named  | button, alert                                                | `__tests__/unit/components/profile/HouseholdSection.test.tsx`        | input-no-label, missing-aria-label                                |
| ProfileForm            | src/components/profile/ProfileForm.tsx             | `ProfileFormProps`            | named  | button, alert, form                                          | `__tests__/unit/components/profile/ProfileForm.test.tsx`             | none                                                              |
| ProfilePageClient      | src/components/profile/ProfilePageClient.tsx       | `ProfilePageClientProps`      | named  | button, tabs                                                 | `__tests__/unit/components/profile/ProfilePageClient.test.tsx`       | missing-aria-label                                                |
| AccountSection         | src/components/settings/AccountSection.tsx         | `AccountSectionProps`         | named  | button, alert                                                | `__tests__/unit/components/settings/AccountSection.test.tsx`         | none                                                              |
| LocationMapSelector    | src/components/settings/LocationMapSelector.tsx    | `LocationMapSelectorProps`    | named  | button                                                       | none                                                                 | none                                                              |
| NotificationsSection   | src/components/settings/NotificationsSection.tsx   | `NotificationsSectionProps`   | named  | label, switch, button                                        | `__tests__/unit/components/settings/NotificationsSection.test.tsx`   | none                                                              |
| PreferencesSection     | src/components/settings/PreferencesSection.tsx     | `PreferencesSectionProps`     | named  | label, switch, slider, input, checkbox, tabs, select, button | `__tests__/unit/components/settings/PreferencesSection.test.tsx`     | none                                                              |
| SavedSearchesSection   | src/components/settings/SavedSearchesSection.tsx   | `SavedSearchesSectionProps`   | named  | button                                                       | `__tests__/unit/components/settings/SavedSearchesSection.test.tsx`   | none                                                              |
| SettingsPageClient     | src/components/settings/SettingsPageClient.tsx     | `SettingsPageClientProps`     | named  | tabs, button                                                 | `__tests__/unit/components/settings/SettingsPageClient.test.tsx`     | none                                                              |
| AdSenseGate            | src/components/legal/AdSenseGate.tsx               | none                          | named  | —                                                            | none                                                                 | none                                                              |
| AnalyticsGate          | src/components/legal/AnalyticsGate.tsx             | none                          | named  | —                                                            | none                                                                 | none                                                              |
| CookieConsentBanner    | src/components/legal/CookieConsentBanner.tsx       | none                          | named  | button, switch                                               | none                                                                 | none                                                              |
| CookiePreferencesPanel | src/components/legal/CookiePreferencesPanel.tsx    | `CookiePreferencesPanelProps` | named  | button, switch                                               | none                                                                 | none                                                              |

### `ads/` + `layouts/` + `property/` + `shared/` (21)

| Component                | File                                                 | Props                           | Export          | shadcn deps         | Tests                                                                                                                               | A11y               |
| ------------------------ | ---------------------------------------------------- | ------------------------------- | --------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| InFeedAd                 | src/components/ads/InFeedAd.tsx                      | `InFeedAdProps`                 | named + default | —                   | `__tests__/unit/components/ads/InFeedAd.test.tsx`                                                                                   | none               |
| Footer                   | src/components/layouts/Footer.tsx                    | `FooterProps`                   | named           | —                   | `__tests__/unit/components/layouts/Footer.test.tsx`                                                                                 | none               |
| Header                   | src/components/layouts/Header.tsx                    | none                            | named           | —                   | `__tests__/unit/components/layouts/Header.test.tsx`                                                                                 | none               |
| MobileBottomNav          | src/components/layouts/MobileBottomNav.tsx           | `MobileBottomNavProps`          | named           | —                   | `__tests__/unit/components/layouts/MobileBottomNav.test.tsx`                                                                        | none               |
| EnhancedPropertyMap      | src/components/property/EnhancedPropertyMap.tsx      | `EnhancedPropertyMapProps`      | named           | —                   | none                                                                                                                                | map-no-alt-content |
| PropertyCard             | src/components/property/PropertyCard.tsx             | `PropertyCardProps`             | named           | —                   | `__tests__/unit/components/PropertyCard.test.tsx` (+ `PropertyCard.neighborhoodVibes.test.tsx` + `dashboard/PropertyCard.test.tsx`) | none               |
| PropertyCardUI           | src/components/property/PropertyCardUI.tsx           | `PropertyCardUIProps`           | named           | —                   | `__tests__/unit/components/property/PropertyCardUI.test.tsx`                                                                        | none               |
| PropertyDetailModal      | src/components/property/PropertyDetailModal.tsx      | `PropertyDetailModalProps`      | named           | dialog, badge       | `__tests__/unit/components/property/PropertyDetailModal.test.tsx` (+ `.gallery.test.tsx`)                                           | swipe-no-kbd-alt   |
| PropertyDetailProvider   | src/components/property/PropertyDetailProvider.tsx   | `PropertyDetailProviderProps`   | named           | —                   | none                                                                                                                                | none               |
| PropertyDetailRouteModal | src/components/property/PropertyDetailRouteModal.tsx | `PropertyDetailRouteModalProps` | named           | —                   | none                                                                                                                                | none               |
| PropertyMap              | src/components/property/PropertyMap.tsx              | `PropertyMapProps`              | named           | —                   | `__tests__/unit/components/PropertyMap.test.tsx`                                                                                    | map-no-alt-content |
| SwipeContainer           | src/components/property/SwipeContainer.tsx           | `SwipeContainerProps`           | named           | —                   | `__tests__/unit/components/property/SwipeContainer.test.tsx`                                                                        | swipe-no-kbd-alt   |
| AsyncErrorBoundary       | src/components/shared/AsyncErrorBoundary.tsx         | inline                          | named           | button, card, badge | `__tests__/unit/components/shared/AsyncErrorBoundary.test.tsx`                                                                      | none               |
| ErrorBoundary            | src/components/shared/ErrorBoundary.tsx              | inline                          | named           | button              | `__tests__/unit/components/shared/ErrorBoundary.test.tsx`                                                                           | none               |
| HomeMatchLogo            | src/components/shared/home-match-logo.tsx            | `HomeMatchLogoProps`            | named           | —                   | none                                                                                                                                | none               |
| PerformanceProvider      | src/components/shared/PerformanceProvider.tsx        | inline                          | named           | —                   | none                                                                                                                                | none               |
| ProfileMenu              | src/components/shared/ProfileMenu.tsx                | `ProfileMenuProps`              | named           | dropdown-menu       | none                                                                                                                                | none               |
| PropertyCardSkeleton     | src/components/shared/PropertyCardSkeleton.tsx       | none                            | named           | skeleton            | none                                                                                                                                | none               |
| PropertyErrorBoundary    | src/components/shared/PropertyErrorBoundary.tsx      | inline                          | named           | button, card        | `__tests__/unit/components/shared/PropertyErrorBoundary.test.tsx`                                                                   | none               |
| SecureMapLoader          | src/components/shared/SecureMapLoader.tsx            | `SecureMapLoaderProps`          | named           | —                   | `__tests__/unit/components/SecureMapLoader.test.tsx`                                                                                | none               |
| UserAvatar               | src/components/shared/UserAvatar.tsx                 | `UserAvatarProps`               | named           | avatar              | `__tests__/unit/components/shared/UserAvatar.test.tsx`                                                                              | none               |

---

## Methodology

- 6 parallel read-only scan agents read every file under `src/components/` in full.
- Test mapping was built from `__tests__/unit/components/**/*.test.{ts,tsx}` and `__tests__/components/`.
- A11y heuristics are static-analysis style (presence/absence of attributes and handlers); they are not a substitute for running axe/Playwright a11y scans.
- shadcn deps column lists imports from `@/components/ui/*`. Underlying radix primitives are noted as `radix:<package>` for the `ui/` row.
- "Component" is the primary exported component per file. Compound exports (e.g. `Card`, `CardHeader`, `CardTitle`, `CardContent`) are abbreviated with `+sub`.

## Recommendations (non-binding)

1. **Test gap in `legal/`** — `CookieConsentBanner`, `CookiePreferencesPanel`, `AdSenseGate`, `AnalyticsGate` have zero tests but gate compliance behaviour. Worth covering before any GDPR/CCPA review.
2. **`CouplesMilestoneCelebration` is the worst-offender** — four a11y issues + no test. A single fix pass + a test would close the largest cluster on the report.
3. **Three `swipe-no-kbd-alt` flags** (`SwipeContainer`, `PropertyDetailModal` gallery, `DashboardPropertyGrid`) — keyboard alternatives for the swipe primitive would resolve all three downstream callers.
4. **Two `map-no-alt-content` flags** (`PropertyMap`, `EnhancedPropertyMap`) — surfacing the map data as a list view would close both.
5. **`AvatarUploader` quad-issue** — the drop-zone + hidden file input pattern is a known a11y pitfall; refactoring once fixes div-as-button, no-kbd-handler, missing-aria-label, and input-no-label together.
