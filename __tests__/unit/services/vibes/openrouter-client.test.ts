/** @jest-environment node */

import { describe, test, expect, jest } from '@jest/globals'
import { OpenRouterClient } from '@/lib/services/vibes/openrouter-client'

const originalFetch = global.fetch

describe('OpenRouterClient', () => {
  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  test('chatCompletion returns zeroed usage when response omits usage', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    type FetchFn = (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => Promise<Response>
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
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
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
    global.fetch = fetchMock

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
