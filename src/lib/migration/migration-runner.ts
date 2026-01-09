import { createStandaloneClient } from '@/lib/supabase/standalone'
import {
  DataTransformer,
  RawNeighborhoodData,
  RawPropertyData,
  MigrationStats,
} from './data-transformer'
import { RelaxedPropertyTransformer } from './relaxed-property-transformer'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

export interface MigrationRunnerOptions {
  batchSize?: number
  validateOnly?: boolean
  skipDuplicates?: boolean
  continueOnError?: boolean
  relaxedValidation?: boolean // New option for relaxed property validation
}

export interface MigrationResult {
  neighborhoods: MigrationStats
  properties: MigrationStats
  totalProcessingTime: number
  errors: string[]
}

export class MigrationRunner {
  private supabase: SupabaseClient<AppDatabase>
  private transformer = new DataTransformer()
  private relaxedTransformer = new RelaxedPropertyTransformer()

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private getString(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value.toString()
    return fallback
  }

  private getOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') return value || undefined
    if (typeof value === 'number') return value.toString()
    return undefined
  }

  constructor() {
    this.supabase = createStandaloneClient()
  }

  /**
   * Run complete migration from CSV files
   */
  async runMigration(
    options: MigrationRunnerOptions = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now()
    const {
      batchSize = 50,
      validateOnly = false,
      skipDuplicates = true,
      continueOnError = true,
      relaxedValidation = false,
    } = options

    console.log('🚀 Starting migration process...')
    console.log(
      `Settings: batchSize=${batchSize}, validateOnly=${validateOnly}, relaxedValidation=${relaxedValidation}`
    )

    const result: MigrationResult = {
      neighborhoods: {
        total_processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      },
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

    try {
      // Step 1: Migrate neighborhoods first (properties depend on them)
      console.log('📍 Migrating neighborhoods...')
      const neighborhoodResult = await this.migrateNeighborhoods({
        batchSize,
        validateOnly,
        skipDuplicates,
        continueOnError,
      })
      result.neighborhoods = neighborhoodResult

      if (!validateOnly && neighborhoodResult.successful === 0) {
        result.errors.push(
          'No neighborhoods were successfully migrated. Cannot proceed with properties.'
        )
        return result
      }

      // Step 2: Migrate properties
      console.log('🏠 Migrating properties...')
      const propertyResult = await this.migrateProperties({
        batchSize,
        validateOnly,
        skipDuplicates,
        continueOnError,
      })
      result.properties = propertyResult

      console.log('✅ Migration completed successfully!')
    } catch (error) {
      const errorMessage = `Fatal migration error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      console.error(errorMessage)
      result.errors.push(errorMessage)
    }

    result.totalProcessingTime = Date.now() - startTime
    return result
  }

  /**
   * Migrate neighborhoods from CSV
   */
  async migrateNeighborhoods(
    options: MigrationRunnerOptions
  ): Promise<MigrationStats> {
    const {
      batchSize = 50,
      validateOnly = false,
      skipDuplicates = true,
    } = options

    const stats: MigrationStats = {
      total_processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // Read and parse JSON (better data source with real names)
      const jsonPath = path.join(
        process.cwd(),
        'migrated_data',
        'all-neighborhoods-combined.json'
      )
      const jsonContent = readFileSync(jsonPath, 'utf-8')
      const parsed = JSON.parse(jsonContent)
      const records = Array.isArray(parsed) ? parsed : []

      console.log(`📊 Found ${records.length} neighborhood records`)
      stats.total_processed = records.length

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        console.log(
          `📍 Processing neighborhood batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}...`
        )

        for (const [index, record] of batch.entries()) {
          const globalIndex = i + index

          try {
            // Type guard for record structure
            const recordData = this.isRecord(record) ? record : {}

            // Convert JSON record to our format
            const rawNeighborhood: RawNeighborhoodData = {
              metro_area: this.getString(recordData.metro_area, 'Unknown'),
              name: this.getString(recordData.name),
              region: this.getOptionalString(recordData.region),
              polygon: this.getString(recordData.polygon),
              city: this.getString(recordData.city, 'Unknown'),
              state: 'CA', // Default from data (all current data is CA)
            }

            // Transform the data
            const transformResult = this.transformer.transformNeighborhood(
              rawNeighborhood,
              globalIndex
            )

            if (!transformResult.success) {
              stats.failed++
              stats.errors.push({
                index: globalIndex,
                data: rawNeighborhood,
                errors: transformResult.errors,
              })
              continue
            }

            if (validateOnly) {
              stats.successful++
              continue
            }

            // Check for duplicates if enabled
            if (skipDuplicates && transformResult.data) {
              const { data: existingNeighborhoods } = await this.supabase
                .from('neighborhoods')
                .select('*')
                .eq('city', transformResult.data.city)
                .eq('state', transformResult.data.state)

              const duplicate = existingNeighborhoods?.find(
                (n) => n.name === transformResult.data!.name
              )

              if (duplicate) {
                stats.skipped++
                console.log(
                  `⏭️  Skipping duplicate neighborhood: ${transformResult.data.name}`
                )
                continue
              }
            }

            // Insert into database
            if (transformResult.data) {
              const { data: created, error } = await this.supabase
                .from('neighborhoods')
                .insert(transformResult.data)
                .select()
                .single()

              if (created && !error) {
                stats.successful++
                console.log(`✅ Created neighborhood: ${created.name}`)
              } else {
                stats.failed++
                stats.errors.push({
                  index: globalIndex,
                  data: rawNeighborhood,
                  errors: [
                    `Failed to create neighborhood in database: ${error?.message || 'Unknown error'}`,
                  ],
                })
              }
            }
          } catch (error) {
            stats.failed++
            stats.errors.push({
              index: globalIndex,
              data: this.isRecord(record) ? record : { value: record },
              errors: [
                `Processing error: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              ],
            })
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < records.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      const errorMessage = `Neighborhood migration error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      console.error(errorMessage)
      stats.errors.push({
        index: -1,
        data: null,
        errors: [errorMessage],
      })
    }

    console.log(
      `📍 Neighborhoods: ${stats.successful} successful, ${stats.failed} failed, ${stats.skipped} skipped`
    )
    return stats
  }

  /**
   * Migrate properties from CSV
   */
  async migrateProperties(
    options: MigrationRunnerOptions
  ): Promise<MigrationStats> {
    const {
      batchSize = 50,
      validateOnly = false,
      skipDuplicates = true,
      relaxedValidation = false,
    } = options

    const stats: MigrationStats = {
      total_processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    try {
      // Read and parse CSV
      const csvPath = path.join(
        process.cwd(),
        'migrated_data',
        'properties_rows.csv'
      )
      const csvContent = readFileSync(csvPath, 'utf-8')
      const parsed = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      })
      const records = Array.isArray(parsed)
        ? parsed.filter((row) => this.isRecord(row))
        : []

      console.log(`📊 Found ${records.length} property records`)
      stats.total_processed = records.length

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        console.log(
          `🏠 Processing property batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}...`
        )

        for (const [index, record] of batch.entries()) {
          const globalIndex = i + index

          try {
            // Convert CSV record to our format
            const rawProperty: RawPropertyData = {
              id: this.getOptionalString(record.id),
              zpid: this.getOptionalString(record.zpid),
              address: this.getString(record.address),
              city: this.getString(record.city),
              state: this.getString(record.state, 'CA'),
              zip_code: this.getString(record.zip_code),
              price: Number(this.getString(record.price, '0')) || 0,
              bedrooms: Number(this.getString(record.bedrooms, '0')) || 0,
              bathrooms: Number(this.getString(record.bathrooms, '0')) || 0,
              square_feet: record.square_feet
                ? Number(this.getString(record.square_feet, '0'))
                : undefined,
              lot_size: record.lot_size
                ? Number(this.getString(record.lot_size, '0'))
                : undefined,
              year_built: record.year_built
                ? Number(this.getString(record.year_built, '0'))
                : undefined,
              property_type: this.getOptionalString(record.property_type),
              listing_status:
                this.getOptionalString(record.listing_status) ?? 'active',
              images: this.getOptionalString(record.images),
              created_at: this.getOptionalString(record.created_at),
              updated_at: this.getOptionalString(record.updated_at),
              neighborhood_id: this.getOptionalString(record.neighborhood_id),
              latitude: record.latitude
                ? Number(this.getString(record.latitude, '0'))
                : undefined,
              longitude: record.longitude
                ? Number(this.getString(record.longitude, '0'))
                : undefined,
              neighborhood: this.getOptionalString(record.neighborhood),
              property_hash: this.getOptionalString(record.property_hash),
            }

            // Transform the data using appropriate transformer
            const transformResult = relaxedValidation
              ? this.relaxedTransformer.transformProperty(
                  rawProperty,
                  globalIndex
                )
              : this.transformer.transformProperty(rawProperty, globalIndex)

            if (!transformResult.success) {
              stats.failed++
              stats.errors.push({
                index: globalIndex,
                data: rawProperty,
                errors: transformResult.errors,
              })
              continue
            }

            if (validateOnly) {
              stats.successful++
              continue
            }

            // Check for duplicates if enabled
            if (skipDuplicates && transformResult.data) {
              let duplicate = null

              // Check by ZPID first
              if (rawProperty.zpid) {
                const { data } = await this.supabase
                  .from('properties')
                  .select('*')
                  .eq('zpid', rawProperty.zpid)
                  .eq('is_active', true)
                  .single()
                duplicate = data
              }

              // Check by hash if no ZPID duplicate found
              if (!duplicate && rawProperty.property_hash) {
                const { data } = await this.supabase
                  .from('properties')
                  .select('*')
                  .eq('property_hash', rawProperty.property_hash)
                  .eq('is_active', true)
                  .single()
                duplicate = data
              }

              if (duplicate) {
                stats.skipped++
                console.log(
                  `⏭️  Skipping duplicate property: ${transformResult.data.address}`
                )
                continue
              }
            }

            // Insert into database
            if (transformResult.data) {
              const { data: created, error } = await this.supabase
                .from('properties')
                .insert(transformResult.data)
                .select()
                .single()

              if (created && !error) {
                stats.successful++
                console.log(`✅ Created property: ${created.address}`)
              } else {
                stats.failed++
                stats.errors.push({
                  index: globalIndex,
                  data: rawProperty,
                  errors: [
                    `Failed to create property in database: ${error?.message || 'Unknown error'}`,
                  ],
                })
              }
            }
          } catch (error) {
            stats.failed++
            stats.errors.push({
              index: globalIndex,
              data: this.isRecord(record) ? record : { value: record },
              errors: [
                `Processing error: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              ],
            })
          }
        }

        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < records.length) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    } catch (error) {
      const errorMessage = `Property migration error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
      console.error(errorMessage)
      stats.errors.push({
        index: -1,
        data: null,
        errors: [errorMessage],
      })
    }

    console.log(
      `🏠 Properties: ${stats.successful} successful, ${stats.failed} failed, ${stats.skipped} skipped`
    )
    return stats
  }

  /**
   * Generate migration report
   */
  generateReport(result: MigrationResult): string {
    const { neighborhoods, properties, totalProcessingTime, errors } = result

    const report = `
# Migration Report

## Summary
- **Total Processing Time**: ${(totalProcessingTime / 1000).toFixed(2)}s
- **Overall Status**: ${errors.length === 0 ? '✅ Success' : '❌ Errors encountered'}

## Neighborhoods
- **Total Processed**: ${neighborhoods.total_processed}
- **Successful**: ${neighborhoods.successful}
- **Failed**: ${neighborhoods.failed}
- **Skipped**: ${neighborhoods.skipped}
- **Success Rate**: ${neighborhoods.total_processed > 0 ? ((neighborhoods.successful / neighborhoods.total_processed) * 100).toFixed(1) : 0}%

## Properties
- **Total Processed**: ${properties.total_processed}
- **Successful**: ${properties.successful}
- **Failed**: ${properties.failed}
- **Skipped**: ${properties.skipped}
- **Success Rate**: ${properties.total_processed > 0 ? ((properties.successful / properties.total_processed) * 100).toFixed(1) : 0}%

## Errors
${errors.length > 0 ? errors.map((error, i) => `${i + 1}. ${error}`).join('\n') : 'No fatal errors'}

## Detailed Errors
### Neighborhood Errors (${neighborhoods.errors.length})
${neighborhoods.errors
  .slice(0, 10)
  .map((error, i) => `${i + 1}. Row ${error.index}: ${error.errors.join(', ')}`)
  .join('\n')}
${neighborhoods.errors.length > 10 ? `... and ${neighborhoods.errors.length - 10} more` : ''}

### Property Errors (${properties.errors.length})
${properties.errors
  .slice(0, 10)
  .map((error, i) => `${i + 1}. Row ${error.index}: ${error.errors.join(', ')}`)
  .join('\n')}
${properties.errors.length > 10 ? `... and ${properties.errors.length - 10} more` : ''}
`

    return report.trim()
  }

  /**
   * Validate data without inserting
   */
  async validateData(): Promise<MigrationResult> {
    return this.runMigration({ validateOnly: true })
  }

  /**
   * Helper to extract city from display name or other fields
   */
  private extractCityFromDisplayName(displayName?: string): string | null {
    if (!displayName) return null

    // Simple extraction - can be enhanced based on data patterns
    const parts = displayName.split(',')
    return parts[0]?.trim() || null
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<{
    neighborhoods: number
    properties: number
    lastMigration?: Date
  }> {
    try {
      // Get counts from database
      const { count: neighborhoodCount, error: neighborhoodError } =
        await this.supabase
          .from('neighborhoods')
          .select('*', { count: 'exact', head: true })

      const { count: propertyCount, error: propertyError } = await this.supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (neighborhoodError) {
        console.error('Error getting neighborhood count:', neighborhoodError)
      }
      if (propertyError) {
        console.error('Error getting property count:', propertyError)
      }

      return {
        neighborhoods: neighborhoodCount || 0,
        properties: propertyCount || 0,
      }
    } catch (error) {
      console.error('Error getting migration stats:', error)
      return {
        neighborhoods: 0,
        properties: 0,
      }
    }
  }
}
