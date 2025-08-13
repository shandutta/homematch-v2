# Google Maps Security Implementation Guide

## 🛡️ Security Overview

This document outlines the secure implementation of Google Maps API in HomeMatch V2, addressing client-side API key exposure and implementing defense-in-depth security measures.

## 🚨 Security Risks Addressed

### Previous Vulnerability
- **Issue**: Client-side API key exposure in `layout.tsx`
- **Risk Level**: HIGH (8.5/10)
- **Impact**: Unauthorized API usage, billing fraud, quota exhaustion

### Current Security Measures

## 🔑 API Key Configuration

### 1. Dual API Key Strategy

```bash
# Client-side key (visible to users, heavily restricted)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_restricted_client_key

# Server-side key (private, broader permissions)
GOOGLE_MAPS_SERVER_API_KEY=your_server_side_key
```

### 2. Google Cloud Console Restrictions

#### Client-Side Key Restrictions:
```yaml
APIs Enabled:
  - Maps JavaScript API: ✅
  - Places API: ❌ (disabled for client key)
  - Geocoding API: ❌ (disabled for client key)

HTTP Referrer Restrictions:
  - https://yourdomain.com/*
  - https://staging.yourdomain.com/*
  - http://localhost:3000/*
  - http://localhost:3001/*

Daily Quotas:
  - Maps loads: 25,000/day
  - Monitor usage regularly
```

#### Server-Side Key Restrictions:
```yaml
APIs Enabled:
  - Maps JavaScript API: ❌
  - Places API: ✅
  - Geocoding API: ✅
  - Places Details API: ✅

IP Address Restrictions:
  - Your server IP addresses
  - Vercel deployment IPs
  - Development environment IPs

Daily Quotas:
  - Geocoding: 2,500/day
  - Places Autocomplete: 1,000/day
  - Places Details: 1,000/day
```

## 🏗️ Architecture Implementation

### 1. Secure Server-Side Proxies

#### Geocoding API (`/api/maps/geocode`)
- **Input Validation**: Zod schema validation
- **Rate Limiting**: 10 requests/minute per IP
- **Error Handling**: Sanitized error responses
- **Response Filtering**: Removes sensitive API details

#### Places Autocomplete API (`/api/maps/places/autocomplete`)
- **Input Validation**: Query length, type restrictions
- **Rate Limiting**: 20 requests/minute per IP
- **Debouncing**: Client-side request debouncing
- **Geographic Restrictions**: Country/region filtering

### 2. Client-Side Security Hooks

#### `useSecureGoogleMaps` Hook
```typescript
const { geocodeAddress, getPlacesPredictions, debouncedPlacesPredictions } = useSecureGoogleMaps()

// Secure geocoding
const results = await geocodeAddress('123 Main St', { country: 'US' })

// Secure autocomplete with debouncing
const predictions = await debouncedPlacesPredictions('New York', { 
  types: 'address',
  country: 'US' 
})
```

### 3. Enhanced Map Loading

#### `SecureMapLoader` Component
- **Error Handling**: Graceful fallbacks for loading failures
- **Loading States**: Proper loading indicators
- **Single Loading**: Prevents multiple script loading attempts
- **Validation**: Verifies API availability after load

## 🔒 Security Features

### 1. Rate Limiting

#### Server-Side Protection:
- **Geocoding**: 10 requests/minute per IP
- **Autocomplete**: 20 requests/minute per IP
- **IP-based tracking**: Prevents abuse from single sources

#### Client-Side Protection:
- **Request debouncing**: 300ms delay for autocomplete
- **Client rate limiting**: Additional protection layer
- **Minimum input length**: Prevents excessive API calls

### 2. Input Validation

#### Zod Schema Validation:
```typescript
const geocodeSchema = z.object({
  address: z.string().min(1).max(200),
  components: z.object({
    country: z.string().optional(),
    administrative_area: z.string().optional(),
    locality: z.string().optional(),
  }).optional()
})
```

### 3. Response Sanitization

#### Removed Sensitive Data:
- API status details beyond basic success/failure
- Internal Google API error messages
- Detailed rate limiting information
- Server infrastructure details

## 📊 Monitoring & Alerting

### 1. Usage Monitoring

```typescript
// Monitor API usage in your analytics
const trackMapUsage = (endpoint: string, success: boolean) => {
  analytics.track('maps_api_usage', {
    endpoint,
    success,
    timestamp: new Date().toISOString()
  })
}
```

### 2. Error Monitoring

```typescript
// Monitor API errors
const trackMapError = (error: string, endpoint: string) => {
  console.error(`Maps API Error [${endpoint}]:`, error)
  analytics.track('maps_api_error', {
    error,
    endpoint,
    timestamp: new Date().toISOString()
  })
}
```

### 3. Cost Monitoring

Set up Google Cloud Billing alerts:
- **Daily budget**: $50/day (adjust based on usage)
- **Monthly budget**: $1,000/month
- **Alert thresholds**: 50%, 80%, 100% of budget

## 🔧 Implementation Checklist

### ✅ Immediate Security (Completed)
- [x] Remove client-side API key from layout.tsx
- [x] Implement server-side proxy endpoints
- [x] Add input validation and sanitization
- [x] Implement rate limiting
- [x] Create secure client hooks

### 🔄 Google Cloud Configuration (Action Required)
- [ ] Create separate client and server API keys
- [ ] Configure API restrictions per key
- [ ] Set up HTTP referrer restrictions
- [ ] Configure IP address restrictions for server key
- [ ] Set up daily quotas
- [ ] Enable billing alerts

### 🚀 Production Deployment
- [ ] Test all endpoints in staging environment
- [ ] Verify rate limiting works correctly
- [ ] Confirm error handling for all failure modes
- [ ] Monitor initial production usage
- [ ] Set up alerting for quota approaching limits

## 🧪 Testing

### 1. Security Testing

```bash
# Test rate limiting
curl -X POST http://localhost:3000/api/maps/geocode \
  -H "Content-Type: application/json" \
  -d '{"address":"123 Main St"}' \
  --rate 15/min

# Test input validation
curl -X POST http://localhost:3000/api/maps/geocode \
  -H "Content-Type: application/json" \
  -d '{"address":""}' # Should return 400
```

### 2. Functionality Testing

```typescript
// Test secure geocoding
test('secure geocoding works correctly', async () => {
  const { geocodeAddress } = useSecureGoogleMaps()
  const results = await geocodeAddress('1600 Amphitheatre Parkway, Mountain View, CA')
  expect(results).toHaveLength(1)
  expect(results[0].formatted_address).toContain('Amphitheatre Parkway')
})

// Test rate limiting
test('rate limiting prevents abuse', async () => {
  const { geocodeAddress } = useSecureGoogleMaps()
  
  // Make multiple rapid requests
  const promises = Array(15).fill(null).map(() => 
    geocodeAddress('Test Address')
  )
  
  await expect(Promise.all(promises)).rejects.toThrow('Rate limit exceeded')
})
```

## 🚀 Performance Considerations

### 1. Caching Strategy
- **Client-side**: Cache geocoding results for 1 hour
- **Server-side**: Consider Redis caching for frequent requests
- **CDN**: Cache static map responses where applicable

### 2. Bundle Optimization
- **Lazy Loading**: Maps only load when needed
- **Code Splitting**: Separate map components from main bundle
- **Compression**: Gzip/Brotli compression for API responses

## 📈 Future Enhancements

### 1. Advanced Security
- **JWT Authentication**: Add user authentication to API endpoints
- **API Key Rotation**: Implement automatic key rotation
- **Request Signing**: Add HMAC request signing
- **Geographic Restrictions**: Restrict usage to specific countries

### 2. Performance Optimization
- **Response Caching**: Implement intelligent caching
- **Request Batching**: Batch multiple geocoding requests
- **Progressive Enhancement**: Fallback to basic maps when API unavailable

### 3. Monitoring Enhancement
- **Real-time Alerts**: Slack/email notifications for quota approaching
- **Usage Analytics**: Detailed breakdown of API usage patterns
- **Cost Optimization**: Automated recommendations for cost reduction

## 🆘 Incident Response

### 1. API Key Compromise
1. **Immediate**: Revoke compromised key in Google Cloud Console
2. **Short-term**: Generate new key with proper restrictions
3. **Long-term**: Audit usage logs for unauthorized usage

### 2. Quota Exhaustion
1. **Immediate**: Implement graceful degradation
2. **Short-term**: Increase quotas if legitimate usage
3. **Long-term**: Optimize API usage patterns

### 3. Service Degradation
1. **Immediate**: Enable fallback map display
2. **Short-term**: Route to backup map provider if available
3. **Long-term**: Implement multi-provider strategy

## 📞 Support Contacts

- **Google Cloud Support**: [Your support plan]
- **Development Team**: [Your team contact]
- **Security Team**: [Your security contact]
- **On-call Engineer**: [Your on-call rotation]