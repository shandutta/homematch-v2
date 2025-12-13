/**
 * OpenRouter API Client for Vision LLM
 *
 * Handles communication with OpenRouter to analyze property images
 * and extract vibes using vision-capable models.
 *
 * Default: Qwen 3 VL 8B (cheap, good quality vision model).
 * Fallbacks: Qwen 2.5 VL 32B, Llama 3.2 11B Vision, Gemma 3 27B (free).
 */

export interface OpenRouterConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  maxRetries?: number
  timeoutMs?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatMessageContent[]
}

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' | 'text' }
}

export interface CompletionResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface UsageInfo {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

// Pricing per 1M tokens (approximate, varies by model)
// Free models have 0 cost but we track tokens for monitoring
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Qwen vision models (cheap, recommended for beta)
  // Updated pricing: 131,072 context, $0.064/M input, $0.40/M output
  'qwen/qwen3-vl-8b-instruct': { input: 0.064, output: 0.4 },
  'qwen/qwen2.5-vl-32b-instruct': { input: 0.2, output: 0.6 },
  // Llama vision (very cheap)
  'meta-llama/llama-3.2-11b-vision-instruct': { input: 0.05, output: 0.05 },
  // Free fallback
  'google/gemma-3-27b-it:free': { input: 0, output: 0 },
  // Paid models (higher quality fallbacks)
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4o': { input: 2.5, output: 10 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'anthropic/claude-3-sonnet': { input: 3, output: 15 },
}

// Default model for vibes generation (Qwen 3 VL - cheap and good quality)
export const DEFAULT_VIBES_MODEL = 'qwen/qwen3-vl-8b-instruct'

export class OpenRouterClient {
  private apiKey: string
  private baseUrl: string
  private defaultModel: string
  private maxRetries: number
  private timeoutMs: number

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'
    this.defaultModel = config.defaultModel || DEFAULT_VIBES_MODEL
    this.maxRetries = config.maxRetries || 3
    this.timeoutMs = config.timeoutMs || 120000 // 2 minutes for vision
  }

  /**
   * Send a chat completion request with optional vision content
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<{ response: CompletionResponse; usage: UsageInfo }> {
    const model = options.model || this.defaultModel
    const startTime = Date.now()

    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.responseFormat && {
        response_format: options.responseFormat,
      }),
    }

    const response = await this.makeRequest<CompletionResponse>(
      '/chat/completions',
      body
    )

    const usage = this.calculateUsage(response.usage, model)

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[OpenRouter] Model: ${model}, Tokens: ${response.usage.total_tokens}, Cost: $${usage.estimatedCostUsd.toFixed(4)}, Time: ${Date.now() - startTime}ms`
      )
    }

    return { response, usage }
  }

  /**
   * Create a vision message with images
   */
  createVisionMessage(
    prompt: string,
    imageUrls: string[],
    imageDetail: 'low' | 'high' | 'auto' = 'low'
  ): ChatMessage {
    const content: ChatMessageContent[] = [{ type: 'text', text: prompt }]

    for (const url of imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url,
          detail: imageDetail,
        },
      })
    }

    return {
      role: 'user',
      content,
    }
  }

  /**
   * Make HTTP request with retries and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    body: object,
    attempt = 1
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://homematch.pro',
          'X-Title': 'HomeMatch Property Vibes',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()

        // Rate limit - retry with backoff
        if (response.status === 429 && attempt < this.maxRetries) {
          const retryAfter = parseInt(
            response.headers.get('retry-after') || '5'
          )
          console.warn(
            `[OpenRouter] Rate limited. Waiting ${retryAfter}s before retry ${attempt + 1}/${this.maxRetries}`
          )
          await this.delay(retryAfter * 1000)
          return this.makeRequest<T>(endpoint, body, attempt + 1)
        }

        // Server error - retry with exponential backoff
        if (response.status >= 500 && attempt < this.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.warn(
            `[OpenRouter] Server error ${response.status}. Retrying in ${delayMs}ms...`
          )
          await this.delay(delayMs)
          return this.makeRequest<T>(endpoint, body, attempt + 1)
        }

        throw new OpenRouterError(
          `OpenRouter API error: ${response.status} - ${errorText}`,
          response.status
        )
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof OpenRouterError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenRouterError('Request timed out', 408)
      }

      // Network error - retry
      if (attempt < this.maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000
        console.warn(
          `[OpenRouter] Network error. Retrying in ${delayMs}ms...`,
          error
        )
        await this.delay(delayMs)
        return this.makeRequest<T>(endpoint, body, attempt + 1)
      }

      throw new OpenRouterError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Calculate usage and cost from token counts
   */
  private calculateUsage(
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    },
    model: string
  ): UsageInfo {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['openai/gpt-4o-mini']

    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output

    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCostUsd: inputCost + outputCost,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Custom error class for OpenRouter API errors
 */
export class OpenRouterError extends Error {
  public status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'OpenRouterError'
    this.status = status
  }
}

/**
 * Create an OpenRouter client instance
 */
export function createOpenRouterClient(
  apiKey?: string,
  model?: string
): OpenRouterClient {
  const key = apiKey || process.env.OPENROUTER_API_KEY

  if (!key) {
    throw new Error(
      'OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.'
    )
  }

  return new OpenRouterClient({
    apiKey: key,
    defaultModel: model || process.env.OPENROUTER_MODEL || DEFAULT_VIBES_MODEL,
  })
}
