/**
 * Database Snapshot System for Complex Test Scenarios
 * Enables saving and restoring database states for efficient testing
 */
import { createClient } from '@/lib/supabase/standalone'
import fs from 'fs/promises'
import path from 'path'
import { TestDataFactory } from './test-data-factory'

type SupabaseClient = ReturnType<typeof createClient>

export interface SnapshotMetadata {
  id: string
  name: string
  description: string
  tables: string[]
  recordCounts: Record<string, number>
  createdAt: string
  version: string
}

export interface SnapshotData {
  metadata: SnapshotMetadata
  data: Record<string, any[]>
}

/**
 * Database Snapshot Manager
 * Creates, stores, and restores database snapshots for testing
 */
export class DatabaseSnapshotManager {
  private client: SupabaseClient
  private snapshotDir: string
  private currentSnapshot: SnapshotData | null = null

  constructor(client?: SupabaseClient, snapshotDir?: string) {
    this.client = client || createClient()
    this.snapshotDir = snapshotDir || path.join(process.cwd(), '__tests__', 'snapshots', 'database')
  }

  /**
   * Initialize snapshot directory
   */
  private async ensureSnapshotDir(): Promise<void> {
    try {
      await fs.mkdir(this.snapshotDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create snapshot directory:', error)
    }
  }

  /**
   * Create a snapshot of specified tables
   */
  async createSnapshot(
    name: string,
    tables: string[] = ['user_profiles', 'properties', 'households', 'user_property_interactions'],
    description: string = ''
  ): Promise<SnapshotMetadata> {
    await this.ensureSnapshotDir()

    const snapshotId = `${name}_${Date.now()}`
    const data: Record<string, any[]> = {}
    const recordCounts: Record<string, number> = {}

    // Export data from each table
    for (const table of tables) {
      const { data: tableData, error } = await (this.client as any)
        .from(table)
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error(`Failed to export table ${table}:`, error)
        continue
      }

      data[table] = tableData || []
      recordCounts[table] = data[table].length
    }

    const metadata: SnapshotMetadata = {
      id: snapshotId,
      name,
      description,
      tables,
      recordCounts,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    }

    const snapshot: SnapshotData = {
      metadata,
      data,
    }

    // Save snapshot to file
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`)
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2))

    this.currentSnapshot = snapshot
    return metadata
  }

  /**
   * Load a snapshot from file
   */
  async loadSnapshot(snapshotId: string): Promise<SnapshotData> {
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`)
    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8')
    const snapshot = JSON.parse(snapshotContent) as SnapshotData
    
    this.currentSnapshot = snapshot
    return snapshot
  }

  /**
   * Restore database from a snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = await this.loadSnapshot(snapshotId)
    
    // Complete clearing order including all referenced tables
    const clearOrder = [
      'user_property_interactions',
      'household_members', 
      'property_images',
      'properties',
      'households',
      'user_profiles',
      'users', // Add missing public.users table
    ]

    // Clear existing data with proper deletion strategy
    for (const table of clearOrder) {
      try {
        // Use truncate-like approach: delete all records without conditions
        const { error } = await (this.client as any)
          .from(table)
          .delete()
          .gte('created_at', '1900-01-01') // Match all records with a date condition
        
        if (error && !error.message?.includes('does not exist')) {
          if (process.env.DEBUG_SNAPSHOTS) {
            console.debug(`Warning clearing table ${table}:`, error.message)
          }
        }
      } catch (clearError) {
        // Continue with other tables if one fails
        if (process.env.DEBUG_SNAPSHOTS) {
          console.debug(`Failed to clear table ${table}:`, clearError)
        }
      }
    }

    // Restore data in proper dependency order (NOT reversed)
    const restoreOrder = [
      'users',           // Must be first (referenced by user_profiles)
      'user_profiles',   // References users
      'households',      // Independent table
      'properties',      // Independent table  
      'property_images', // References properties
      'household_members', // References households and user_profiles
      'user_property_interactions', // References users, properties, households
    ]
    
    for (const table of restoreOrder) {
      const tableData = snapshot.data[table]
      if (tableData && tableData.length > 0) {
        try {
          // Insert in batches with conflict resolution
          const batchSize = 100
          for (let i = 0; i < tableData.length; i += batchSize) {
            const batch = tableData.slice(i, i + batchSize)
            
            // Use upsert to handle conflicts gracefully
            const { error } = await (this.client as any)
              .from(table)
              .upsert(batch, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              })
            
            if (error) {
              if (process.env.DEBUG_SNAPSHOTS) {
                console.debug(`Failed to restore batch for table ${table}:`, error.message)
              }
              // Try individual inserts as fallback
              for (const record of batch) {
                try {
                  await (this.client as any)
                    .from(table)
                    .upsert(record, { onConflict: 'id', ignoreDuplicates: true })
                } catch (recordError) {
                  // Silent failure for individual records
                  if (process.env.DEBUG_SNAPSHOTS) {
                    console.debug(`Failed to restore record in ${table}:`, recordError)
                  }
                }
              }
            }
          }
        } catch (tableError) {
          if (process.env.DEBUG_SNAPSHOTS) {
            console.debug(`Failed to restore table ${table}:`, tableError)
          }
        }
      }
    }
  }

  /**
   * List available snapshots
   */
  async listSnapshots(): Promise<SnapshotMetadata[]> {
    await this.ensureSnapshotDir()
    
    const files = await fs.readdir(this.snapshotDir)
    const snapshots: SnapshotMetadata[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const snapshotPath = path.join(this.snapshotDir, file)
        const content = await fs.readFile(snapshotPath, 'utf-8')
        const snapshot = JSON.parse(content) as SnapshotData
        snapshots.push(snapshot.metadata)
      }
    }

    return snapshots.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshotPath = path.join(this.snapshotDir, `${snapshotId}.json`)
    await fs.unlink(snapshotPath)
  }

  /**
   * Create a diff between current database and a snapshot
   */
  async diffWithSnapshot(snapshotId: string): Promise<Record<string, any>> {
    const snapshot = await this.loadSnapshot(snapshotId)
    const diff: Record<string, any> = {}

    for (const table of snapshot.metadata.tables) {
      const { data: currentData } = await (this.client as any)
        .from(table)
        .select('*')
        .order('created_at', { ascending: true })

      const snapshotData = snapshot.data[table]
      
      diff[table] = {
        added: currentData?.length || 0 - snapshotData.length,
        snapshot: snapshotData.length,
        current: currentData?.length || 0,
      }
    }

    return diff
  }
}

/**
 * Pre-defined test scenarios as snapshots
 */
export class TestScenarioSnapshots {
  private manager: DatabaseSnapshotManager
  private factory: TestDataFactory

  constructor(client?: SupabaseClient) {
    this.manager = new DatabaseSnapshotManager(client)
    this.factory = new TestDataFactory(client)
  }

  /**
   * Create a "New User Journey" snapshot
   */
  async createNewUserSnapshot(): Promise<SnapshotMetadata> {
    // Create a fresh user with no interactions
    const _user = await this.factory.createUser({
      preferences: { name: 'New User' } as any,
    })

    // Create available properties
    const _properties = await Promise.all([
      this.factory.createProperty({ city: 'Seattle', price: 500000 }),
      this.factory.createProperty({ city: 'Seattle', price: 600000 }),
      this.factory.createProperty({ city: 'Bellevue', price: 700000 }),
    ])

    return await this.manager.createSnapshot(
      'new_user_journey',
      ['user_profiles', 'properties'],
      'Fresh user with no interactions and available properties'
    )
  }

  /**
   * Create a "Couples with Disputes" snapshot
   */
  async createCouplesDisputeSnapshot(): Promise<SnapshotMetadata> {
    const scenario = await this.factory.createCouplesScenario()
    
    // Add disputed properties (one likes, other dislikes)
    const disputedProperty = await this.factory.createProperty()
    await this.factory.createInteraction(scenario.users[0].id, disputedProperty.id, 'like')
    await this.factory.createInteraction(scenario.users[1].id, disputedProperty.id, 'dislike')

    return await this.manager.createSnapshot(
      'couples_disputes',
      ['user_profiles', 'households', 'household_members', 'properties', 'user_property_interactions'],
      'Couples with mutual likes and disputed properties'
    )
  }

  /**
   * Create a "Geographic Search" snapshot
   */
  async createGeographicSnapshot(): Promise<SnapshotMetadata> {
    // Create properties in different neighborhoods
    const _seattleProperties = await this.factory.createGeographicProperties(5, 47.6062, -122.3321)
    const _bellevueProperties = await this.factory.createGeographicProperties(5, 47.6101, -122.2015)
    const _tacomaProperties = await this.factory.createGeographicProperties(5, 47.2529, -122.4443)

    // Create users with location preferences
    const _seattleUser = await this.factory.createUser({
      preferences: { preferred_cities: ['Seattle'] } as any,
    })
    
    const _bellevueUser = await this.factory.createUser({
      preferences: { preferred_cities: ['Bellevue'] } as any,
    })

    return await this.manager.createSnapshot(
      'geographic_search',
      ['user_profiles', 'properties'],
      'Properties distributed across multiple cities for geographic testing'
    )
  }

  /**
   * Create a "ML Training Data" snapshot
   */
  async createMLTrainingSnapshot(): Promise<SnapshotMetadata> {
    // Create multiple users with different preference patterns
    const _scenarios = await Promise.all([
      this.factory.createMLScoringScenario(),
      this.factory.createMLScoringScenario(),
      this.factory.createMLScoringScenario(),
    ])

    return await this.manager.createSnapshot(
      'ml_training_data',
      ['user_profiles', 'properties', 'user_property_interactions'],
      'User interaction patterns for ML model training'
    )
  }

  /**
   * Create a "Performance Testing" snapshot
   */
  async createPerformanceSnapshot(): Promise<SnapshotMetadata> {
    // Create large dataset for performance testing
    const users = await Promise.all(
      Array.from({ length: 50 }, () => this.factory.createUser())
    )
    
    const properties = await Promise.all(
      Array.from({ length: 100 }, () => this.factory.createProperty())
    )

    // Create random interactions
    for (let i = 0; i < 500; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]
      const randomProperty = properties[Math.floor(Math.random() * properties.length)]
      const interactionType = Math.random() > 0.5 ? 'like' : 'dislike'
      
      await this.factory.createInteraction(
        randomUser.id,
        randomProperty.id,
        interactionType as any
      )
    }

    return await this.manager.createSnapshot(
      'performance_testing',
      ['user_profiles', 'properties', 'user_property_interactions'],
      'Large dataset for performance and load testing'
    )
  }

  /**
   * List all available scenario snapshots
   */
  async listScenarios(): Promise<SnapshotMetadata[]> {
    const snapshots = await this.manager.listSnapshots()
    return snapshots.filter(s => 
      ['new_user_journey', 'couples_disputes', 'geographic_search', 'ml_training_data', 'performance_testing']
        .includes(s.name.split('_')[0])
    )
  }
}

/**
 * Test decorator for using snapshots
 */
export function withSnapshot(snapshotName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const manager = new DatabaseSnapshotManager()
      
      // Restore snapshot before test
      await manager.restoreSnapshot(snapshotName)
      
      // Run test
      const result = await originalMethod.apply(this, args)
      
      // Optionally clean up or save state
      return result
    }

    return descriptor
  }
}

/**
 * Jest helper for snapshot-based tests
 */
export async function setupSnapshotTest(snapshotName: string) {
  const manager = new DatabaseSnapshotManager()
  await manager.restoreSnapshot(snapshotName)
  
  return {
    manager,
    factory: new TestDataFactory(),
    cleanup: async () => {
      // Optionally clean up after test
    },
  }
}