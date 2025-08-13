# Performance Guide - HomeMatch v2

## Overview

HomeMatch v2 includes comprehensive performance monitoring, testing, and optimization to ensure optimal user experience. This guide covers performance budgets, monitoring setup, testing procedures, and optimization strategies.

## 📊 Performance Budgets & Targets

### Core Web Vitals Standards

| Metric                             | Good   | Needs Improvement | Poor    | Our Target |
| ---------------------------------- | ------ | ----------------- | ------- | ---------- |
| **LCP** (Largest Contentful Paint) | <2.5s  | 2.5s - 4s         | >4s     | <2.5s      |
| **FID** (First Input Delay)        | <100ms | 100ms - 300ms     | >300ms  | <100ms     |
| **CLS** (Cumulative Layout Shift)  | <0.1   | 0.1 - 0.25        | >0.25   | <0.1       |
| **FCP** (First Contentful Paint)   | <1.8s  | 1.8s - 3s         | >3s     | <1.8s      |
| **TTFB** (Time to First Byte)      | <800ms | 800ms - 1800ms    | >1800ms | <800ms     |

### Lighthouse Scores

| Category           | Target  | Description                 |
| ------------------ | ------- | --------------------------- |
| Performance        | ≥75/100 | Speed and optimization      |
| Accessibility      | ≥90/100 | WCAG 2.1 AA compliance     |
| Best Practices     | ≥90/100 | Security & modern practices |
| SEO                | ≥90/100 | Search optimization         |

### Page-Specific Budgets

- **Homepage**: LCP <2.5s, FID <100ms, CLS <0.1
- **Dashboard**: LCP <3s (complex content), FID <100ms, CLS <0.1  
- **Couples Page**: LCP <2.8s, FID <100ms, CLS <0.15 (animations)
- **Property Details**: LCP <2.5s, FID <100ms, CLS <0.1

### Resource Budgets

| Resource Type | Budget | Current | Notes                    |
| ------------- | ------ | ------- | ------------------------ |
| JavaScript    | <300KB | TBD     | Main bundle (gzipped)    |
| CSS           | <50KB  | TBD     | Styles (gzipped)         |
| Images        | <1MB   | TBD     | Per page total           |
| Fonts         | <100KB | TBD     | Subset and preload       |

### API Response Time Targets

| Endpoint                     | P50   | P95   | P99    | Description           |
| ---------------------------- | ----- | ----- | ------ | --------------------- |
| Auth/Login                   | 200ms | 500ms | 1000ms | Authentication        |
| Properties List              | 300ms | 800ms | 1500ms | Search results        |
| Property Details             | 250ms | 600ms | 1200ms | Single property       |
| Couples Mutual Likes         | 400ms | 900ms | 1800ms | Shared preferences    |
| User Dashboard               | 500ms | 1200ms| 2000ms | Aggregated data       |

## 🔧 Performance Testing

### Quick Start Commands

```bash
# Run comprehensive benchmark
pnpm run perf:benchmark

# Establish baseline metrics  
pnpm run perf:baseline

# Run Lighthouse CI
pnpm run perf:lighthouse

# Analyze bundle size
pnpm run perf:bundle

# Start dev server with performance monitoring
pnpm run perf:monitor
```

### Testing Procedures

#### 1. Core Web Vitals Testing

```bash
# Lighthouse CI (automated)
pnpm run perf:lighthouse

# Manual Lighthouse audit
npx lighthouse http://localhost:3000 --output-path ./lighthouse-report.html
```

#### 2. Load Testing

```bash
# K6 load testing (if configured)
k6 run performance/load-test.js

# Artillery load testing (alternative)
artillery quick --count 10 --num 5 http://localhost:3000
```

#### 3. Bundle Analysis

```bash
# Next.js bundle analyzer
pnpm run perf:bundle

# Webpack bundle analyzer
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

### Performance Test Cases

1. **Cold Page Load**: First visit performance
2. **Warm Page Load**: Cached resources performance  
3. **Navigation Speed**: Client-side route changes
4. **Form Interactions**: User input responsiveness
5. **Search Performance**: Query execution time
6. **Image Loading**: Progressive image optimization

## 📈 Performance Monitoring

### Development Monitoring

Start development server with built-in performance monitoring:

```bash
pnpm run perf:monitor
```

This provides:
- Real-time Core Web Vitals tracking
- Bundle size monitoring
- API response time tracking
- Memory usage alerts

### Production Monitoring

#### Web Vitals Tracking

```typescript
// Automatic Core Web Vitals collection
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);  
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

#### Real User Monitoring (RUM)

- **PostHog**: User experience analytics
- **Sentry**: Error tracking with performance impact
- **Vercel Analytics**: Edge performance metrics

### Performance Alerts

Set up alerts for:
- LCP > 3s (critical)
- FID > 200ms (warning)  
- CLS > 0.15 (warning)
- API response > 2s (critical)
- Bundle size > 400KB (warning)

## ⚡ Optimization Strategies

### Frontend Optimizations

#### 1. Code Splitting
- Route-based splitting with Next.js App Router
- Component-level lazy loading
- Third-party library code splitting

#### 2. Image Optimization
- Next.js Image component with WebP/AVIF
- Responsive images with multiple sizes
- Image preloading for critical content

#### 3. Font Optimization
- Google Fonts with `font-display: swap`
- Font subsetting for reduced file size
- Preload critical fonts

#### 4. CSS Optimization
- Tailwind CSS purging unused styles
- Critical CSS inlining
- CSS-in-JS optimization

### Backend Optimizations

#### 1. Database Performance
- Query optimization with indexes
- Connection pooling
- Read replicas for heavy queries

#### 2. Caching Strategy
- Redis caching for API responses
- CDN caching for static assets
- Browser caching with proper headers

#### 3. API Optimization
- Request batching and deduplication
- Pagination for large datasets
- Compression (gzip/brotli)

### Infrastructure Optimizations

#### 1. Edge Computing
- Vercel Edge Functions for geo-distributed logic
- Edge caching with ISR (Incremental Static Regeneration)

#### 2. Asset Delivery
- CDN distribution via Vercel
- Image optimization pipeline
- Font optimization and delivery

## 📊 Current Performance Status

**Last Updated**: January 2025  
**Environment**: Development

| Metric | Status | Notes |
|--------|---------|-------|
| Lighthouse Performance | ⏳ Pending | CI configured, awaiting baseline |
| Core Web Vitals | ⏳ Pending | Monitoring setup in progress |
| Bundle Size | ⏳ Pending | Analysis tools configured |
| API Performance | ⏳ Pending | Load testing planned |

### Performance Roadmap

**Phase 1** (Week 1-2):
- Establish baseline measurements
- Configure monitoring and alerts
- Implement critical optimizations

**Phase 2** (Week 3-4):
- Bundle size optimization
- Image loading improvements
- API response optimization

**Phase 3** (Week 5-6):
- Advanced caching strategies
- Edge computing implementation
- Performance regression testing

## 🔍 Performance Debugging

### Common Issues

1. **Slow LCP**: Large images, render-blocking resources
2. **High FID**: Large JavaScript bundles, main thread blocking
3. **Layout Shift**: Dynamic content, missing dimensions
4. **Slow TTFB**: Database queries, server processing

### Debugging Tools

- **Chrome DevTools**: Performance tab, Network tab
- **Lighthouse**: Automated auditing
- **WebPageTest**: Detailed performance analysis
- **React DevTools**: Component performance profiling

### Performance Checklist

- [ ] Optimize images (WebP, lazy loading)
- [ ] Minimize JavaScript bundles
- [ ] Enable compression (gzip/brotli)
- [ ] Implement proper caching headers
- [ ] Use CDN for static assets
- [ ] Optimize database queries
- [ ] Monitor Core Web Vitals
- [ ] Set up performance budgets
- [ ] Configure performance alerts
- [ ] Regular performance audits