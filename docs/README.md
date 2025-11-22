# HomeMatch Documentation Hub

> **Consolidated Documentation**: Essential guides for development, testing, architecture, and deployment of HomeMatch.

This directory contains the core guides plus task management files, organized by topic and purpose. Use this index to quickly find the information you need.

## Quick Navigation

| Document                                                         | Purpose                             | Contains                                                             |
| ---------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**                           | Development setup & project status  | Environment setup, dependencies, configuration, getting started      |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)**                         | Complete system architecture        | Tech stack, database, security patterns, API reference, custom hooks |
| **[REFACTORING_ARCHITECTURE.md](./REFACTORING_ARCHITECTURE.md)** | PropertyService refactoring guide   | Implementation status, migration strategy, performance metrics       |
| **[TESTING.md](./TESTING.md)**                                   | Testing & development workflows     | Unit/integration/E2E testing, git workflows, debugging, deployment   |
| **[PERFORMANCE.md](./PERFORMANCE.md)**                           | Performance optimization guide      | Core Web Vitals, monitoring, testing, optimization strategies        |
| **[STYLE_GUIDE.md](./STYLE_GUIDE.md)**                           | UI/UX design & component guidelines | Design system, component development, accessibility standards        |
| **[PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)**                 | Code quality & analysis reports     | Landing page analysis, performance assessments, best practices       |
| **[RAPIDAPI_ZILLOW.md](./RAPIDAPI_ZILLOW.md)**                   | External API integration            | Zillow API endpoints, authentication, data sync                      |
| **[DEVELOPMENT_WORKFLOWS.md](./DEVELOPMENT_WORKFLOWS.md)**       | Development processes               | Git workflows, code review, testing procedures                       |
| **[CI_INTEGRATION_TESTS.md](./CI_INTEGRATION_TESTS.md)**         | CI/CD testing integration           | Continuous integration, test automation, deployment validation       |
| **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)**           | Refactoring overview                | High-level refactoring status and completed improvements             |
| **README.md** (this file)                                        | Documentation index                 | Quick navigation and getting started                                 |

## Getting Started Paths

### For New Developers

1. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Environment setup and getting started
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and technical architecture
3. **[TESTING.md](./TESTING.md)** - Testing setup and development workflows
4. **[DEVELOPMENT_WORKFLOWS.md](./DEVELOPMENT_WORKFLOWS.md)** - Development processes and procedures

### For Designers

1. **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - Design system, component guidelines, and accessibility
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Component architecture and state management
3. **[PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)** - Code quality assessments and best practices

### For DevOps/QA

1. **[TESTING.md](./TESTING.md)** - Complete testing strategy and CI/CD integration
2. **[CI_INTEGRATION_TESTS.md](./CI_INTEGRATION_TESTS.md)** - Continuous integration and test automation
3. **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance monitoring and optimization
4. **[PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)** - Quality analysis and production readiness

## Current Project Status

**Last Updated**: November 2025  
**Status**: Active development — marketing site, Supabase auth, and dashboard swiper are live; search, ML ranking, and collaboration depth are in progress.

### ✅ Working now

- **Auth**: Supabase auth (email/password + Google) with protected routes
- **Dashboard**: Swipe with like/pass/view tracking and stats
- **Couples**: Mutual likes surfaced on dashboard with celebration states
- **Marketing**: Landing page with feature grid, how-it-works, CTA band, and marketing cards pulled from Supabase/seed
- **User pages**: Liked/Passed/Viewed lists, profile, settings, validation dashboard
- **Testing**: Jest, Vitest, and Playwright suites configured (see `docs/TESTING.md` for setup)

### 🚧 In progress

- **Property Search**: Filters and richer browsing beyond dashboard feed
- **ML Scoring**: Multi-phase recommendation pipeline
- **Households**: Invitations + shared lists/decisions beyond mutual likes
- **Background Jobs**: Inngest/cron wiring
- **Marketing/Onboarding**: Additional pages and flows

## Document Overview

### Core Documentation

- **SETUP_GUIDE.md**: Environment setup and development workflow
- **ARCHITECTURE.md**: System design, database schema, security patterns, and API reference
- **REFACTORING_ARCHITECTURE.md**: PropertyService refactoring guide with implementation status
- **TESTING.md**: Complete testing strategy and quality assurance
- **PERFORMANCE.md**: Optimization guide and monitoring setup
- **STYLE_GUIDE.md**: Design system, component development guidelines, and accessibility
- **PROJECT_ANALYSIS.md**: Code quality analysis, performance assessments, and best practices
- **RAPIDAPI_ZILLOW.md**: External API integration reference
- **DEVELOPMENT_WORKFLOWS.md**: Git workflows, code review, and deployment procedures
- **CI_INTEGRATION_TESTS.md**: Continuous integration and test automation
- **REFACTORING_SUMMARY.md**: High-level refactoring status and completed improvements

### Task Management Files

- **tasks/README.md**: Task management overview and process
- **tasks/completed-features.md**: Completed feature tracking
- **tasks/karen-audit-findings.md**: Quality audit results and findings
- **tasks/master-todo-list.md**: Master project todo and task list

## External Resources

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js 15 Guide**: [nextjs.org/docs](https://nextjs.org/docs)
- **Playwright Documentation**: [playwright.dev](https://playwright.dev)
- **shadcn/ui Components**: [ui.shadcn.com](https://ui.shadcn.com)

## Maintenance

**Documentation is maintained by the HomeMatch development team and updated with each release.**

- **Regular Updates**: Documentation is updated alongside feature work
- **Version Control**: All documentation changes are tracked in git
- **Review Process**: Documentation changes go through the same review process as code
- **Feedback Integration**: Documentation is improved based on developer feedback
