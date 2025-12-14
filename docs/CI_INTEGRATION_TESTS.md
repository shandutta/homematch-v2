# CI Integration Tests Documentation

A comprehensive guide to the GitHub Actions CI/CD pipeline for integration testing with real database connections.

## Quick Start Guide

### For Developers

```bash
# Setup CI environment locally
pnpm run ci:setup

# Start local Supabase
supabase start

# Run integration tests
pnpm run ci:test:integration

# Validate database schema
pnpm run ci:validate:schema

# Test RLS policies
pnpm run ci:validate:rls
```

### NPM Scripts Added

```bash
# CI Setup and Validation
pnpm run ci:setup          # Setup CI environment
pnpm run ci:health         # Health check

# CI Test Execution
pnpm run ci:test:integration  # Run all integration tests
pnpm run ci:test:database     # Database-specific tests
pnpm run ci:test:api          # API integration tests

# CI Validation
pnpm run ci:validate:schema   # Validate database schema
pnpm run ci:validate:rls      # Test RLS policies
```

## Overview

This CI pipeline sets up a complete testing environment with:

- **Real Supabase database** (local instance)
- **Database migrations and schema validation**
- **Test data factory** for realistic test scenarios
- **Parallel test execution** for performance
- **Coverage reporting** and test artifacts
- **Security and performance testing** in parallel jobs

## Pipeline Structure

### Main Jobs

1. **`integration-tests`** - Core integration testing with real database
2. **`performance-tests`** - Performance-focused integration tests (PR only)
3. **`security-tests`** - Security and RLS policy testing (PR only)

### Trigger Events

- **Push to `main` or `develop`**: Runs full integration suite
- **Pull Requests to `main`**: Runs all jobs including performance and security
- **Manual dispatch**: Can be triggered manually with custom parameters

## Files Created

### 1. GitHub Actions Workflow

**File**: `.github/workflows/integration-tests.yml`

**Features**:

- Sets up Ubuntu environment with Node.js 24 and pnpm
- Installs and configures Supabase CLI
- Creates isolated test database environment
- Runs migrations and applies schema
- Executes integration tests with real database connections
- Generates coverage reports and test artifacts
- Provides PR comments with test results

### 2. Database Setup Script

**File**: `scripts/ci-test-setup.sh`

**Purpose**: Prepares CI environment for integration testing

**What it does**:

- Creates test directories and configuration files
- Validates Node.js, pnpm, and Supabase CLI installations
- Sets up environment variables for testing
- Creates database validation and RLS testing scripts
- Configures Jest and Vitest for CI execution

### 3. Environment Configuration

**File**: `.env.ci`

**Contains**:

- Local Supabase connection details
- Test API keys (non-functional)
- Feature flags and test configuration
- Security and performance settings
- Test user credentials

### 4. Utility Scripts

**Created by setup script**:

- `scripts/validate-db-schema.js` - Validates database schema
- `scripts/test-rls-policies.js` - Tests Row Level Security policies
- `scripts/health-check.js` - Project health validation
- `vitest.ci.config.ts` - Vitest configuration for CI
- `jest.ci.config.js` - Jest configuration for CI

## Usage

### Running Locally

To test the CI setup locally:

```bash
# Make setup script executable
chmod +x scripts/ci-test-setup.sh

# Run setup
./scripts/ci-test-setup.sh

# Start Supabase
supabase start

# Run integration tests
pnpm test:integration
```

### Environment Variables in CI

The pipeline uses these key environment variables:

```yaml
# Database Configuration
SUPABASE_URL: http://127.0.0.1:54200
NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54200
SUPABASE_ANON_KEY: [local-test-key]
SUPABASE_SERVICE_ROLE_KEY: [local-service-key]

# External APIs (use GitHub Secrets for real keys)
ZILLOW_API_KEY: ${{ secrets.ZILLOW_API_KEY || 'test-key' }}
GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY || 'test-key' }}
OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY || 'test-key' }}
```

### GitHub Secrets Setup

For production testing, add these secrets to your GitHub repository:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

```
ZILLOW_API_KEY=your-actual-zillow-key
GOOGLE_MAPS_API_KEY=your-actual-google-maps-key
OPENAI_API_KEY=your-actual-openai-key
CODECOV_TOKEN=your-codecov-token
```

## Test Categories

### Integration Tests

- **Database operations** with real connections
- **API endpoint testing** with actual HTTP calls
- **Service layer testing** with real dependencies
- **Authentication flows** with Supabase Auth
- **Geographic queries** with PostGIS functions

### Performance Tests

- **Database query performance**
- **API response time validation**
- **Memory usage monitoring**
- **Concurrent user simulation**
- **Resource utilization tracking**

### Security Tests

- **Row Level Security (RLS) policy validation**
- **Authentication boundary testing**
- **Data access control verification**
- **SQL injection prevention**
- **API security validation**

## Database Setup

### Supabase Configuration

The pipeline uses local Supabase with:

- **PostgreSQL 15** with PostGIS extensions
- **Port 54200** for API server
- **Port 54201** for direct database connection
- **All migrations applied** automatically
- **Test data seeded** via test data factory

### Migration Process

1. **Start Supabase**: Local instance with all services
2. **Reset Database**: `supabase db reset --force`
3. **Apply Migrations**: All files in `supabase/migrations/`
4. **Seed Data**: Run test user creation scripts
5. **Validate Schema**: Check tables and RPC functions

## Test Data Strategy

### Test Data Factory

**File**: `__tests__/utils/test-data-factory.ts`

**Capabilities**:

- Creates realistic test users with profiles
- Generates households with multiple members
- Creates properties with geographic distribution
- Sets up couples scenarios with mutual likes
- Provides ML scoring test scenarios
- Handles cleanup and isolation

### Test Isolation

Each test suite uses:

- **Unique test data** created per test
- **Automatic cleanup** after test completion
- **Database transactions** for rollback capability
- **Isolated user contexts** for auth testing

## Coverage and Reporting

### Coverage Collection

- **Line coverage**: Tracks code execution
- **Branch coverage**: Validates decision paths
- **Function coverage**: Ensures all functions tested
- **Statement coverage**: Verifies statement execution

### Artifacts Generated

- **Test results**: JSON and XML reports
- **Coverage reports**: LCOV, HTML, and JSON formats
- **Performance metrics**: Response times and resource usage
- **Debug logs**: Supabase and application logs

### Codecov Integration

- Automatic upload of coverage data
- PR comments with coverage changes
- Coverage badges and trend analysis
- Integration with GitHub checks

## Performance Optimization

### Pipeline Optimizations

- **Parallel job execution** for different test types
- **Cached dependencies** using pnpm cache
- **Optimized Docker images** for faster startup
- **Resource limits** to prevent timeout issues

### Test Optimizations

- **Concurrent test execution** where safe
- **Shared database instance** across related tests
- **Minimal test data creation** for speed
- **Smart test discovery** and execution

## Monitoring and Debugging

### Health Checks

- **Database connectivity** validation
- **API endpoint** availability checks
- **Service status** monitoring
- **Resource usage** tracking

### Debug Information

On test failures, the pipeline collects:

- **Supabase service logs**
- **Docker container status**
- **Application error logs**
- **Environment variables** (sanitized)
- **Database query logs**

### Troubleshooting Common Issues

#### Database Connection Failures

```bash
# Check Supabase status
supabase status

# Restart services
supabase restart

# Check port availability
netstat -tlnp | grep 54200
```

#### Migration Failures

```bash
# Reset database
supabase db reset --force

# Check migration files
ls -la supabase/migrations/

# Validate SQL syntax
supabase db lint
```

#### Test Timeout Issues

```bash
# Increase timeout in test files
# jest.setTimeout(30000)

# Check resource usage
top -p $(pgrep node)

# Monitor database connections
SELECT * FROM pg_stat_activity;
```

## Security Considerations

### Local Test Keys

The pipeline uses **local Supabase test keys** that are:

- ✅ Safe to commit to version control
- ✅ Only valid for local development
- ✅ Not connected to production services
- ✅ Automatically rotated by Supabase CLI

### Production Considerations

- Use GitHub Secrets for real API keys
- Never commit production credentials
- Validate RLS policies in every test run
- Monitor for security vulnerabilities

## Maintenance

### Regular Updates

- **Supabase CLI**: Update to latest stable version
- **Node.js**: Keep aligned with production environment
- **Dependencies**: Regular security updates
- **Test data**: Refresh test scenarios periodically

### Monitoring

- **Test execution time**: Watch for performance degradation
- **Success rate**: Monitor for flaky tests
- **Resource usage**: Ensure efficient resource utilization
- **Coverage trends**: Track coverage changes over time

## Integration with Development Workflow

### Branch Protection Rules

Configure GitHub branch protection to:

- Require integration tests to pass
- Require up-to-date branches
- Require review from CODEOWNERS
- Prevent force pushes to main

### Pre-commit Hooks

The pipeline integrates with pre-commit hooks:

```bash
# Format code
pnpm run format

# Run linting
pnpm run lint:fix

# Type checking
pnpm run type-check
```

### Local Development

Developers can run the same tests locally:

```bash
# Setup local environment
./scripts/ci-test-setup.sh

# Run all integration tests
pnpm test:integration

# Run specific test suites
pnpm exec vitest run __tests__/integration/api/
pnpm exec vitest run __tests__/integration/database/
```

## Best Practices

### Test Writing

- Use the test data factory for consistent data
- Clean up test data after each test
- Use descriptive test names and descriptions
- Test both success and failure scenarios
- Include performance assertions where relevant

### Database Testing

- Test with realistic data volumes
- Validate database constraints
- Test concurrent access scenarios
- Verify RLS policies thoroughly
- Test migration rollbacks

### CI/CD Optimization

- Keep test execution time under 10 minutes
- Use parallel execution judiciously
- Cache dependencies aggressively
- Fail fast on critical errors
- Provide clear error messages

## Future Enhancements

### Planned Improvements

- **Multi-database testing** (PostgreSQL versions)
- **Cross-browser E2E integration**
- **Load testing integration**
- **Performance regression detection**
- **Automated dependency updates**

### Integration Opportunities

- **Slack/Discord notifications** for test results
- **JIRA integration** for issue tracking
- **Deployment automation** on test success
- **Performance monitoring** integration
- **Security scanning** automation

---

This comprehensive CI integration testing setup ensures reliable, fast, and secure testing of the HomeMatch application with real database connections and production-like scenarios.
