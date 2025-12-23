export const STORYTELLING_TAG_ALIASES: Record<string, string> = {
  'Love Nest': 'Shared Retreat',
  'Urban Love Nest': 'City Hideaway',
  'Couples Retreat': 'Shared Retreat',
  'Date Night Central': 'Dining District',
}

export function normalizeStorytellingTag(tag: string): string {
  return STORYTELLING_TAG_ALIASES[tag] ?? tag
}
