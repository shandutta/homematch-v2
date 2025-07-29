#!/usr/bin/env node

/**
 * Migration Script for HomeMatch v2
 *
 * Usage:
 *   npm run migrate                    # Run full migration
 *   npm run migrate --validate        # Validate data only
 *   npm run migrate --neighborhoods   # Migrate neighborhoods only
 *   npm run migrate --properties      # Migrate properties only
 *   npm run migrate --batch-size=100  # Custom batch size
 */

// Load environment variables
import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') })

import { MigrationRunner } from '../src/lib/migration/migration-runner'

async function main() {
  const args = process.argv.slice(2)

  // Parse command line arguments
  const options = {
    validateOnly: args.includes('--validate'),
    neighborhoodsOnly: args.includes('--neighborhoods'),
    propertiesOnly: args.includes('--properties'),
    batchSize: 50,
    skipDuplicates: true,
    continueOnError: true,
    relaxedValidation: args.includes('--relaxed'),
  }

  // Parse batch size
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='))
  if (batchSizeArg) {
    options.batchSize = parseInt(batchSizeArg.split('=')[1]) || 50
  }

  // Parse other flags
  if (args.includes('--no-skip-duplicates')) {
    options.skipDuplicates = false
  }
  if (args.includes('--stop-on-error')) {
    options.continueOnError = false
  }

  console.log('🏠 HomeMatch v2 Data Migration')
  console.log('================================')
  console.log('')

  const runner = new MigrationRunner()

  try {
    // Show current database stats
    console.log('📊 Current database stats:')
    const currentStats = await runner.getMigrationStats()
    console.log(`   Neighborhoods: ${currentStats.neighborhoods}`)
    console.log(`   Properties: ${currentStats.properties}`)
    console.log('')

    let result

    if (options.validateOnly) {
      console.log('🔍 Running validation only (no data will be inserted)')
      result = await runner.validateData()
    } else if (options.neighborhoodsOnly) {
      console.log('📍 Migrating neighborhoods only')
      const neighborhoodResult = await runner.migrateNeighborhoods(options)
      result = {
        neighborhoods: neighborhoodResult,
        properties: {
          total_processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        },
        totalProcessingTime: 0,
        errors: [],
      }
    } else if (options.propertiesOnly) {
      console.log('🏠 Migrating properties only')
      const propertyResult = await runner.migrateProperties(options)
      result = {
        neighborhoods: {
          total_processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: [],
        },
        properties: propertyResult,
        totalProcessingTime: 0,
        errors: [],
      }
    } else {
      console.log('🚀 Running full migration (neighborhoods + properties)')
      result = await runner.runMigration(options)
    }

    // Generate and display report
    console.log('')
    console.log('📋 Migration Report')
    console.log('===================')
    const report = runner.generateReport(result)
    console.log(report)

    // Save report to file
    const fs = require('fs')
    const reportPath = `migration-report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`
    fs.writeFileSync(reportPath, report)
    console.log('')
    console.log(`📁 Full report saved to: ${reportPath}`)

    // Show final stats
    if (!options.validateOnly) {
      console.log('')
      console.log('📊 Final database stats:')
      const finalStats = await runner.getMigrationStats()
      console.log(
        `   Neighborhoods: ${finalStats.neighborhoods} (+${finalStats.neighborhoods - currentStats.neighborhoods})`
      )
      console.log(
        `   Properties: ${finalStats.properties} (+${finalStats.properties - currentStats.properties})`
      )
    }

    // Exit with appropriate code
    const hasErrors =
      result.errors.length > 0 ||
      result.neighborhoods.failed > 0 ||
      result.properties.failed > 0

    if (hasErrors) {
      console.log('')
      console.log(
        '⚠️  Migration completed with errors. Check the report for details.'
      )
      process.exit(1)
    } else {
      console.log('')
      console.log('✅ Migration completed successfully!')
      process.exit(0)
    }
  } catch (error) {
    console.error('💥 Fatal error during migration:')
    console.error(error)
    process.exit(1)
  }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
HomeMatch v2 Data Migration Tool

Usage:
  npm run migrate                    # Run full migration
  npm run migrate -- --validate     # Validate data only (no insertion)
  npm run migrate -- --neighborhoods # Migrate neighborhoods only
  npm run migrate -- --properties   # Migrate properties only
  npm run migrate -- --relaxed      # Use relaxed validation for properties
  npm run migrate -- --batch-size=100 # Custom batch size (default: 50)
  npm run migrate -- --no-skip-duplicates # Don't skip duplicate records
  npm run migrate -- --stop-on-error # Stop on first error (default: continue)

Examples:
  npm run migrate -- --validate --batch-size=100
  npm run migrate -- --neighborhoods --stop-on-error
  npm run migrate -- --properties --relaxed --no-skip-duplicates

Data Sources:
  - Neighborhoods: migrated_data/neighborhoods_authoritative_rows.csv
  - Properties: migrated_data/properties_rows.csv

The migration will:
1. Transform CSV data to match database schema
2. Validate all data before insertion
3. Handle duplicates and errors gracefully
4. Generate a detailed report with statistics
5. Create PostGIS-compatible geographic data
`)
  process.exit(0)
}

main().catch(console.error)
