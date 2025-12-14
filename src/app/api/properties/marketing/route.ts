import { NextResponse } from 'next/server'
import { withPerformanceTracking } from '@/lib/utils/performance'

// Explicitly reject unsupported methods to avoid hanging requests in tests/E2E
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

type MarketingCard = {
  zpid: string
  imageUrl: string | null
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  address: string
  latitude: number | null
  longitude: number | null
}

const MARKETING_CARDS: MarketingCard[] = [
  {
    zpid: 'mock-1',
    imageUrl: '/images/marketing/mock-home-1.jpg',
    price: 850000,
    bedrooms: 4,
    bathrooms: 3,
    address: 'Palo Alto, CA',
    latitude: null,
    longitude: null,
  },
  {
    zpid: 'mock-2',
    imageUrl: '/images/marketing/mock-home-2.jpg',
    price: 1200000,
    bedrooms: 3,
    bathrooms: 2,
    address: 'Mountain View, CA',
    latitude: null,
    longitude: null,
  },
  {
    zpid: 'mock-3',
    imageUrl: '/images/marketing/mock-home-3.jpg',
    price: 950000,
    bedrooms: 3,
    bathrooms: 2,
    address: 'Sunnyvale, CA',
    latitude: null,
    longitude: null,
  },
]

async function getMarketingProperties(): Promise<NextResponse> {
  return NextResponse.json(MARKETING_CARDS, { status: 200 })
}

export const GET = withPerformanceTracking(
  getMarketingProperties,
  'GET /api/properties/marketing'
)
