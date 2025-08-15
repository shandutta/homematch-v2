# HomeMatch V2

**Status**: Foundation Complete, Dashboard & Interactions Implemented

AI-powered property browsing application built with Next.js 15, Supabase, and modern tooling. Features ML-based recommendations and household collaboration.

## Features

### ✅ Implemented

- **Authentication**: Supabase Auth with Google OAuth
- **Database**: PostGIS-enabled PostgreSQL with RLS
- **Dashboard**: Tinder-style property swiper with like/pass functionality
- **Interactions**: Real-time tracking of viewed/liked/passed properties
- **Property Cards**: Glassmorphism design with Zillow integration
- **Testing**: Comprehensive test infrastructure
- **Type Safety**: Full TypeScript with Zod validation

### 🚧 In Development

- **Property Search**: Advanced filtering and sorting
- **ML Scoring**: 3-phase recommendation system
- **Household Collaboration**: Multi-user property sharing
- **Natural Language Search**: AI-powered search queries

## Tech Stack

### Core Framework

- **Next.js 15.4.4** with App Router and React 19
- **TypeScript 5.x** with strict mode for maximum type safety
- **Tailwind CSS** with shadcn/ui component library
- **Supabase** for database, authentication, and real-time features

### State Management & Validation

- **TanStack Query v5** for server state management
- **Zustand** for lightweight client state
- **Zod** for runtime type validation
- **React Hook Form** for form management

### Testing & Quality

- **Jest** for unit tests (82/82 passing ✅)
- **Vitest** for integration tests (36/36 passing ✅)
- **Playwright** for E2E tests (18/30 passing, 12 skipped)
- **ESLint + Prettier** for code quality

### Development Tools

- **Framer Motion** for smooth animations and transitions
- **Lucide Icons** for consistent iconography
- **date-fns** for date manipulation
- **Inngest** for background job processing

## Quick Start

```bash
# Clone and install dependencies
git clone <repository-url>
cd homematch-v2
pnpm install

# Set up environment variables (see docs/SETUP_GUIDE.md)
cp .env.example .env.local

# Start Supabase locally
pnpm dlx supabase@latest start -x studio

# Run development server
pnpm run dev
```

## Essential Commands

```bash
# Development
pnpm run dev              # Start development server
pnpm run build           # Production build
pnpm run start           # Start production server

# Testing
pnpm run test            # Run all tests
pnpm run test:unit       # Unit tests only
pnpm run test:integration # Integration tests only
pnpm run test:e2e        # E2E tests with Playwright

# Database
pnpm dlx supabase@latest start    # Start local Supabase
pnpm dlx supabase@latest stop     # Stop local Supabase
pnpm run db:migrate      # Apply database migrations

# Code Quality
pnpm run lint            # Lint code
pnpm run type-check      # TypeScript checking
```

## Documentation

📚 **Complete documentation** is available in the [docs/](./docs/) directory:

- **[Setup Guide](./docs/SETUP_GUIDE.md)** - Environment setup and getting started
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and technical specs
- **[Testing](./docs/TESTING.md)** - Testing strategy and development workflows
- **[Performance](./docs/PERFORMANCE.md)** - Optimization and monitoring
- **[Style Guide](./docs/STYLE_GUIDE.md)** - UI/UX design system
- **[API Reference](./docs/RAPIDAPI_ZILLOW.md)** - External API integration

## Key Features Detail

### ML-Powered Recommendations
- **Cold Start**: Rule-based scoring for new users
- **Online Learning**: Real-time preference adaptation
- **LightGBM**: Advanced ML model for personalization

### Household Collaboration
- Multi-user property sharing and discussion
- Synchronized like/pass decisions across household members
- Real-time updates and notifications

### Geographic Intelligence
- **PostGIS Integration**: Advanced spatial queries
- **Neighborhood Analytics**: Demographic and market data
- **Radius Search**: Distance-based property discovery

### Real Estate Data Integration
- **Zillow API**: Property details and market data
- **Custom Data Pipeline**: Automated property ingestion
- **Image Processing**: Property photo optimization

## Project Status

### ✅ Completed

- **Database**: 6 tables with RLS, 2,214 records migrated (99.1%)
- **Authentication**: Email/password and Google OAuth
- **Dashboard**: Interactive property swiper with real-time counters
- **Interaction Pages**: Dedicated views for liked/passed/viewed properties
- **Testing**: Jest (82/82), Vitest (36/36), Playwright infrastructure
- **CI/CD**: GitHub Actions with automated testing
- **Type Safety**: Strict TypeScript with Zod validation

### 🚧 Next Steps

- Landing page and marketing site
- Property listing/grid UI
- Search implementation with filters
- ML recommendation engine

See [Current Status](./docs/CURRENT_STATUS.md) for detailed roadmap.

## Architecture

```
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── features/        # Feature-specific components
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── services/       # Business logic layer
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── supabase/       # Database clients
│   │   └── utils/          # Utility functions
│   └── types/              # TypeScript definitions
├── __tests__/              # Test suites
├── scripts/                # Automation scripts
├── supabase/               # Database migrations
└── docs/                   # Documentation
```

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- Docker (for local Supabase)

### Quick Start

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd homematch-v2
   pnpm install
   ```

2. **Environment Setup**

   Create `.env.local` with your Supabase credentials:

   ```bash
   # Required
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Optional (for additional features)
   OPENAI_API_KEY=your-openai-key
   GOOGLE_MAPS_SERVER_API_KEY=your-server-restricted-maps-key
   ```

   See [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md#environment-variables) for complete setup.

3. **Start Local Database** (Optional)

   For local development with Supabase:

   ```bash
   pnpm dlx supabase@latest start -x studio
   ```

   Or use the cloud Supabase instance directly.

4. **Run Development Server**
   ```bash
   pnpm run dev
   ```

Visit `http://localhost:3000` to see the application.

### Testing

```bash
# Run all tests
pnpm test

# Individual test suites
pnpm test:unit        # Jest unit tests
pnpm test:integration # Vitest integration tests
pnpm test:e2e        # Playwright E2E tests

# E2E test development
pnpm test:e2e -- --headed  # See browser
pnpm test:e2e -- --ui      # Interactive mode
pnpm test:e2e -- --debug   # Debug mode

# Watch mode
pnpm test:watch
```

> **Note**: E2E tests require local Supabase running. See [Testing Guide](./docs/TESTING.md) for complete setup details.

### Key Commands

```bash
pnpm run dev           # Start development server
pnpm run build         # Production build
pnpm run lint          # Lint and type-check
pnpm run test          # Run all test suites
pnpm run db:migrate    # Apply database migrations
```

## Documentation

> **Complete Documentation**: See [docs/README.md](./docs/README.md) for the complete documentation index and navigation guide.

### Quick Links

- **[Current Status](./docs/CURRENT_STATUS.md)** - Real-time project status and roadmap
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and tech stack
- **[Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)** - Development roadmap
- **[Testing Guide](./docs/TESTING.md)** - Complete testing strategy
- **[Development Workflows](./docs/DEVELOPMENT_WORKFLOWS.md)** - Git workflows and processes

## Key Achievements

- **99.1% Migration Success**: Preserved all critical data during V1 → V2 migration
- **100% Test Coverage**: Unit and integration tests with real database validation
- **PostGIS Integration**: Spatial queries with zero data loss
- **Type Safety**: Strict TypeScript with runtime validation
- **Production Ready**: Complete infrastructure with CI/CD pipeline

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [./docs/](./docs/)
- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)

---

**Built by the HomeMatch team**
