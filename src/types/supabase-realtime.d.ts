declare module '@supabase/supabase-js' {
  interface RealtimeChannel {
    send?: (payload: {
      type: 'broadcast'
      event: string
      payload: Record<string, unknown>
    }) => Promise<unknown>
  }
}

export {}
