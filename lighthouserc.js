/**
 * Lighthouse CI Configuration
 *
 * Performance budgets and thresholds for HomeMatch v2
 * Ensures consistent performance across deployments
 */

module.exports = {
  ci: {
    collect: {
      // Test multiple critical pages
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/properties',
        'http://localhost:3000/couples',
        'http://localhost:3000/profile',
        'http://localhost:3000/settings',
      ],
      startServerCommand: 'pnpm run build && pnpm run start',
      startServerReadyPattern: 'ready on',
      numberOfRuns: 3, // Run 3 times for median scores
      settings: {
        preset: 'desktop',
        // Simulate 3G network for realistic testing
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        // Enable more audits
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
        skipAudits: ['uses-http2'], // Skip HTTP/2 check for localhost
      },
    },
    assert: {
      assertions: {
        // Performance thresholds (0-100 scale)
        'categories:performance': ['error', { minScore: 0.75 }], // 75+ required
        'categories:accessibility': ['error', { minScore: 0.9 }], // 90+ required (WCAG 2.1 AA)
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s max
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }], // 3s max
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1 max
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms max
        'speed-index': ['warn', { maxNumericValue: 4000 }], // 4s max

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 500000 }], // 500KB max JS
        'resource-summary:stylesheet:size': [
          'warn',
          { maxNumericValue: 100000 },
        ], // 100KB max CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 2000000 }], // 2MB max images
        'resource-summary:total:size': ['error', { maxNumericValue: 3000000 }], // 3MB total

        // Accessibility specific
        'color-contrast': 'error',
        'image-alt': 'error',
        label: 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-*': 'warn',

        // Best practices
        'errors-in-console': 'warn',
        'no-vulnerable-libraries': 'error',
        'uses-passive-event-listeners': 'warn',
        'uses-rel-preconnect': 'warn',

        // HomeMatch-specific performance targets
        'server-response-time': ['warn', { maxNumericValue: 600 }], // 600ms TTFB
        interactive: ['error', { maxNumericValue: 5000 }], // 5s TTI
        'max-potential-fid': ['error', { maxNumericValue: 250 }], // 250ms max FID

        // Mobile performance (when testing mobile preset)
        viewport: 'error',
        'tap-targets': 'warn',

        // Image optimization
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'image-aspect-ratio': 'warn',

        // JavaScript performance
        'unused-javascript': ['warn', { maxNumericValue: 100000 }], // 100KB unused JS
        'bootup-time': ['warn', { maxNumericValue: 4000 }], // 4s JS execution
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }], // 4s main thread

        // Network performance
        'network-rtt': ['warn', { maxNumericValue: 150 }],
        'network-server-latency': ['warn', { maxNumericValue: 500 }],
        'uses-long-cache-ttl': 'warn',
      },
    },
    upload: {
      // Store results locally for now
      target: 'filesystem',
      outputDir: '.lighthouseci',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
