# HomeMatch V2

A modern real estate platform that uses machine learning to help users find their perfect home. Built with Next.js 15 and powered by AI-driven property matching algorithms.

## Features

### 🏠 Smart Property Matching

- **ML-Powered Scoring**: 3-phase scoring system (cold-start → online learning → LightGBM)
- **Natural Language Search**: AI-powered complex property queries using Qwen
- **Geographic Intelligence**: PostGIS polygon-based neighborhood analysis
- **Real-time Data**: Zillow API integration for up-to-date property listings

### 👥 Collaborative House Hunting

- **Households**: Multi-user property sharing and collaboration
- **Preference Learning**: System learns from user interactions
- **Saved Searches**: Create and manage custom search alerts

### 🔐 Secure & Scalable

- **Supabase Auth**: Google OAuth with server-side sessions
- **Row Level Security**: Fine-grained access control
- **Type-Safe**: Full TypeScript with strict mode

## Installation

### Prerequisites

- Node.js 18+
- pnpm package manager
- Supabase account
- API keys for Google Maps, Zillow (RapidAPI), and Qwen

### Setup

1. Clone the repository:

git clone https://github.com/yourusername/homematch-v2.git
cd homematch-v2

2. Install dependencies:

pnpm install

3. Configure environment variables:

cp .env.example .env.local

Fill in your environment variables:

# Supabase

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# External APIs

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
RAPIDAPI_KEY=your_rapidapi_key
QWEN_API_KEY=your_qwen_api_key

# Deployment

VERCEL_URL=your_vercel_url
CRON_SECRET=your_cron_secret
INTERNAL_API_KEY=your_internal_api_key

4. Run database migrations:

pnpm run db:migrate

5. Seed test data (optional):

pnpm run db:seed

6. Start the development server:

pnpm run dev

Visit `http://localhost:3000` to see the application.

## Usage

### Development Commands

# Development

pnpm run dev # Start development server with Turbopack
pnpm run type-check # Run TypeScript type checking
pnpm run lint # Run ESLint
pnpm run format # Format code with Prettier
pnpm run lint:fix # Auto-fix linting issues

# Testing

pnpm run test # Run full test suite
pnpm run test:fast # Quick tests (type-check, lint, jest)
pnpm run test:unit # Unit tests only
pnpm run test:integration # Integration tests
pnpm run test:e2e # E2E Playwright tests

# Database & Data

pnpm run db:migrate # Run Supabase migrations
pnpm run db:seed # Seed test data
pnpm run ingest:properties # Ingest property data from Zillow
pnpm run scoring:update # Update ML scoring models

# Production

pnpm run build # Create production build
pnpm run start # Start production server

### API Examples

Search for properties with natural language:

const results = await fetch('/api/search', {
method: 'POST',
body: JSON.stringify({
query: "3 bedroom house near good schools under 500k with a backyard"
})
})

Get ML-scored property recommendations:

const recommendations = await fetch('/api/recommendations', {
headers: {
'Authorization': `Bearer ${token}`
}
})

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Authentication**: Supabase Auth with Google OAuth
- **ML/AI**:
  - LightGBM for property scoring
  - Qwen for natural language processing
  - Custom online learning algorithms
- **APIs**:
  - Zillow (via RapidAPI)
  - Google Maps
- **Testing**: Jest, Playwright
- **Deployment**: Vercel

## Project Structure

homematch-v2/
├── app/ # Next.js App Router
│ ├── api/ # API routes
│ ├── auth/ # Authentication pages
│ └── (main)/ # Main application pages
├── components/ # React components
│ ├── ui/ # Base UI components
│ ├── properties/ # Property-related components
│ └── search/ # Search components
├── lib/ # Business logic
│ ├── auth/ # Authentication utilities
│ ├── services/ # Core services
│ ├── ml/ # Machine learning models
│ ├── api/ # External API clients
│ └── schemas/ # Validation schemas
├── types/ # TypeScript definitions
├── supabase/ # Database migrations
└── tests/ # Test files

## Contributing

We welcome contributions! Please follow these guidelines:

### Code Standards

- **TypeScript**: Use strict mode, avoid `any` types
- **Formatting**: Code is auto-formatted with Prettier on commit
- **Linting**: Must pass ESLint checks
- **Testing**: Add tests for new features

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes following the code standards
3. Run `pnpm run test:fast` to ensure tests pass
4. Submit a pull request with a clear description

### Commit Hooks

The project uses simple-git-hooks to run pre-commit checks:

- Prettier formatting
- ESLint fixes
- TypeScript type checking

### Planning & Documentation

For major features:

1. Create a plan in `.claude/tasks/FEATURE_NAME.md`
2. Document architectural decisions
3. Update relevant documentation

See `CLAUDE.md` for AI-assisted development guidelines and `NEW_ARCHITECTURE.md` for system design details.

## License

This project is private and proprietary.
