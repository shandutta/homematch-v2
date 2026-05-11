# UX Spec — Couples Review, Saved-Search, Compare

**Task:** `t_eab22374` (parent `t_ff763f6d`)
**Owner:** `pm`
**Date:** 2026-05-09
**Consumers:** implementation slice `t_7dd78d5d`, acceptance pass `t_d258ca31`

---

## Purpose

Define the user-facing acceptance criteria for the three Phase-2 couples surfaces that the kanban roadmap calls out: **couples review**, **saved-search**, and **compare**. The criteria below are the contract the implementation slice must satisfy and the reviewer must verify in the browser walkthrough — every must-clause is a checkable line item.

Scope is product behavior and copy, not visual polish. Visual tokens follow `src/app/globals.css` (`--color-token-*`, `--spacing-*`, `--font-size-*`) and the existing couples palette (`text-couples-primary`, `--gradient-marketing-primary`). When in doubt, reuse `src/components/couples/CouplesEmptyStates.tsx`, `CouplesLoadingStates.tsx`, and `CouplesErrorBoundary.tsx` rather than introducing a new shell.

---

## 1) Couples Review

The "review" surface is the couples dashboard view of mutual + disputed candidates plus the per-property decision flow at `src/app/couples/decisions/page.tsx`. The current implementation already paints mutual likes (`src/components/couples/CouplesMutualLikesSection.tsx`) and disputed properties (`src/app/api/couples/disputed/route.ts`), but the partner-state language is inconsistent and the empty/error/loading triad is not enforced uniformly.

### Acceptance criteria

- **Partner state is always visible.** Every property card on `/couples` and `/couples/decisions` must render one of the four explicit labels: `Both liked`, `You liked · partner hasn't seen`, `Partner liked · awaiting your call`, `Disputed`. No card may render a heart/state icon without an accompanying text label (a11y: screen readers must hear the state without color cues).
- **Decision actions are reversible within the session.** The decision page must offer Like, Pass, and Save-for-later. Any of the three actions must surface a `Sonner` toast with an `Undo` action that remains live for ≥ 6 s and reverts the optimistic mutation on click. After 6 s the action is committed and `Undo` disappears.
- **Disputed properties surface both partners' reasons** when present. If the schema has a partner note (`couples.disputed.note`), it renders verbatim under the partner's avatar; if absent, the row collapses with no placeholder text (do not invent copy like "no reason given").
- **Empty / loading / error states are first-class.**
  - Empty (no mutual likes yet) → `CouplesEmptyStates` "Start swiping together" with one primary CTA to `/dashboard`.
  - Loading (initial fetch, no cached data) → skeleton from `CouplesLoadingStates` for ≥ 1 row, capped at 6.
  - Error (any 4xx/5xx from `/api/couples/*`) → `CouplesErrorBoundary` with a `Try again` button that re-runs the failed query only (must not reload the page).
- **Annotations persist across sessions.** When a user adds a note on a candidate (textarea, max 280 chars, soft cap with character counter at 240), the note must round-trip through the API and be visible to the partner on next load. Empty notes do not render.
- **Mutation safety.** Like/Pass/Save calls must include the couple's `couple_id` and the actor's `user_id` and must fail closed if either is missing — the UI shows the error toast, no optimistic state remains.

### Verification (must be checkable by the reviewer)

- Each of the four partner-state labels can be reproduced from a known fixture row.
- Toast `Undo` reverts the row inside the 6 s window in a Playwright check.
- Forcing `/api/couples/mutual-likes` to return 500 (msw / network throttle) renders the error boundary, not a blank panel.

---

## 2) Saved-Search

Saved searches live at `src/components/settings/SavedSearchesSection.tsx`, behind the settings page. The data shape is `SavedSearch` from `src/types/database.ts`. The current view lists searches with toggles for notifications and a delete button; what is missing is consistent state coverage and a clear "what does this search find right now" affordance.

### Acceptance criteria

- **A saved search row shows a recency signal.** Each row renders `Last run · <relative time>` derived from the most recent matching property scan (or `Never run yet` for brand-new rows). Relative format: `just now / Xm ago / Xh ago / Yesterday / MMM D`.
- **Run-now is one click.** Each row exposes a primary action `Run search` that navigates to `/dashboard?savedSearch=<id>` and pre-applies the filters. The dashboard must read the query param on mount and hydrate filter state before the first list paint.
- **Notification toggle is honest.** When the user flips the bell, the UI optimistically updates _and_ shows a toast: "You'll be notified when new matches appear" or "Notifications off." If the PATCH fails the toggle reverts and an error toast appears. There is no silent failure path.
- **Delete requires confirmation.** Trash icon opens a destructive `AlertDialog` ("Delete this saved search? This cannot be undone."). Cancel must close the dialog without mutation. Confirm calls the API; on success the row animates out (`AnimatePresence`); on failure the row stays and an error toast appears.
- **Filter chips render on every row.** Each saved search shows the human-readable filter set as chips (location, price band, beds, home type). Chips are read-only on this surface — editing happens by running the search and re-saving from `/dashboard`.
- **Empty / loading / error.**
  - Empty (no saved searches) → friendly empty state with primary CTA `Save your first search` linking to `/dashboard`.
  - Loading → 3 skeleton rows.
  - Error (`getUserSavedSearches` throws) → inline error block with `Retry`. Do not fall back to "you have no saved searches" on a fetch failure — that is the existing bug surface.
- **Pagination / cap.** If a user has > 20 saved searches, list the first 20 newest-first and render a `Show all` link. (The cap is informational; we do not add server pagination in this slice.)

### Verification

- Network failure on initial load shows the error block, not the empty state.
- Toggling notifications with the network offline reverts the bell after the failure toast.
- `Run search` lands on `/dashboard` with filters applied (visible in the active filter chips).

---

## 3) Compare

The compare surface today is `src/components/dashboard/MutualLikesComparePanel.tsx`. Acceptance below assumes selection is initiated from the mutual-likes list and rendered as a slide-in panel, not a separate route.

### Acceptance criteria

- **Selection model.** Users select 2–4 properties to compare. Below 2 selected, the `Compare` CTA is disabled with tooltip "Select at least 2 properties." Above 4, additional checkboxes are disabled with tooltip "Compare up to 4 at a time."
- **Compare panel layout.** One column per property, sticky header row showing the property image, address, and a remove (`X`) button. Subsequent rows render: price, beds, baths, square feet, $/sqft (computed), HOA (if present), days on market (if present).
- **Best-value highlighting is explicit.** For each numeric row the cell with the most favorable value is rendered in `text-couples-primary font-semibold`. "Most favorable" means lowest price, lowest $/sqft, lowest HOA; highest beds, baths, sqft. Ties get no highlight. If fewer than 2 rows have data for a metric, no highlight is applied (current behavior in `MutualLikesComparePanel.tsx:46`).
- **Missing data renders as `—`, never as `0` or `N/A`.** A property missing `square_feet` shows `—` in both the sqft and $/sqft rows.
- **Remove keeps the panel open.** Removing a property drops it from the panel; if the remaining count is < 2 the panel closes automatically and a toast says "Select more properties to compare."
- **Close is non-destructive.** Closing the panel preserves the selection set in component state for the duration of the dashboard session, so the user can re-open `Compare` without re-selecting. A page navigation clears it.
- **Empty / loading / error.**
  - Empty (compare invoked with 0 — should not happen, but guard) → render the "Select at least 2 properties" message inside the panel rather than crashing.
  - Loading (per-property detail fetch) → skeleton rows beneath the address header; do not show partial data.
  - Error (any per-property fetch fails) → inline `—` for that column's cells plus a small `Retry` link in that column header.
- **Keyboard + a11y.** Panel is focus-trapped while open. `Esc` closes it. Each remove `X` is a real `<button>` with `aria-label="Remove <address> from compare"`.

### Verification

- Select 4 properties, confirm 5th checkbox is disabled with the tooltip.
- Compare two properties where one is missing `square_feet`; confirm `—` and no NaN.
- Force one property's detail fetch to error; confirm only that column degrades, the other stays intact.

---

## Cross-cutting requirements

These apply to all three surfaces and are part of the acceptance bar.

- **No production mutations in QA.** Browser walkthrough must run against seeded fixtures (or `mockServiceWorker`), never against live couple data.
- **Auth.** All three surfaces require an authenticated session. Unauthenticated access redirects to `/login?next=<path>`. The reviewer must confirm the redirect on each route, since `t_d7` (disputed-route exposure closure) covers a related class of bug.
- **Telemetry hooks.** Each primary action (decide, save-search-run, compare-open) must call the existing PostHog wrapper (`captureEvent`) with the action name. No PII in event properties — couple IDs and property IDs only.
- **Reduced motion.** All animated transitions on these surfaces must respect `prefers-reduced-motion` (skip the `framer-motion` slide/fade and snap to final state). The global rule in `globals.css:1120` does not cover `framer-motion` components — implementation must gate motion explicitly.
- **Mobile parity.** Compare collapses to a horizontally scrollable single-row layout below `md`. Saved-search rows stack vertically; chips wrap. Couples decision actions remain sticky to the bottom safe area on mobile.

---

## Out of scope (explicitly)

- Sharing a compare view with the partner via link (deferred).
- Saved-search push notifications (the toggle controls in-app + email only for this slice).
- Annotation history / threaded notes (single latest note per partner per property is enough).
- Reordering compare columns by drag (acceptable to defer to a later polish slice).

---

## Sign-off checklist for `t_d258ca31`

- [ ] Four partner-state labels reproducible on couples review.
- [ ] Like/Pass/Save toast `Undo` reverts inside 6 s window.
- [ ] `/api/couples/mutual-likes` 500 surfaces the error boundary.
- [ ] Saved-search load failure surfaces error block, not empty state.
- [ ] Notification toggle reverts on PATCH failure.
- [ ] Delete saved search requires `AlertDialog` confirm.
- [ ] Compare disabled below 2 / above 4 with correct tooltips.
- [ ] Best-value highlighting matches rules; missing data renders `—`.
- [ ] All three surfaces honor `prefers-reduced-motion`.
- [ ] Unauthenticated access redirects with `?next=` preserved.
