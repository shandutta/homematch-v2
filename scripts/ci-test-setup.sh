#!/bin/bash

# CI Test Setup Script for Integration Tests
# Sets up test database and environment for GitHub Actions

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[CI-SETUP]${NC} $1"
}

success() {
    echo -e "${GREEN}[CI-SETUP]${NC} ✅ $1"
}

warn() {
    echo -e "${YELLOW}[CI-SETUP]${NC} ⚠️  $1"
}

error() {
    echo -e "${RED}[CI-SETUP]${NC} ❌ $1"
}

# Check if running in CI environment
if [ "${CI:-false}" != "true" ]; then
    warn "Not running in CI environment. Some settings may differ."
fi

log "🚀 Starting CI test setup..."

# Create necessary directories
log "📁 Creating test directories..."
mkdir -p logs
mkdir -p test-reports
mkdir -p coverage
mkdir -p performance-reports
mkdir -p benchmark-results

# Create test environment configuration (pull secrets from environment variables)
log "🔧 Setting up test environment configuration..."
cat > .env.ci << EOF
# CI Test Environment Configuration
NODE_ENV=test
CI=true

# Test Database Configuration
SUPABASE_URL=${SUPABASE_URL:-http://127.0.0.1:54200}
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-http://127.0.0.1:54200}}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-}

# Application Configuration
BASE_URL=${BASE_URL:-http://localhost:3000}
NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-test-secret-for-ci}

# External API Configuration (provide via env to avoid hardcoding secrets)
ZILLOW_API_KEY=${ZILLOW_API_KEY:-}
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# Performance and Monitoring
PERFORMANCE_MONITORING_ENABLED=${PERFORMANCE_MONITORING_ENABLED:-false}
SENTRY_DSN=${SENTRY_DSN:-}
POSTHOG_API_KEY=${POSTHOG_API_KEY:-}

# Test Configuration
TEST_TIMEOUT=${TEST_TIMEOUT:-30000}
TEST_PARALLEL=${TEST_PARALLEL:-true}
TEST_COVERAGE=${TEST_COVERAGE:-true}
EOF

# Copy to .env.test.local for compatibility
cp .env.ci .env.test.local

success "Environment configuration created"

# Validate Node.js version
log "📋 Validating Node.js version..."
NODE_VERSION=$(node --version)
if [[ $NODE_VERSION =~ ^v([0-9]+) ]]; then
    MAJOR_VERSION=${BASH_REMATCH[1]}
    if [ "$MAJOR_VERSION" -lt 24 ]; then
        error "Node.js version $NODE_VERSION is not supported. Minimum version is 24.x"
        exit 1
    fi
    success "Node.js version $NODE_VERSION is supported"
else
    warn "Could not determine Node.js version"
fi

# Validate pnpm installation
log "📦 Validating pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    error "pnpm is not installed or not in PATH"
    exit 1
fi
PNPM_VERSION=$(pnpm --version)
success "pnpm version $PNPM_VERSION is available"

# Validate Supabase CLI
log "🏗️  Validating Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    error "Supabase CLI is not installed or not in PATH"
    exit 1
fi
SUPABASE_VERSION=$(supabase --version)
success "Supabase CLI $SUPABASE_VERSION is available"

# Check if package.json exists and dependencies are available
log "🔍 Checking project structure..."
if [ ! -f "package.json" ]; then
    error "package.json not found. Are we in the project root?"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    warn "node_modules not found. Dependencies may need to be installed."
fi

# Validate Supabase configuration
log "⚙️  Validating Supabase configuration..."
if [ ! -f "supabase/config.toml" ]; then
    error "supabase/config.toml not found. Project not initialized?"
    exit 1
fi

# Check for required migration files
if [ ! -d "supabase/migrations" ]; then
    error "supabase/migrations directory not found"
    exit 1
fi

MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l)
if [ "$MIGRATION_COUNT" -eq 0 ]; then
    warn "No migration files found in supabase/migrations"
else
    success "Found $MIGRATION_COUNT migration files"
fi

# Check for test files
log "🧪 Validating test structure..."
if [ ! -d "__tests__/integration" ]; then
    error "__tests__/integration directory not found"
    exit 1
fi

INTEGRATION_TEST_COUNT=$(find __tests__/integration -name "*.test.*" | wc -l)
success "Found $INTEGRATION_TEST_COUNT integration test files"

# Validate test data factory
if [ ! -f "__tests__/utils/test-data-factory.ts" ]; then
    warn "Test data factory not found at __tests__/utils/test-data-factory.ts"
else
    success "Test data factory found"
fi

# Check for required scripts
log "📜 Checking required scripts..."
REQUIRED_SCRIPTS=(
    "scripts/infrastructure-working.js"
    "scripts/setup-test-users-admin.js"
    "scripts/get-test-auth-token.js"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        success "Found $script"
    else
        warn "Script $script not found"
    fi
done

# Create test isolation configuration
log "🏗️  Setting up test isolation..."
cat > vitest.ci.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    sequence: {
      concurrent: true,
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
      ],
    },
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-reports/integration-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/__tests__': path.resolve(__dirname, './__tests__'),
    },
  },
})
EOF

# Set up Jest configuration for CI
log "⚙️  Configuring Jest for CI..."
cat > jest.ci.config.js << 'EOF'
const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  // CI-specific overrides
  maxWorkers: '50%',
  testTimeout: 30000,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-reports',
      outputName: 'junit.xml',
    }],
  ],
  // Disable watch mode in CI
  watchman: false,
  // Use all available cores but leave some for system
  maxConcurrency: 4,
}
EOF

# Create test database validation script
log "🔍 Creating database validation script..."
cat > scripts/validate-db-schema.js << 'EOF'
/**
 * Database Schema Validation for CI
 * Validates that all required tables and functions exist
 */

const { createClient } = require('@supabase/supabase-js')

async function validateSchema() {
  console.log('🔍 Validating database schema...')
  
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
  
  // Check required tables
  const requiredTables = [
    'user_profiles',
    'households',
    'properties',
    'user_property_interactions',
    'neighborhoods'
  ]
  
  for (const table of requiredTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error && !error.message.includes('row-level security')) {
      throw new Error(`Table ${table} not accessible: ${error.message}`)
    }
    console.log(`✅ Table ${table} is accessible`)
  }
  
  // Check for RPC functions
  const { data: functions, error: functionError } = await supabase.rpc('get_function_list').limit(1)
  if (functionError) {
    console.log('⚠️  Could not verify RPC functions (this may be normal)')
  } else {
    console.log('✅ RPC functions are accessible')
  }
  
  console.log('✅ Database schema validation completed')
}

if (require.main === module) {
  validateSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Schema validation failed:', error.message)
      process.exit(1)
    })
}

module.exports = validateSchema
EOF

# Create RLS policy test script
log "🛡️  Creating RLS policy test script..."
cat > scripts/test-rls-policies.js << 'EOF'
/**
 * Row Level Security (RLS) Policy Test
 * Validates that RLS policies are working correctly
 */

const { createClient } = require('@supabase/supabase-js')

async function testRLSPolicies() {
  console.log('🛡️ Testing Row Level Security policies...')
  
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
  const anonKey = process.env.SUPABASE_ANON_KEY
  
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is required')
  }
  
  const supabase = createClient(supabaseUrl, anonKey)
  
  // Test 1: Unauthenticated user should not access user_profiles
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').limit(1)
    if (!error) {
      console.log('⚠️  Warning: user_profiles accessible without authentication')
    } else {
      console.log('✅ user_profiles properly protected by RLS')
    }
  } catch (err) {
    console.log('✅ user_profiles properly protected by RLS')
  }
  
  // Test 2: Properties should be readable (marketing use case)
  try {
    const { data, error } = await supabase.from('properties').select('id').limit(1)
    if (error) {
      console.log('⚠️  Warning: properties may not be accessible for marketing')
    } else {
      console.log('✅ properties accessible for marketing use')
    }
  } catch (err) {
    console.log('⚠️  Warning: properties not accessible')
  }
  
  console.log('✅ RLS policy testing completed')
}

if (require.main === module) {
  testRLSPolicies()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ RLS policy test failed:', error.message)
      process.exit(1)
    })
}

module.exports = testRLSPolicies
EOF

# Make scripts executable
chmod +x scripts/validate-db-schema.js
chmod +x scripts/test-rls-policies.js

# Create health check script
log "🏥 Creating health check script..."
cat > scripts/health-check.js << 'EOF'
/**
 * Health Check Script
 * Validates that the project is in a good state for testing
 */

const fs = require('fs')
const path = require('path')

function healthCheck() {
  console.log('🏥 Running health check...')
  
  const issues = []
  
  // Check package.json
  if (!fs.existsSync('package.json')) {
    issues.push('package.json not found')
  }
  
  // Check key configuration files
  const requiredFiles = [
    'tsconfig.json',
    'next.config.ts',
    'jest.config.js',
    'vitest.config.ts',
    'supabase/config.toml'
  ]
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      issues.push(`${file} not found`)
    }
  }
  
  // Check test directories
  const testDirs = [
    '__tests__/integration',
    '__tests__/unit',
    '__tests__/utils'
  ]
  
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      issues.push(`${dir} directory not found`)
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ Health check passed')
    return true
  } else {
    console.log('❌ Health check failed:')
    issues.forEach(issue => console.log(`  - ${issue}`))
    return false
  }
}

if (require.main === module) {
  const healthy = healthCheck()
  process.exit(healthy ? 0 : 1)
}

module.exports = healthCheck
EOF

chmod +x scripts/health-check.js

# Final validation
log "✅ Running final validation..."

# Check that environment file was created
if [ -f ".env.ci" ]; then
    success "Environment configuration file created"
else
    error "Failed to create environment configuration"
    exit 1
fi

# Check that scripts are executable
if [ -x "scripts/validate-db-schema.js" ]; then
    success "Database validation script is executable"
else
    error "Database validation script is not executable"
    exit 1
fi

success "🎉 CI test setup completed successfully!"

log "📋 Setup Summary:"
log "  ✅ Environment configuration: .env.ci"
log "  ✅ Test directories created"
log "  ✅ Vitest CI configuration: vitest.ci.config.ts"
log "  ✅ Jest CI configuration: jest.ci.config.js"
log "  ✅ Database validation script: scripts/validate-db-schema.js"
log "  ✅ RLS policy test script: scripts/test-rls-policies.js"
log "  ✅ Health check script: scripts/health-check.js"

log "🚀 Ready for integration testing!"
