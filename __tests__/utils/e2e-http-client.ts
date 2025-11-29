/**
 * E2E HTTP Client
 *
 * Provides HTTP request utilities for true end-to-end testing.
 * Makes real HTTP requests to the dev server with authentication support.
 * Integrates with IntegrationTestHelper for proper auth setup.
 */

import { IntegrationTestHelper } from './integration-test-helper'
import { optimizedDbHelper } from './optimized-db-helper'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'
  headers?: Record<string, string>
  body?: any
  authenticated?: boolean
}

interface E2EResponse {
  status: number
  headers: Headers
  json: () => Promise<any>
  text: () => Promise<string>
  ok: boolean
}

export class E2EHttpClient {
  private helper: IntegrationTestHelper
  private authToken?: string
  private baseUrl: string
  private useOptimizedDb: boolean

  constructor(baseUrl = 'http://localhost:3000', useOptimizedDb = false) {
    this.helper = new IntegrationTestHelper()
    this.baseUrl = baseUrl
    this.useOptimizedDb = useOptimizedDb
  }

  /**
   * Authenticate as a specific user
   * Uses optimized database helper if enabled for better performance
   */
  async authenticateAs(
    email: string,
    password: string = 'testpassword123'
  ): Promise<void> {
    if (this.useOptimizedDb) {
      // Use optimized helper with connection pooling
      const client = await optimizedDbHelper.getAuthenticatedClient(
        email,
        password
      )
      const {
        data: { session },
        error,
      } = await client.auth.getSession()

      if (error || !session) {
        throw new Error(`Failed to get session for ${email}: ${error?.message}`)
      }

      this.authToken = session.access_token
    } else {
      // Use original helper
      const client = await this.helper.authenticateAs(email, password)
      const {
        data: { session },
        error,
      } = await client.auth.getSession()

      if (error || !session) {
        throw new Error(`Failed to get session for ${email}: ${error?.message}`)
      }

      this.authToken = session.access_token
    }
  }

  /**
   * Make an authenticated HTTP request
   * Includes AbortController timeout to prevent hanging connections
   */
  async request(
    url: string,
    options: RequestOptions = {}
  ): Promise<E2EResponse> {
    const { method = 'GET', headers = {}, body, authenticated = true } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    // Add auth header if authenticated and token exists
    if (authenticated && this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`
    }

    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`

    // Add timeout to prevent hanging connections and connection exhaustion
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      return {
        status: response.status,
        headers: response.headers,
        json: () => response.json(),
        text: () => response.text(),
        ok: response.ok,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request to ${fullUrl} timed out after 30s`)
      }
      throw error
    }
  }

  /**
   * Make an unauthenticated HTTP request
   */
  async unauthenticatedRequest(
    url: string,
    options: Omit<RequestOptions, 'authenticated'> = {}
  ): Promise<E2EResponse> {
    return this.request(url, { ...options, authenticated: false })
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get(url: string, authenticated = true): Promise<E2EResponse> {
    return this.request(url, { method: 'GET', authenticated })
  }

  async post(
    url: string,
    body?: any,
    authenticated = true
  ): Promise<E2EResponse> {
    return this.request(url, { method: 'POST', body, authenticated })
  }

  async put(
    url: string,
    body?: any,
    authenticated = true
  ): Promise<E2EResponse> {
    return this.request(url, { method: 'PUT', body, authenticated })
  }

  async delete(url: string, authenticated = true): Promise<E2EResponse> {
    return this.request(url, { method: 'DELETE', authenticated })
  }

  async patch(
    url: string,
    body?: any,
    authenticated = true
  ): Promise<E2EResponse> {
    return this.request(url, { method: 'PATCH', body, authenticated })
  }

  /**
   * Get the underlying helper for advanced test setup
   */
  getHelper(): IntegrationTestHelper {
    return this.helper
  }

  /**
   * Clean up after tests - signs out user and cleans test data
   */
  async cleanup(): Promise<void> {
    this.authToken = undefined
    await this.helper.cleanup()
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken
  }

  /**
   * Get current auth token (for debugging)
   */
  getAuthToken(): string | undefined {
    return this.authToken
  }
}
