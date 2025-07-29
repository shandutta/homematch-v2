# RapidAPI Zillow Integration Documentation

## Overview

HomeMatch uses the Zillow.com API via RapidAPI for comprehensive property data ingestion and real-time property information retrieval.

**API Provider**: [Zillow.com API on RapidAPI](https://rapidapi.com/apimaker/api/zillow-com1/)  
**Host**: `zillow-com1.p.rapidapi.com`  
**Authentication**: RapidAPI Key-based authentication

## Configuration

### Environment Variables

```bash
RAPIDAPI_KEY=your_rapidapi_key_here
```

### Headers Required

```javascript
{
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
}
```

## Available Endpoints

### 1. Property Extended Search

**Endpoint**: `/propertyExtendedSearch`  
**Method**: GET  
**Use Case**: Primary property discovery and bulk ingestion

**Parameters**:

- `location` - Geographic search area
- `home_type` - Property types (house, condo, townhouse, etc.)
- `price_min` / `price_max` - Price range filters
- `beds_min` / `beds_max` - Bedroom count filters
- `baths_min` / `baths_max` - Bathroom count filters
- `sqft_min` / `sqft_max` - Square footage filters
- `lot_size_min` / `lot_size_max` - Lot size filters
- `year_built_min` / `year_built_max` - Year built filters
- `page` - Pagination support
- `sort` - Sorting options

**Response Schema**:

```typescript
interface PropertySearchResponse {
  properties: Property[]
  totalCount: number
  page: number
  hasNextPage: boolean
}

interface Property {
  zpid: string
  address: string
  city: string
  state: string
  zipcode: string
  price: number
  bedrooms: number
  bathrooms: number
  livingArea: number
  propertyType: string
  photos: string[]
  description?: string
  latitude?: number
  longitude?: number
  lotSize?: number
  yearBuilt?: number
  listingStatus: string
}
```

### 2. Property Details

**Endpoint**: `/property-details`  
**Method**: GET  
**Use Case**: Detailed property information retrieval

**Parameters**:

- `zpid` - Zillow Property ID (required)

### 3. Property History

**Endpoint**: `/property-history`  
**Method**: GET  
**Use Case**: Price history and market trends

**Parameters**:

- `zpid` - Zillow Property ID (required)

### 4. Comparable Properties

**Endpoint**: `/comparable-properties`  
**Method**: GET  
**Use Case**: Market analysis and pricing insights

**Parameters**:

- `zpid` - Zillow Property ID (required)
- `radius` - Search radius for comparables

### 5. Neighborhood Information

**Endpoint**: `/neighborhood-info`  
**Method**: GET  
**Use Case**: Local market data and neighborhood statistics

**Parameters**:

- `city` - City name
- `state` - State abbreviation

### 6. Market Trends

**Endpoint**: `/market-trends`  
**Method**: GET  
**Use Case**: Regional market analysis

**Parameters**:

- `location` - Geographic area
- `time_period` - Analysis timeframe

## Rate Limiting & Best Practices

### Rate Limits

- **Requests per minute**: 100 (varies by subscription tier)
- **Recommended delay**: 2000ms between requests
- **Burst protection**: Implement exponential backoff

### Implementation Guidelines

```typescript
class ZillowAPIClient {
  private rateLimitDelay = 2000 // 2 seconds
  private maxRetries = 3

  async makeRequest(endpoint: string, params: Record<string, any>) {
    let attempt = 0

    while (attempt < this.maxRetries) {
      try {
        await this.delay(this.rateLimitDelay)

        const response = await fetch(
          `https://zillow-com1.p.rapidapi.com${endpoint}?${new URLSearchParams(params)}`,
          {
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
              'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
            },
          }
        )

        if (response.ok) {
          return await response.json()
        }

        throw new Error(`API request failed: ${response.status}`)
      } catch (error) {
        attempt++
        if (attempt >= this.maxRetries) throw error

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await this.delay(delay)
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

## Error Handling

### Common Error Codes

- **403**: Invalid API key or subscription limits exceeded
- **429**: Rate limit exceeded
- **404**: Property not found (invalid ZPID)
- **500**: Zillow API internal error

### Error Handling Strategy

```typescript
async function handleZillowError(error: any, operation: string) {
  switch (error.status) {
    case 429:
      console.warn(`Rate limit hit for ${operation}, retrying...`)
      await delay(5000) // Wait 5 seconds
      break

    case 403:
      console.error(`API key invalid or quota exceeded for ${operation}`)
      throw new Error('Zillow API authentication failed')

    case 404:
      console.warn(`Property not found for ${operation}`)
      return null // Handle gracefully

    default:
      console.error(`Zillow API error for ${operation}:`, error)
      throw error
  }
}
```

## Integration with HomeMatch

### Property Ingestion Pipeline

```typescript
// src/lib/services/property-ingestion.ts
export class PropertyIngestionService {
  private zillowClient = new ZillowAPIClient()

  async ingestNeighborhood(neighborhoodId: string): Promise<void> {
    // 1. Get neighborhood bounds from database
    const neighborhood = await this.getNeighborhoodBounds(neighborhoodId)

    // 2. Search properties using extended search
    const properties = await this.zillowClient.makeRequest(
      '/propertyExtendedSearch',
      {
        location: `${neighborhood.city}, ${neighborhood.state}`,
        // Add geographic bounds filtering
      }
    )

    // 3. Process and store properties
    await this.processBatch(properties, neighborhoodId)
  }
}
```

### Real-time Property Updates

```typescript
// Check for property status changes
async function updatePropertyStatus(zpid: string) {
  const details = await zillowClient.makeRequest('/property-details', { zpid })

  // Update database with current status
  await supabase
    .from('properties')
    .update({
      listing_status: details.listingStatus,
      price: details.price,
      updated_at: new Date().toISOString(),
    })
    .eq('zpid', zpid)
}
```

### Market Analysis Integration

```typescript
// Generate neighborhood market insights
async function generateNeighborhoodInsights(neighborhoodId: string) {
  const properties = await getNeighborhoodProperties(neighborhoodId)

  for (const property of properties) {
    // Get comparable properties
    const comps = await zillowClient.makeRequest('/comparable-properties', {
      zpid: property.zpid,
      radius: 0.5, // 0.5 mile radius
    })

    // Calculate market position
    const marketPosition = calculateMarketPosition(property, comps)

    // Store insights
    await storeMarketInsights(property.id, marketPosition)
  }
}
```

## Data Quality & Validation

### Property Data Validation

```typescript
const PropertyValidationSchema = z.object({
  zpid: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipcode: z.string().regex(/^\d{5}(-\d{4})?$/),
  price: z.number().positive(),
  bedrooms: z.number().min(0),
  bathrooms: z.number().min(0),
  livingArea: z.number().positive().optional(),
  propertyType: z.enum(['house', 'condo', 'townhouse', 'apartment']),
  photos: z.array(z.string().url()),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})
```

### Deduplication Strategy

```typescript
function generatePropertyHash(property: Property): string {
  const hashInput = `${property.address}-${property.bedrooms}-${property.bathrooms}-${property.price}`
  return crypto.createHash('md5').update(hashInput).digest('hex')
}
```

## Monitoring & Analytics

### Performance Metrics

- API response times
- Success/failure rates
- Rate limit utilization
- Data quality scores

### Logging Strategy

```typescript
const logger = {
  apiCall: (endpoint: string, params: any, duration: number) => {
    console.log(`Zillow API: ${endpoint}`, {
      params,
      duration,
      timestamp: new Date().toISOString(),
    })
  },

  apiError: (endpoint: string, error: any) => {
    console.error(`Zillow API Error: ${endpoint}`, {
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString(),
    })
  },
}
```

## Cost Optimization

### Request Optimization

1. **Batch Operations**: Process multiple properties per neighborhood
2. **Caching**: Cache responses for frequently accessed data
3. **Smart Filtering**: Use API filters to reduce unnecessary data transfer
4. **Incremental Updates**: Only fetch changed properties

### Subscription Tier Recommendations

- **Development**: Basic tier for testing and development
- **Production**: Professional tier for live property ingestion
- **Enterprise**: Enterprise tier for high-volume operations

## Security Considerations

### API Key Protection

- Store API key in environment variables only
- Never commit API keys to version control
- Rotate API keys regularly
- Monitor API key usage for suspicious activity

### Data Privacy

- Respect Zillow's terms of service
- Implement proper data retention policies
- Ensure GDPR compliance for user data
- Secure data transmission and storage

## Future Enhancements

### Planned Integrations

1. **Real-time Webhooks**: Property status change notifications
2. **ML Integration**: Property valuation models using historical data
3. **Market Predictions**: Trend analysis using market data
4. **Enhanced Filtering**: Custom property scoring algorithms

### API Evolution

- Monitor new endpoint releases
- Implement backward compatibility strategies
- Plan for API version migrations
- Maintain endpoint deprecation schedules
