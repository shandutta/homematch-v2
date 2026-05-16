// Pure aggregation logic for the internal /validation dashboard.
//
// Kept separate from the page component so the pass/fail decision — which
// drives whether the page reports the migration as healthy — is unit
// testable without rendering an async Server Component.

export const REQUIRED_EXTENSIONS = ['postgis', 'uuid-ossp'] as const

export interface TableStat {
  tableName: string
  count: number
  error?: string
}

export interface ExtensionCheck {
  name: string
  present: boolean
}

export interface MigrationValidation {
  validationPassed: boolean
  validationFailures: string[]
  extensionChecks: ExtensionCheck[]
  missingExtensions: string[]
}

export interface MigrationValidationInput {
  tableStats: TableStat[]
  propertyServiceError: string | null
  // Rows returned by `select('extname')` on pg_extension, or null when the
  // query could not be run at all.
  extensionRows: { extname: string }[] | null
  // True when the pg_extension query itself errored/threw. A failed query is
  // treated as "unknown" (not a validation failure); an empty *successful*
  // result means the extensions are genuinely absent.
  extensionQueryFailed: boolean
}

export function computeMigrationValidation(
  input: MigrationValidationInput
): MigrationValidation {
  const {
    tableStats,
    propertyServiceError,
    extensionRows,
    extensionQueryFailed,
  } = input

  const present = new Set((extensionRows ?? []).map((row) => row.extname))
  const extensionChecks: ExtensionCheck[] = REQUIRED_EXTENSIONS.map((name) => ({
    name,
    present: present.has(name),
  }))
  const missingExtensions = extensionQueryFailed
    ? []
    : extensionChecks
        .filter((check) => !check.present)
        .map((check) => check.name)

  const validationFailures: string[] = []
  for (const table of tableStats) {
    if (table.error) {
      validationFailures.push(`Table "${table.tableName}": ${table.error}`)
    }
  }
  if (propertyServiceError) {
    validationFailures.push(`PropertyService: ${propertyServiceError}`)
  }
  for (const name of missingExtensions) {
    validationFailures.push(`Required extension "${name}" is not installed`)
  }

  return {
    validationPassed: validationFailures.length === 0,
    validationFailures,
    extensionChecks,
    missingExtensions,
  }
}
