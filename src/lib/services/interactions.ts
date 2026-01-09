import {
  InteractionSummary,
  InteractionType,
  PageRequest,
  PageResponse,
} from '@/types/app'
import { propertySchema, type Property } from '@/lib/schemas/property'
import { interactionSummarySchema } from '@/lib/schemas/api'
import { z } from 'zod'

// If project has a central fetch wrapper, swap to it. Keep native fetch for now.
const interactionListSchema = z.object({
  items: z.array(propertySchema),
  nextCursor: z.string().nullable().optional(),
})

export const InteractionService = {
  async recordInteraction(
    propertyId: string,
    type: InteractionType
  ): Promise<void> {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId, type }),
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to record interaction (${res.status}): ${text}`)
    }
  },

  async getInteractionSummary(): Promise<InteractionSummary> {
    const res = await fetch('/api/interactions?type=summary', {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(
        `Failed to fetch interaction summary (${res.status}): ${text}`
      )
    }
    const json = await res.json()
    const parsed = interactionSummarySchema.safeParse(json)
    if (!parsed.success) {
      throw new Error('Invalid summary payload')
    }
    return parsed.data
  },

  async getInteractions(
    type: InteractionType,
    { cursor, limit = 12 }: PageRequest
  ): Promise<PageResponse<Property>> {
    const params = new URLSearchParams({ type, limit: String(limit) })
    if (cursor) params.set('cursor', cursor)
    const res = await fetch(`/api/interactions?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch interactions (${res.status}): ${text}`)
    }
    const json = await res.json()
    const parsed = interactionListSchema.safeParse(json)
    if (!parsed.success) {
      throw new Error('Invalid interactions payload')
    }
    return parsed.data
  },

  async deleteInteraction(propertyId: string): Promise<void> {
    const res = await fetch('/api/interactions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId }),
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to delete interaction (${res.status}): ${text}`)
    }
  },

  async resetAllInteractions(): Promise<{ deleted: boolean; count: number }> {
    const res = await fetch('/api/interactions/reset', {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to reset interactions (${res.status}): ${text}`)
    }
    return res.json()
  },
}
