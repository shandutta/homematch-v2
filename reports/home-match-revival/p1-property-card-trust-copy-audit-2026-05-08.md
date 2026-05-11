# P1 Property Card Trust Copy — Audit & Future-Gating Map

Generated: 2026-05-08
Scope: Phase 1 docs slice. Inventories where source / freshness / incomplete-data / match-explanation copy is _currently rendered_ on property card and detail surfaces vs. _remains future-gated_. No schema, route, or component changes — this is a static audit only, intended to fix the current copy contract before any UX or recommendations work touches these surfaces.

## How to read this

- **Surface** = the React component file users actually see.
- **Currently rendered** = strings/atoms that ship today, quoted from source with `path:line` references.
- **Future-gated** = the trust dimension is _not_ surfaced today; the underlying field/feature may exist in the schema or planning docs, but no visible card copy maps to it. These are the regression risks if a future PR claims to "show source" or "show freshness" without first pinning the current absence.

The four trust dimensions tracked here are:

1. **Source / provenance** — does the card disclose where the listing data originated (Zillow / RapidAPI / MLS / broker)?
2. **Freshness** — does the card disclose when the listing or its images were last refreshed (e.g., "Listed 3 days ago", "Images refreshed yesterday")?
3. **Incomplete-data treatment** — when nullable fields are missing, does the card explain _why_ the value is unknown rather than rendering bare `—`?
4. **Match explanation** — does the card explain _why this property is being shown to this user_ (recommendation reasoning, mutual-like reasoning beyond the existing badge)?

## Surface-by-surface map

### `src/components/property/PropertyCardUI.tsx` — primary swipe card

- **Source / provenance**: **future-gated**. The "View on Zillow" `ExternalLink` icon at `src/components/property/PropertyCardUI.tsx:210-219` is the only artifact that even implies a source, and it is presented as an outbound link, not a provenance label. No `data-testid="property-source"` or analogous string is emitted.
- **Freshness**: **future-gated**. `propertySchema` already carries `created_at`, `updated_at`, `zillow_images_refreshed_at`, `zillow_images_refreshed_count`, and `zillow_images_refresh_status` (`src/lib/schemas/property.ts:108-117`), but `PropertyCardUI` renders none of them. There is no "Listed N days ago" string and no images-refresh indicator.
- **Incomplete-data treatment**: **rendered as bare sentinel only**. `formatCount` and `formatSquareFeet` collapse `null` to `'—'` (`src/components/property/PropertyCardUI.tsx:81-90`); the rendering at lines 263-277 emits the em-dash next to `bed`/`bath`/`sqft` labels with no clarifying microcopy. The card cannot tell the user whether the data is missing because the listing did not report it or because ingestion failed.
- **Match explanation**: **future-gated**. The card surfaces a "Home vibe" panel (`src/components/property/PropertyCardUI.tsx:286-303`) backed by `usePropertyVibes`, and a "Neighborhood vibe" tagline (lines 305-319). Neither claims to be a _match_ explanation; they describe the listing/area, not why it was selected for this viewer. The `MutualLikesIndicator` at lines 199-205 is a relationship signal, not a per-property recommendation reason. CLAUDE.md still lists "ML Scoring: 3-phase recommendation system (planned)" — match-explanation copy is consciously deferred.

### `src/components/property/PropertyDetailModal.tsx` — full-screen detail modal

- **Source / provenance**: **future-gated**. The Zillow icon link (`src/components/property/PropertyDetailModal.tsx:294-302`) and the Google Maps link (lines 507-518) are outbound CTAs without a "Data via …" provenance line.
- **Freshness**: **future-gated**. `property.year_built` is the only temporal copy ("Built in {year_built}", lines 401-406). No "Last updated", "Listed", or "Images refreshed" string is emitted, even though all of those fields exist in the property record.
- **Incomplete-data treatment**: **mixed (silent omission + bare sentinel)**. `year_built` is conditionally hidden when null (line 401), so the absence is invisible to the user. `formatSquareFeet` and `formatCount` (lines 196-205) emit `'—'` in the 3-stat grid (lines 377-399) without context.
- **Match explanation**: **future-gated**. "Vibe snapshot" combines `vibes.tagline` (or a derived one-liner from the description) with `neighborhoodVibes.vibe_statement` (lines 408-447). Suggested tags render as flat `Badge` chips (lines 448-461) with no explanatory framing such as "Matches your saved preferences for …".

### `src/components/dashboard/EnhancedPropertyCard.tsx` — alternate dashboard card

- **Source / provenance**: **future-gated**. No outbound source link, no provenance label.
- **Freshness**: **future-gated**. No timestamp copy is rendered; `created_at`/`updated_at` are not consumed in this component.
- **Incomplete-data treatment**: **bare sentinel via shared formatters**. `formatBedsBaths` and `formatSquareFeet` are invoked on lines 232-235 and degrade silently for missing values.
- **Match explanation**: **future-gated**. `StorytellingDescription` is rendered with `showNeighborhoodPerks={true}` (lines 239-257), still describing the listing/area rather than ranking rationale. Amenities and a mini-map are commented out (lines 259-278), so even latent context remains hidden.

### `src/components/property/PropertyDetailRouteModal.tsx`

- Thin wrapper around `PropertyDetailModal` (`src/components/property/PropertyDetailRouteModal.tsx:1-30`). Inherits the same audit result as the modal. No additional trust copy is added by this route-level wrapper.

### `src/components/properties/SwipeablePropertyCard.tsx`

- Composes `PropertyCardUI` for the swipe deck. Inherits the same audit result; no additional trust strings are introduced at the wrapper level.

## Schema-level fields available but not yet surfaced

These fields already validate cleanly in `propertySchema` and are therefore _available_ to a future trust-copy slice without schema migrations:

- `created_at` / `updated_at` (`src/lib/schemas/property.ts:108-109`) — could power a "Listed N days ago" / "Updated …" string.
- `zillow_images_refreshed_at`, `zillow_images_refreshed_count`, `zillow_images_refresh_status` (`src/lib/schemas/property.ts:110-117`) — could power an "Images refreshed …" affordance and an explicit `no_images` empty-state explanation.
- `listing_status` (`src/lib/schemas/property.ts:103-105`, enum: `active | pending | sold | for_sale | removed`) — could power an Active/Pending/Sold pill alongside the property-type pill at `src/components/property/PropertyCardUI.tsx:189-196`.

These are _not_ recommended for inclusion in this audit's scope; they are listed so a future trust-copy implementation can be evaluated against an explicit pre-state instead of "the cards used to be silent, I think".

## Cross-surface summary

| Trust dimension      | `PropertyCardUI`             | `PropertyDetailModal`            | `EnhancedPropertyCard` |
| -------------------- | ---------------------------- | -------------------------------- | ---------------------- |
| Source / provenance  | Future-gated                 | Future-gated                     | Future-gated           |
| Freshness            | Future-gated                 | Future-gated (only `year_built`) | Future-gated           |
| Incomplete-data copy | Bare `—` sentinel            | Mixed (hidden + `—`)             | Bare `—` sentinel      |
| Match explanation    | Future-gated (vibes ≠ match) | Future-gated (vibes ≠ match)     | Future-gated           |

## What this audit does _not_ claim

- It does not propose copy. Picking strings ("Listed 3 days ago" vs. "Posted 3 days ago" vs. "Refreshed 3 days ago") is a product/UX decision and not in Phase 1 docs scope.
- It does not assert any trust-copy regression has occurred. The cards never shipped this copy; this is a _baseline_ so a later regression would be detectable.
- It does not propose schema, route, or component changes. The exception list of available fields above is informational only.

## Recommended follow-ups (out of scope here)

1. Decide source-of-truth for provenance display (only Zillow today, but RapidAPI is the actual API; see `docs/RAPIDAPI_ZILLOW.md`). Currently we show Zillow as the _destination_ of the outbound link, not the _source_ of the data.
2. Decide whether incomplete-data should remain `—` (terse) or move to explicit microcopy (trust-positive). The current `formatCount`/`formatSquareFeet` helpers are the single shared place to change this.
3. Defer match-explanation copy until the planned ML scoring phase lands; do not retrofit "Why this match?" copy onto vibe panels, since vibes describe the listing, not the user-property fit.
