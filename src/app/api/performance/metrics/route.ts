import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiClient } from '@/lib/supabase/server'

interface MetricsStoreEntry {
  metrics: Array<{
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
    delta?: number
    id: string
    navigationType?: string
    timestamp: number
  }>
  customMetrics?: Array<{
    name: string
    value: number
    unit?: string
    tags?: Record<string, string>
    timestamp: number
  }>
  url: string
  userAgent: string
  timestamp: number
  receivedAt: number
  ip: string
}

interface MetricGroup {
  count: number
  min: number
  max: number
  mean: number
  p50: number
  p75: number
  p95: number
  p99: number
}

interface Aggregates {
  [metricName: string]: MetricGroup
}

// Performance metric schema
const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number().optional(),
  id: z.string(),
  navigationType: z.string().optional(),
  timestamp: z.number(),
})

const CustomMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  tags: z.record(z.string()).optional(),
  timestamp: z.number(),
})

const MetricsPayloadSchema = z.object({
  metrics: z.array(PerformanceMetricSchema),
  customMetrics: z.array(CustomMetricSchema).optional(),
  url: z.string().url(),
  userAgent: z.string(),
  timestamp: z.number(),
})

// In-memory storage for demo (replace with database in production)
const metricsStore: MetricsStoreEntry[] = []
const MAX_METRICS = 1000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate payload
    const validatedData = MetricsPayloadSchema.parse(body)

    // Store metrics (in production, save to database)
    metricsStore.push({
      ...validatedData,
      receivedAt: Date.now(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })

    // Keep only recent metrics
    if (metricsStore.length > MAX_METRICS) {
      metricsStore.splice(0, metricsStore.length - MAX_METRICS)
    }

    // Log critical metrics
    validatedData.metrics.forEach((metric) => {
      if (metric.rating === 'poor') {
        console.warn(
          `Poor performance metric: ${metric.name} = ${metric.value}ms on ${validatedData.url}`
        )
      }
    })

    // Log custom metrics if they indicate issues
    validatedData.customMetrics?.forEach((metric) => {
      if (metric.name === 'long_task' && metric.value > 100) {
        console.warn(
          `Long task detected: ${metric.value}ms on ${validatedData.url}`
        )
      }
      if (metric.name === 'slow_resource' && metric.value > 1000) {
        console.warn(`Slow resource: ${metric.value}ms on ${validatedData.url}`)
      }
      if (metric.name === 'memory_usage' && metric.value > 500) {
        console.warn(
          `High memory usage: ${metric.value}MB on ${validatedData.url}`
        )
      }
    })

    // In production, you might want to:
    // 1. Save to database
    // 2. Send to monitoring service (Sentry, DataDog, etc.)
    // 3. Trigger alerts for critical performance issues

    return NextResponse.json({
      success: true,
      received: validatedData.metrics.length,
    })
  } catch (error) {
    console.error('Failed to process performance metrics:', error)
    return NextResponse.json(
      { error: 'Invalid metrics payload' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get query parameters
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page')
  const metric = searchParams.get('metric')
  const rating = searchParams.get('rating')

  // Filter metrics
  let filtered = [...metricsStore]

  if (page) {
    filtered = filtered.filter((m) => m.url.includes(page))
  }

  if (metric) {
    filtered = filtered.filter((m) =>
      m.metrics.some((met) => met.name === metric)
    )
  }

  if (rating) {
    filtered = filtered.filter((m) =>
      m.metrics.some((met) => met.rating === rating)
    )
  }

  // Calculate aggregates
  const aggregates = calculateAggregates(filtered)

  return NextResponse.json({
    total: filtered.length,
    metrics: filtered.slice(-100).map(({ ip: _ip, ...rest }) => rest), // Return last 100, excluding IP
    aggregates,
  })
}

function calculateAggregates(metrics: MetricsStoreEntry[]): Aggregates {
  const aggregates: Aggregates = {}

  // Group by metric name
  const metricGroups: { [key: string]: number[] } = {}

  metrics.forEach((entry) => {
    entry.metrics.forEach((metric) => {
      if (!metricGroups[metric.name]) {
        metricGroups[metric.name] = []
      }
      metricGroups[metric.name].push(metric.value)
    })
  })

  // Calculate percentiles for each metric
  Object.keys(metricGroups).forEach((name) => {
    const values = metricGroups[name].sort((a: number, b: number) => a - b)

    aggregates[name] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a: number, b: number) => a + b, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p75: values[Math.floor(values.length * 0.75)],
      p95: values[Math.floor(values.length * 0.95)],
      p99:
        values[Math.floor(values.length * 0.99)] || values[values.length - 1],
    }
  })

  return aggregates
}
