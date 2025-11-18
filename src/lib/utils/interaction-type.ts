import { DbInteractionType, InteractionType } from '@/types/app'

const UI_TO_DB_MAP: Record<InteractionType, DbInteractionType> = {
  liked: 'like',
  viewed: 'view',
  skip: 'skip',
}

const DB_TO_UI_MAP: Record<DbInteractionType, InteractionType> = {
  like: 'liked',
  dislike: 'skip',
  skip: 'skip',
  view: 'viewed',
}

const DB_FILTERS_BY_UI_TYPE: Record<InteractionType, DbInteractionType[]> = {
  liked: ['like'],
  viewed: ['view'],
  skip: ['skip', 'dislike'],
}

/**
 * Normalizes mixed UI/DB interaction strings into the canonical UI InteractionType.
 */
export function normalizeInteractionType(
  rawType: string | null | undefined
): InteractionType | null {
  if (!rawType) return null
  const normalized = rawType.toLowerCase()

  switch (normalized) {
    case 'like':
    case 'liked':
      return 'liked'
    case 'view':
    case 'viewed':
      return 'viewed'
    case 'skip':
    case 'pass':
    case 'passed':
    case 'dislike':
      return 'skip'
    default:
      return null
  }
}

/**
 * Maps a UI InteractionType to the value stored in the database.
 */
export function mapInteractionTypeToDb(
  interactionType: InteractionType
): DbInteractionType {
  return UI_TO_DB_MAP[interactionType]
}

/**
 * Returns the DB interaction values that should be considered equivalent for a UI type.
 * Older records used `dislike` which should be grouped with the modern `skip`/passed state.
 */
export function getDbFiltersForInteractionType(
  interactionType: InteractionType
): DbInteractionType[] {
  return DB_FILTERS_BY_UI_TYPE[interactionType]
}

/**
 * Converts a DB interaction value to the UI InteractionType.
 */
export function mapDbInteractionToUi(
  dbType: DbInteractionType
): InteractionType {
  return DB_TO_UI_MAP[dbType]
}
