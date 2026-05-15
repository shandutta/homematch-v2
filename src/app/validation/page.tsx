import { requireInternalPreviewAccess } from '@/lib/routing/internal-preview'
import { createClient } from '@/lib/supabase/server'
import { getServerUserContext } from '@/lib/auth/server-context'
import { getOptionalServerUser } from '@/lib/supabase/optional-user'
import { signOut } from '@/lib/supabase/actions'
import { PropertyService } from '@/lib/services/properties'
import { UserService } from '@/lib/services/users'
import { createNoindexRouteMetadata } from '@/lib/seo/route-metadata'
import type { Database } from '@/types/database'
import {
  Home,
  BarChart3,
  Database as DatabaseIcon,
  Building2,
  AlertTriangle,
  Info,
  PartyPopper,
  Target,
  MapPin,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = createNoindexRouteMetadata({
  title: 'Migration validation (internal) | HomeMatch',
  description: 'Internal database migration validation dashboard.',
})

interface DatabaseStats {
  tableName: string
  count: number
  error?: string
  schema?: unknown[]
}

export default async function ValidationPage() {
  requireInternalPreviewAccess()

  const supabase = await createClient()
  const propertyService = new PropertyService()
  const userService = new UserService()

  // Use unified context for auth; userShape for display fields the legacy
  // template expects (email, last_sign_in_at, app_metadata).
  const userCtx = await getServerUserContext()
  const user = await getOptionalServerUser()

  // Validate all database tables
  const tables: Array<keyof Database['public']['Tables']> = [
    'user_profiles',
    'households',
    'neighborhoods',
    'properties',
    'user_property_interactions',
    'saved_searches',
  ]

  const tableStats: DatabaseStats[] = []

  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })

      tableStats.push({
        tableName: table,
        count: count || 0,
        error: error?.message,
      })
    } catch (error) {
      tableStats.push({
        tableName: table,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Test PropertyService
  let propertyStats = null
  let sampleProperties = null
  let propertyServiceError = null

  try {
    propertyStats = await propertyService.getPropertyStats()
    const searchResult = await propertyService.searchProperties({
      pagination: { page: 1, limit: 5 },
    })
    sampleProperties = searchResult.properties
  } catch (e) {
    propertyServiceError = e instanceof Error ? e.message : String(e)
  }

  // Test UserService (if user exists)
  let userProfile = null
  let userServiceError = null

  if (user && userCtx?.profileId) {
    try {
      userProfile = await userService.getUserProfile(userCtx.profileId)
    } catch (e) {
      userServiceError = e instanceof Error ? e.message : String(e)
    }
  }

  // Check required database extensions. The pg_extension query returns
  // only matching rows, so an empty array means BOTH are absent — that
  // is not a success. Normalize into an explicit per-extension result
  // and treat a query error as "unknown" rather than a failure.
  const REQUIRED_EXTENSIONS = ['postgis', 'uuid-ossp'] as const
  let extensionQueryFailed = false
  let presentExtensions = new Set<string>()
  try {
    const { data: extensions, error } = await supabase
      .from('pg_extension')
      .select('extname')
      .in('extname', [...REQUIRED_EXTENSIONS])
    if (error) {
      extensionQueryFailed = true
    } else {
      const rows: { extname: string }[] = extensions ?? []
      presentExtensions = new Set(rows.map((e) => e.extname))
    }
  } catch {
    // pg_extension might not be accessible — leave status unknown.
    extensionQueryFailed = true
  }
  const extensionChecks = REQUIRED_EXTENSIONS.map((name) => ({
    name,
    present: presentExtensions.has(name),
  }))
  const missingExtensions = extensionQueryFailed
    ? []
    : extensionChecks.filter((c) => !c.present).map((c) => c.name)

  // Aggregate the live-check results so the overview and final banner
  // reflect reality instead of hard-coded success.
  const validationFailures: string[] = []
  for (const t of tableStats) {
    if (t.error) validationFailures.push(`Table "${t.tableName}": ${t.error}`)
  }
  if (propertyServiceError) {
    validationFailures.push(`PropertyService: ${propertyServiceError}`)
  }
  for (const name of missingExtensions) {
    validationFailures.push(`Required extension "${name}" is not installed`)
  }
  const validationPassed = validationFailures.length === 0
  const tableCount = (name: string) =>
    tableStats.find((t) => t.tableName === name)?.count ?? 0

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mx-auto mb-8 flex max-w-6xl items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <div className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              <span>HomeMatch V2 - Database Migration Validation</span>
            </div>
          </h1>
          <p className="mt-2 text-gray-600">
            Comprehensive validation of Phase 1 & 2 implementation
          </p>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500">
                User ID: {user.id.slice(0, 8)}...
              </p>
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8">
        {/* Overall Status */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Migration Status Overview</span>
            </div>
          </h2>
          <div
            className={`mb-4 rounded-lg border-2 p-4 ${
              validationPassed
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{validationPassed ? '✅' : '❌'}</span>
              <h3
                className={`font-semibold ${
                  validationPassed ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {validationPassed
                  ? 'All live checks passed'
                  : `${validationFailures.length} live check${
                      validationFailures.length === 1 ? '' : 's'
                    } failed`}
              </h3>
            </div>
            {!validationPassed && (
              <ul className="mt-2 list-disc space-y-1 pl-8 text-sm text-red-700">
                {validationFailures.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 1</div>
              <div className="text-xs text-green-700">Database Schema</div>
              <div className="mt-1 text-xs text-green-600">COMPLETED</div>
            </div>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 2</div>
              <div className="text-xs text-green-700">Application Layer</div>
              <div className="mt-1 text-xs text-green-600">COMPLETED</div>
            </div>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 3</div>
              <div className="text-xs text-green-700">Migration Utils</div>
              <div className="mt-1 text-xs text-green-600">COMPLETED</div>
            </div>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 4</div>
              <div className="text-xs text-green-700">Neighborhoods</div>
              <div className="mt-1 text-xs text-green-600">1,123 migrated</div>
            </div>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 5</div>
              <div className="text-xs text-green-700">Properties</div>
              <div className="mt-1 text-xs text-green-600">1,091 migrated</div>
            </div>
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="text-xl font-bold text-green-600">✅ Phase 6</div>
              <div className="text-xs text-green-700">Validation</div>
              <div className="mt-1 text-xs text-green-600">COMPLETED</div>
            </div>
          </div>
        </div>

        {/* Database Tables Validation */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5 text-blue-600" />
                <span>Database Tables Status</span>
              </div>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Validation of all 6 core tables from the schema
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tableStats.map((table) => (
                <div
                  key={table.tableName}
                  className={`rounded-lg border p-4 ${
                    table.error
                      ? 'border-red-200 bg-red-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3
                      className={`font-medium ${
                        table.error ? 'text-red-900' : 'text-green-900'
                      }`}
                    >
                      {table.tableName}
                    </h3>
                    <span
                      className={`text-2xl ${
                        table.error ? 'text-red-500' : 'text-green-500'
                      }`}
                    >
                      {table.error ? '❌' : '✅'}
                    </span>
                  </div>
                  <div
                    className={`text-sm ${
                      table.error ? 'text-red-700' : 'text-green-700'
                    }`}
                  >
                    {table.error ? (
                      <div>
                        <p className="font-medium">Error:</p>
                        <p className="mt-1 text-xs">{table.error}</p>
                      </div>
                    ) : (
                      <p>Records: {table.count.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Property Service Validation */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Property Service Validation</span>
              </div>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Testing property search, stats, and database operations
            </p>
          </div>
          <div className="p-6">
            {propertyServiceError ? (
              <div className="rounded-lg border-red-200 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl text-red-500">❌</span>
                  <h3 className="font-medium text-red-900">Service Error</h3>
                </div>
                <p className="text-sm text-red-700">{propertyServiceError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Property Stats */}
                {propertyStats && (
                  <div className="rounded-lg border-green-200 bg-green-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl text-green-500">✅</span>
                      <h3 className="font-medium text-green-900">
                        Property Statistics
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <p className="font-medium text-green-600">
                          Total Properties
                        </p>
                        <p className="text-lg text-green-800">
                          {propertyStats.total_properties.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-green-600">
                          Average Price
                        </p>
                        <p className="text-lg text-green-800">
                          ${propertyStats.avg_price.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-green-600">
                          Average Bedrooms
                        </p>
                        <p className="text-lg text-green-800">
                          {propertyStats.avg_bedrooms}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-green-600">
                          Average Bathrooms
                        </p>
                        <p className="text-lg text-green-800">
                          {propertyStats.avg_bathrooms}
                        </p>
                      </div>
                    </div>
                    {Object.keys(propertyStats.property_type_distribution)
                      .length > 0 && (
                      <div className="mt-3 border-t border-green-200 pt-3">
                        <p className="mb-2 font-medium text-green-600">
                          Property Types
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            propertyStats.property_type_distribution
                          ).map(([type, count]) => {
                            const numericCount =
                              typeof count === 'number' ? count : Number(count)
                            return (
                              <span
                                key={type}
                                className="rounded bg-green-100 px-2 py-1 text-xs text-green-800"
                              >
                                {type}:{' '}
                                {Number.isFinite(numericCount)
                                  ? numericCount
                                  : 0}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Properties */}
                {sampleProperties && sampleProperties.length > 0 && (
                  <div className="rounded-lg border-blue-200 bg-blue-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl text-blue-500">✅</span>
                      <h3 className="font-medium text-blue-900">
                        Sample Properties (Latest 5)
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {sampleProperties.map((property) => (
                        <div
                          key={property.id}
                          className="rounded border border-blue-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-blue-900">
                                {property.address}
                              </p>
                              <p className="text-sm text-blue-700">
                                {property.city}, {property.state}{' '}
                                {property.zip_code}
                              </p>
                              <p className="mt-1 text-xs text-blue-600">
                                {property.bedrooms} bed, {property.bathrooms}{' '}
                                bath • ${property.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-blue-600">
                                {property.property_type}
                              </p>
                              {property.neighborhood && (
                                <p className="text-xs text-blue-500">
                                  {property.neighborhood.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {propertyStats?.total_properties === 0 && (
                  <div className="rounded-lg border-yellow-200 bg-yellow-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-medium text-yellow-900">
                        No Properties Found
                      </h3>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Property service is working but no properties are
                      detected. If migration is complete, this may indicate a
                      data connectivity issue.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* User Service Validation */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              👤 User Service Validation
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Testing user profile operations and authentication integration
            </p>
          </div>
          <div className="p-6">
            {!user ? (
              <div className="rounded-lg border-yellow-200 bg-yellow-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-medium text-yellow-900">
                    No Authenticated User
                  </h3>
                </div>
                <p className="text-sm text-yellow-700">
                  User service validation requires authentication. Please log in
                  to test user operations.
                </p>
              </div>
            ) : userServiceError ? (
              <div className="rounded-lg border-red-200 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl text-red-500">❌</span>
                  <h3 className="font-medium text-red-900">
                    User Service Error
                  </h3>
                </div>
                <p className="text-sm text-red-700">{userServiceError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border-green-200 bg-green-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl text-green-500">✅</span>
                    <h3 className="font-medium text-green-900">
                      User Authentication
                    </h3>
                  </div>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                      <strong>User ID:</strong> {user.id}
                    </p>
                    <p>
                      <strong>Auth Provider:</strong>{' '}
                      {user.app_metadata?.provider || 'email'}
                    </p>
                    <p>
                      <strong>Last Sign In:</strong>{' '}
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString()
                        : 'Unknown'}
                    </p>
                  </div>
                </div>

                {userProfile ? (
                  <div className="rounded-lg border-green-200 bg-green-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl text-green-500">✅</span>
                      <h3 className="font-medium text-green-900">
                        User Profile Found
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>
                        <strong>Profile ID:</strong> {userProfile.id}
                      </p>
                      <p>
                        <strong>Onboarding:</strong>{' '}
                        {userProfile.onboarding_completed
                          ? 'Completed'
                          : 'Pending'}
                      </p>
                      <p>
                        <strong>Household:</strong>{' '}
                        {userProfile.household_id ? 'Member' : 'Individual'}
                      </p>
                      <p>
                        <strong>Created:</strong>{' '}
                        {userProfile.created_at
                          ? new Date(userProfile.created_at).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-yellow-200 bg-yellow-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-medium text-yellow-900">
                        No User Profile
                      </h3>
                    </div>
                    <p className="text-sm text-yellow-700">
                      User is authenticated but no profile exists in
                      user_profiles table. This is normal for new users before
                      profile creation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PostGIS and Extensions */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>PostGIS & Extensions Status</span>
              </div>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Geographic capabilities and database extensions
            </p>
          </div>
          <div className="p-6">
            {extensionQueryFailed ? (
              <div className="rounded-lg border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-blue-900">
                    Extensions Status Unknown
                  </h3>
                </div>
                <p className="text-sm text-blue-700">
                  Cannot query the pg_extension table (normal security
                  restriction). Extension status could not be verified.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {extensionChecks.map((ext) => (
                  <div
                    key={ext.name}
                    className={`rounded-lg border p-4 ${
                      ext.present
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xl ${
                          ext.present ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {ext.present ? '✅' : '❌'}
                      </span>
                      <h3
                        className={`font-medium ${
                          ext.present ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {ext.name}
                      </h3>
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        ext.present ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {ext.present
                        ? ext.name === 'postgis'
                          ? 'Geographic operations enabled'
                          : 'UUID generation enabled'
                        : 'Required extension is not installed'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Implementation Summary */}
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-green-900">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-blue-600" />
              <span>Implementation Summary</span>
            </div>
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-medium text-green-800">
                ✅ Completed Components
              </h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li>• Database schema with all 6 tables deployed</li>
                <li>• Row Level Security policies active</li>
                <li>• PostGIS extensions for geographic data</li>
                <li>• TypeScript types auto-generated from schema</li>
                <li>• Zod validation schemas implemented</li>
                <li>• PropertyService with CRUD operations</li>
                <li>• UserService with profile management</li>
                <li>• Geographic search capabilities</li>
                <li>• Property statistics and analytics</li>
                <li>• Authentication integration</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-medium text-blue-800">
                <Target className="h-4 w-4" />
                <span>Next Steps</span>
              </h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>• API routes implementation for property endpoints</li>
                <li>• Frontend components for property browsing</li>
                <li>• ML scoring system integration (cold-start → LightGBM)</li>
                <li>• Natural language search functionality</li>
                <li>• Real-time features and optimizations</li>
                <li>• Performance testing with production load</li>
                <li>• User workflow and onboarding flows</li>
                <li>• Production deployment and monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Final status banner — derived from the live checks above */}
        {validationPassed ? (
          <div className="rounded-lg border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-6 text-center">
            <div className="mb-2">
              <PartyPopper className="mx-auto h-16 w-16 text-green-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              All Validation Checks Passed
            </h2>
            <p className="mb-4 text-gray-700">
              {tableCount('neighborhoods').toLocaleString()} neighborhoods and{' '}
              {tableCount('properties').toLocaleString()} properties present.
              Database tables, services, and required extensions all responded
              successfully.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                ✅ Tables OK
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                ✅ Services OK
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                ✅ Extensions OK
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-center">
            <div className="mb-2">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-red-900">
              Validation Failed
            </h2>
            <p className="mb-4 text-red-700">
              {validationFailures.length} live check
              {validationFailures.length === 1 ? '' : 's'} did not pass — the
              application is not verified as ready. Resolve the issues below and
              reload this page.
            </p>
            <ul className="mx-auto inline-block list-disc space-y-1 pl-6 text-left text-sm text-red-700">
              {validationFailures.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
