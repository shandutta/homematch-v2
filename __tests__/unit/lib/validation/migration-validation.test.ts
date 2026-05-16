/**
 * Regression tests for Clawpatch findings #2 and #4 (the /validation page).
 *
 * #2 — the page used to render an unconditional "migration completed
 *      successfully" banner even when live table/service checks failed.
 * #4 — pg_extension returns only matching rows, so an empty array was taken
 *      as success and rendered a blank green grid instead of reporting the
 *      required extensions as absent.
 *
 * Both now flow through computeMigrationValidation(); these tests lock in
 * its pass/fail behaviour.
 */
import { describe, expect, test } from '@jest/globals'
import {
  computeMigrationValidation,
  type TableStat,
} from '@/lib/validation/migration-validation'

const okTables: TableStat[] = [
  { tableName: 'properties', count: 100 },
  { tableName: 'user_profiles', count: 5 },
]
const bothExtensions = [{ extname: 'postgis' }, { extname: 'uuid-ossp' }]

describe('computeMigrationValidation', () => {
  test('passes when tables, service, and extensions are all healthy', () => {
    const result = computeMigrationValidation({
      tableStats: okTables,
      propertyServiceError: null,
      extensionRows: bothExtensions,
      extensionQueryFailed: false,
    })

    expect(result.validationPassed).toBe(true)
    expect(result.validationFailures).toEqual([])
    expect(result.missingExtensions).toEqual([])
  })

  test('fails and reports the table when a table query errored (#2)', () => {
    const result = computeMigrationValidation({
      tableStats: [
        { tableName: 'properties', count: 0, error: 'permission denied' },
        { tableName: 'user_profiles', count: 5 },
      ],
      propertyServiceError: null,
      extensionRows: bothExtensions,
      extensionQueryFailed: false,
    })

    expect(result.validationPassed).toBe(false)
    expect(result.validationFailures).toContainEqual(
      'Table "properties": permission denied'
    )
  })

  test('fails when PropertyService threw (#2)', () => {
    const result = computeMigrationValidation({
      tableStats: okTables,
      propertyServiceError: 'getPropertyStats failed',
      extensionRows: bothExtensions,
      extensionQueryFailed: false,
    })

    expect(result.validationPassed).toBe(false)
    expect(result.validationFailures).toContainEqual(
      'PropertyService: getPropertyStats failed'
    )
  })

  test('an empty pg_extension result reports BOTH extensions missing (#4)', () => {
    const result = computeMigrationValidation({
      tableStats: okTables,
      propertyServiceError: null,
      extensionRows: [],
      extensionQueryFailed: false,
    })

    expect(result.validationPassed).toBe(false)
    expect(result.missingExtensions).toEqual(['postgis', 'uuid-ossp'])
    expect(result.extensionChecks).toEqual([
      { name: 'postgis', present: false },
      { name: 'uuid-ossp', present: false },
    ])
  })

  test('a partial pg_extension result reports the missing one (#4)', () => {
    const result = computeMigrationValidation({
      tableStats: okTables,
      propertyServiceError: null,
      extensionRows: [{ extname: 'postgis' }],
      extensionQueryFailed: false,
    })

    expect(result.validationPassed).toBe(false)
    expect(result.missingExtensions).toEqual(['uuid-ossp'])
  })

  test('a failed pg_extension query is "unknown", not a validation failure', () => {
    const result = computeMigrationValidation({
      tableStats: okTables,
      propertyServiceError: null,
      extensionRows: null,
      extensionQueryFailed: true,
    })

    expect(result.missingExtensions).toEqual([])
    expect(result.validationPassed).toBe(true)
  })
})
