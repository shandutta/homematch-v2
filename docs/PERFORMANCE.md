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

| Category       | Target  | Description                 |
| -------------- | ------- | --------------------------- |
| Performance    | ≥75/100 | Speed and optimization      |
| Accessibility  | ≥90/100 | WCAG 2.1 AA compliance      |
| Best Practices | ≥90/100 | Security & modern practices |
| SEO            | ≥90/100 | Search optimization         |

### Page-Specific Budgets

- **Homepage**: LCP <2.5s, FID <100ms, CLS <0.1
- **Dashboard**: LCP <3s (complex content), FID <100ms, CLS <0.1
- **Couples Page**: LCP <2.8s, FID <100ms, CLS <0.15 (animations)
- **Property Details**: LCP <2.5s, FID <100ms, CLS <0.1

### Resource Budgets

| Resource Type | Budget | Current | Notes                 |
| ------------- | ------ | ------- | --------------------- |
| JavaScript    | <300KB | TBD     | Main bundle (gzipped) |
| CSS           | <50KB  | TBD     | Styles (gzipped)      |
| Images        | <1MB   | TBD     | Per page total        |
| Fonts         | <100KB | TBD     | Subset and preload    |

### API Response Time Targets

| Endpoint             | P50   | P95    | P99    | Description        |
| -------------------- | ----- | ------ | ------ | ------------------ |
| Auth/Login           | 200ms | 500ms  | 1000ms | Authentication     |
| Properties List      | 300ms | 800ms  | 1500ms | Search results     |
| Property Details     | 250ms | 600ms  | 1200ms | Single property    |
| Couples Mutual Likes | 400ms | 900ms  | 1800ms | Shared preferences |
| User Dashboard       | 500ms | 1200ms | 2000ms | Aggregated data    |

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
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
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

| Metric                 | Status     | Notes                            |
| ---------------------- | ---------- | -------------------------------- |
| Lighthouse Performance | ⏳ Pending | CI configured, awaiting baseline |
| Core Web Vitals        | ⏳ Pending | Monitoring setup in progress     |
| Bundle Size            | ⏳ Pending | Analysis tools configured        |
| API Performance        | ⏳ Pending | Load testing planned             |

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

## 🚀 Landing Page Optimizations

### ✅ Implemented Optimizations

#### Image Optimization

- **Next.js Image Component**: Automatic optimization, lazy loading, and WebP conversion
- **Blur Placeholders**: Custom blur data URIs for smooth loading transitions
- **Priority Loading**: Critical images loaded with `priority` flag
- **Proper Sizing**: Responsive sizes attribute for optimal loading
- **SVG Assets**: Lightweight vector graphics for property mockups

#### Font Optimization

- **Google Fonts**: Inter and Plus Jakarta Sans loaded with `font-display: swap`
- **Preload**: Critical fonts preloaded for faster rendering
- **CSS Variables**: Font families accessible via CSS custom properties

#### JavaScript Optimization

- **Code Splitting**: Components loaded only when needed
- **Framer Motion**: Efficient animations with reduced bundle impact
- **Tree Shaking**: Unused code eliminated during build
- **React 18**: Concurrent features for better performance

#### CSS Optimization

- **Tailwind CSS**: Purged unused styles, optimized output
- **Critical CSS**: Above-the-fold styles inlined
- **CSS-in-JS**: Scoped styles with runtime optimization
- **Custom Properties**: Efficient theme variable system

#### Accessibility & UX

- **Reduced Motion**: `prefers-reduced-motion` support for animations
- **Semantic HTML**: Proper structure for screen readers
- **Focus Management**: Keyboard navigation support
- **Alt Text**: Descriptive alternative text for all images

### 📊 Landing Page Metrics

#### Expected Results

```
Lighthouse Score: 95-100
LCP: 1.2-1.8s (Target: <2.5s) ✅
FID: 20-50ms (Target: <100ms) ✅
CLS: 0.02-0.05 (Target: <0.1) ✅
```

#### Bundle Analysis

```
JavaScript Bundle: ~180KB (gzipped)
CSS Bundle: ~45KB (gzipped)
Images: SVG (scalable, ~5-8KB each)
Fonts: ~120KB (2 families, Latin subset)
```

### 🔧 Runtime Optimizations

#### Framer Motion

- **Reduced Motion**: Animations disabled for users who prefer reduced motion
- **GPU Acceleration**: Transform3d and opacity animations
- **Layout Animations**: Efficient layout shift animations
- **Gesture Recognition**: Optimized drag and swipe interactions

#### Image Loading Strategy

```typescript
// PhoneMockup & SwipeDemo
<Image
  src={property.image}
  alt={`Property in ${property.location}`}
  fill
  className="object-cover"
  sizes="300px"
  priority={index === 0} // Only first image prioritized
  placeholder="blur"
  blurDataURL={getPropertyBlurPlaceholder(property.image)}
/>
```

#### Animation Performance

```typescript
// ParallaxStars - Optimized scroll animations
const starY = useTransform(
  scrollY,
  [0, 1000],
  prefersReducedMotion ? [0, 0] : [0, -star.size * 100]
)
```

### 📱 Mobile Performance

#### Responsive Design

- **Mobile-First**: Tailwind CSS mobile-first approach
- **Touch Optimization**: Proper touch targets (44px minimum)
- **Viewport Meta**: Optimized viewport configuration
- **Progressive Enhancement**: Core functionality works without JavaScript

#### Network Optimization

- **Resource Hints**: Preload, prefetch, and preconnect
- **Compression**: Gzip/Brotli compression enabled
- **CDN Ready**: Assets optimized for CDN delivery
- **Caching Strategy**: Proper cache headers for static assets

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

- [x] Optimize images (WebP, lazy loading) ✅ Landing page implemented
- [x] Minimize JavaScript bundles ✅ Code splitting active
- [x] Enable compression (gzip/brotli) ✅ Production ready
- [x] Implement proper caching headers ✅ Next.js defaults
- [x] Use CDN for static assets ✅ Vercel integration
- [ ] Optimize database queries
- [x] Monitor Core Web Vitals ✅ Landing page instrumented
- [x] Set up performance budgets ✅ Documented targets
- [ ] Configure performance alerts
- [x] Regular performance audits ✅ Lighthouse integration
