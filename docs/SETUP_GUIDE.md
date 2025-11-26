# HomeMatch - Setup Guide & Project Status

📍 **You are here**: [Documentation Hub](./README.md) → **Setup Guide** → [Architecture](./ARCHITECTURE.md) → [Testing](./TESTING.md)

**Last Updated**: November 22, 2025  
**Status**: Marketing site, Supabase auth, and the dashboard swipe experience are live; property search, ML ranking, households, and jobs are still in progress.

> **📖 Reading Path**: Start here for setup → [ARCHITECTURE.md](./ARCHITECTURE.md) for system design → [TESTING.md](./TESTING.md) for development workflows

## Table of Contents

1. [Current Implementation Status](#current-implementation-status)
2. [Development Environment Setup](#development-environment-setup)
3. [Development Roadmap](#development-roadmap)
4. [MVP Requirements](#mvp-requirements)
5. [Project Structure](#project-structure)
6. [Technical Debt & Next Steps](#technical-debt--next-steps)
7. [Timeline & Risk Mitigation](#timeline--risk-mitigation)

## Current Implementation Status

### 🟢 Working Now

- **Infrastructure**: Next.js 15 App Router with TypeScript strict; Supabase with RLS and PostGIS migrations in `supabase/migrations`; seed fixtures in `supabase/seed.sql` and `migrated_data/`.
- **Auth**: Email/password + Google OAuth, protected routes via middleware, profile/settings pages create missing profiles for OAuth users.
- **Dashboard**: Swipe experience backed by `PropertyService.searchProperties`, optimistic like/pass/view tracking, interaction APIs, mutual likes surfaced with celebration states, and Liked/Passed/Viewed pages.
- **Marketing**: Landing page (Hero, FeatureGrid, HowItWorks, CTA band) with marketing cards pulled from Supabase properties or `migrated_data/seed-properties.json` fallback.
- **User/validation**: Profile, Settings, Couples page, and `/validation` dashboard to verify tables, PostGIS, and service health.
- **APIs**: Interactions, couples mutual likes/stats, marketing properties, and Zillow random-image fallback for demos.
- **Tooling**: Jest, Vitest, and Playwright suites configured; lint/type-check/format scripts in package.json; CI workflows in `.github/workflows/`.

### 🟡 In Progress

- Property search UI/filters beyond the dashboard feed
- ML scoring / recommendation pipeline
- Household invitations and shared decision lists
- Background jobs (Inngest) and cron utilities wiring
- Additional marketing/onboarding flows

### 🔴 Not Started

- Natural language search / AI-assisted query translation

---

## Development Environment Setup

### Prerequisites

- Node.js 18+ with pnpm
- Git Bash (Windows)
- Supabase account
- RapidAPI account (Zillow API)

### Initial Project Setup

#### 1. Create Next.js Project ✅ **COMPLETED**

```bash
# Create new project with TypeScript and Tailwind
pnpm dlx create-next-app@latest homematch-v2 --typescript --tailwind --app --src-dir --import-alias "@/*"

cd homematch-v2

# Install core dependencies
pnpm install @supabase/supabase-js @supabase/ssr
pnpm install @tanstack/react-query @tanstack/react-query-devtools
pnpm install zustand
pnpm install zod react-hook-form @hookform/resolvers
pnpm install lucide-react class-variance-authority clsx tailwind-merge

# Background jobs and workflows
pnpm install inngest

# AI integration
pnpm install ai @ai-sdk/openai

# Monitoring and analytics
pnpm install @sentry/nextjs posthog-js posthog-node

# Development dependencies
pnpm install -D @types/node @types/react @types/react-dom
pnpm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
pnpm install -D jest jest-environment-jsdom
pnpm install -D @playwright/test
pnpm install -D eslint-config-next eslint-plugin-react-hooks eslint-plugin-react-refresh
pnpm install -D prettier prettier-plugin-tailwindcss
pnpm install -D simple-git-hooks lint-staged @commitlint/cli @commitlint/config-conventional
```

#### 2. Configure shadcn/ui ✅ **COMPLETED**

```bash
# Initialize shadcn/ui
pnpm dlx shadcn@latest init

# Install essential components
pnpm dlx shadcn@latest add button card input label form dialog sheet
pnpm dlx shadcn@latest add dropdown-menu avatar badge sonner tabs
pnpm dlx shadcn@latest add select checkbox switch slider progress
pnpm dlx shadcn@latest add alert alert-dialog

# Initialize testing frameworks
pnpm dlx playwright install
pnpm dlx playwright install-deps

# Initialize git hooks
npx simple-git-hooks
```

### Environment Variables

Create `.env.local`:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth (Required for Auth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# External APIs (Optional)
RAPIDAPI_KEY=your_rapidapi_key_for_zillow
OPENAI_API_KEY=your_openai_key

# Monitoring (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=your_sentry_dsn

# Inngest (Optional)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

### Essential Commands

```bash
pnpm run dev           # Start development server
pnpm run lint          # Lint and type-check
pnpm run test          # Run test suite
pnpm run db:migrate    # Apply database migrations
pnpm run build         # Production build
```

### Supabase Setup

#### Local Development

```bash
# Use ONLY this command format on Windows
pnpm dlx supabase@latest start -x studio,mailpit,imgproxy,storage-api,logflare,vector,supavisor,edge-runtime

# Access local studio at http://localhost:54323
```

#### Database Schema

Key tables implemented:

- `user_profiles` - User information and preferences
- `neighborhoods` - Geographic boundaries with PostGIS
- `properties` - Property listings with spatial data
- `interactions` - User property interactions (like/pass/view)
- `households` - Multi-user property sharing
- `searches` - Search history and preferences

---

## Development Roadmap (near term)

- Ship property search/listing UI with filters and pagination (and `/api/properties/search`)
- Add property detail view and richer cards with metadata
- Wire household invitations + shared lists/decisions on top of existing couples endpoints
- Introduce ML scoring pipeline and persistence for recommendations
- Activate background jobs (Inngest/cron) for ingest, status refresh, and notifications
- Polish onboarding/marketing flows and CTA conversion paths

## MVP Requirements

### Must Have

1. ✅ User authentication
2. ✅ Landing page
3. 🚧 Property search
4. 🚧 Property details
5. 🚧 Save/favorite properties beyond swipe lists
6. ✅ User dashboard (swipe + liked/passed/viewed)

### Post-MVP

- ML recommendations
- Household collaboration
- Natural language search
- Automated ingest/background integrations

---

## Project Structure

```
/app                   # Next.js App Router (pages, API routes)
/lib                   # Business logic (auth, services, ML, API clients)
  /supabase           # Database clients
  /services           # Business logic
  /schemas            # Validation schemas
/components            # React components by feature
/types                # TypeScript definitions
```

## Key Patterns

- **API routes**: `/app/api` → business logic in `/lib/services`
- **Validation**: Zod schemas in `/lib/schemas`
- **Auth**: Supabase RLS policies for data access
- **Data**: Store ML scores in JSONB fields
- **Testing**: Use auth helpers for protected routes
- **Migrations**: Prefix files with `YYYYMMDDHHMMSS` format

## Technical Debt & Next Steps

### Code Quality

- Harden service error handling consistency (ApiErrorHandler, Supabase client patterns)
- Trim legacy roadmap code and unused stubs in property search
- Add stricter typing for preferences and interaction payloads

### Performance

- Improve Supabase query plans/indexes for property feed
- Measure marketing card/landing performance budgets
- Add lightweight monitoring hooks (PostHog/Sentry wiring)
- Keep bundle size checks in CI green

### Testing

- Run full Jest/Vitest/Playwright regularly; add smoke for marketing API and couples flows
- Add visual regression coverage for landing hero/feature grid
- Expand auth + households integration tests once invites ship

---

## Summary

HomeMatch is running with auth, marketing, and dashboard/couples flows. The next milestones are property search + detail experiences, households collaboration, and ML scoring with background jobs. Keep docs in sync with feature work and revisit this guide whenever a new endpoint or page ships.
