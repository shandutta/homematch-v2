import { Interaction, InteractionSummary, InteractionType, PageRequest, PageResponse } from '@/types/app'
import { z } from 'zod'

// If project has a central fetch wrapper, swap to it. Keep native fetch for now.
const SummarySchema = z.object({
  viewed: z.number().int().nonnegative(),
  liked: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
})

export const InteractionService = {
  async recordInteraction(propertyId: string, type: InteractionType): Promise<Interaction> {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, type }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to record interaction (${res.status}): ${text}`)
    }
    const json = await res.json()
    return json.interaction as Interaction
  },

  async getInteractionSummary(): Promise<InteractionSummary> {
    const res = await fetch('/api/interactions?type=summary', { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch interaction summary (${res.status}): ${text}`)
    }
    const json = await res.json()
    const parsed = SummarySchema.safeParse(json)
    if (!parsed.success) {
      throw new Error('Invalid summary payload')
    }
    return parsed.data
  },

  async getInteractions<T extends { id: string }>(
    type: InteractionType,
    { cursor, limit = 12 }: PageRequest
  ): Promise<PageResponse<T>> {
    const params = new URLSearchParams({ type, limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`/api/interactions?${params.toString()}`, { method: 'GET' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch interactions (${res.status}): ${text}`)
    }
    return (await res.json()) as PageResponse<T>
  },
}
