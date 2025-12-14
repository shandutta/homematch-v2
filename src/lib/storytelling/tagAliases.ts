export const STORYTELLING_TAG_ALIASES: Record<string, string> = {
  'Love Nest': 'Couples Retreat',
  'Urban Love Nest': 'City Hideaway',
}

export function normalizeStorytellingTag(tag: string): string {
  return STORYTELLING_TAG_ALIASES[tag] ?? tag
}
