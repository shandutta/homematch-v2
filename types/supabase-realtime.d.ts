declare module '@supabase/realtime-js' {
  export interface RealtimeChannel {
    on: (
      event: 'postgres_changes' | 'system',
      filter: Record<string, unknown>,
      callback: (payload: {
        eventType?: string
        new?: Record<string, unknown>
        old?: Record<string, unknown>
      }) => void
    ) => RealtimeChannel
    subscribe: (callback?: (status: string) => void) => RealtimeChannel
  }

  export interface RealtimeChannelOptions {
    config?: Record<string, unknown>
  }

  export interface RealtimeClientOptions {
    params?: Record<string, string>
    headers?: Record<string, string>
  }

  export class RealtimeClient {
    constructor(url: string, options?: RealtimeClientOptions)
    channel(name: string, options?: RealtimeChannelOptions): RealtimeChannel
    getChannels(): RealtimeChannel[]
    removeChannel(
      channel: RealtimeChannel
    ): Promise<'ok' | 'timed out' | 'error'>
    removeAllChannels(): Promise<'ok' | 'timed out' | 'error'>
    setAuth(token?: string): void
  }
}
