# HomeMatch Docs

Start here for setup, architecture, testing, and workflows.

## Core Guides

1. **Setup**: [SETUP_GUIDE.md](SETUP_GUIDE.md) — prerequisites, env, local dev paths
2. **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) — stack, service layer, data access
3. **Testing**: [TESTING.md](TESTING.md) — unit, integration, E2E
4. **Style Guide**: [STYLE_GUIDE.md](STYLE_GUIDE.md) — UI/UX conventions
5. **Business Hardening**: [BUSINESS_HARDENING_REVIEW.md](BUSINESS_HARDENING_REVIEW.md) — product readiness
6. **Secrets**: [secrets.md](secrets.md) — git-secrets scanning

## Reference

- **CI integration tests**: [CI_INTEGRATION_TESTS.md](CI_INTEGRATION_TESTS.md)
- **Couples matching**: [COUPLES_MATCH_PLAN.md](COUPLES_MATCH_PLAN.md)

## Integrations & Ops

- **RapidAPI Zillow**: [RAPIDAPI_ZILLOW.md](RAPIDAPI_ZILLOW.md)
- **Property vibes backfill**: [property-vibes-backfill.md](property-vibes-backfill.md)

## Sources of Truth

- Commands: `package.json`
- Environment: `.env.example`
- Database: `supabase/migrations/`, `supabase/seed.sql`, `migrated_data/`
- CI: `.github/workflows/ci.yml`

## Revival Reports

Phase 0/1 evidence packets live in `reports/home-match-revival/` — operating plan, route inventory, traversal matrix, readiness backlogs. These are archival, not day-one product docs.

Obsolete point-in-time docs were archived or removed during the P6 rewrite. Retained artifacts live in `reports/home-match-revival/archived-docs/`.
