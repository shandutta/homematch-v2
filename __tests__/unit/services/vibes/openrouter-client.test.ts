/** @jest-environment node */

import { describe, test, expect, jest } from '@jest/globals'
import { OpenRouterClient } from '@/lib/services/vibes/openrouter-client'

const originalFetch = global.fetch

describe('OpenRouterClient', () => {
  afterEach(() => {
    global.fetch = originalFetch as any
    jest.restoreAllMocks()
  })

  test('chatCompletion returns zeroed usage when response omits usage', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'r1',
        model: 'qwen/qwen3-vl-8b-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: '{}' },
            finish_reason: 'stop',
          },
        ],
      }),
    } as any)

    const client = new OpenRouterClient({
      apiKey: 'test',
      baseUrl: 'https://example.com',
      defaultModel: 'qwen/qwen3-vl-8b-instruct',
      maxRetries: 1,
      timeoutMs: 1000,
    })

    const { usage } = await client.chatCompletion(
      [{ role: 'system', content: 'x' }],
      {
        model: 'qwen/qwen3-vl-8b-instruct',
        maxTokens: 10,
        responseFormat: { type: 'json_object' },
      }
    )

    expect(warnSpy).toHaveBeenCalled()
    expect(usage).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    })
  })
})
