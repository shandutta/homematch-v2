# Zillow / listing-data provider production-grade evaluation

Date: 2026-05-08
Task: t_99515e84
Mode: read-only research; no subscriptions, payments, plan activations, or secret-bearing API calls were made.

## Executive recommendation

HomeMatch should not double down on the current RapidAPI Zillow-shaped provider as the only production listing-data dependency until the subscription and terms are re-approved. The code is coupled to an unofficial RapidAPI host (`us-housing-market-data1.p.rapidapi.com`) and to Zillow-like payload names (`props`, `zpid`, `/propertyExtendedSearch`, `/property`, `/property-details`, `/images`). That route is workable for an internal revival / prototype, but it is not the strongest production-grade foundation for a consumer-facing Bay Area home discovery product.

Recommended path:

1. Keep the current RapidAPI implementation behind an adapter for short-term continuity only.
2. Pilot RentCast as the likely best near-term replacement for active sale listings + records + basic market data because it has public docs, transparent self-serve onboarding, active sale-listing search, 140M+ property records, 50 free API calls/month for testing, no branding attribution requirement per its public help docs, and request-volume-based API billing.
3. Treat official MLS/IDX/RESO as the long-term highest-quality source for true listing display, but only after Shan approves brokerage / agent / vendor dependency and MLS compliance work. It is likely the most correct data path, not the fastest path.
4. Do not choose ATTOM, HouseCanary, Datafiniti, Homesage, or RealEstateAPI.com as the first replacement if the immediate need is active consumer listing inventory. They are more likely to be valuable for enrichment, valuation, analytics, owner/public-record data, or enterprise/bulk workflows than as a simple Zillow-listing ingestion swap.

Decision: use a provider abstraction plus a RentCast trial spike as P3 work; create a separate approval gate before any paid provider, MLS agreement, or production display launch.

## Current HomeMatch dependency inventory

### Configuration and subscription assumptions

HomeMatch currently expects:

- `RAPIDAPI_KEY`
- optional `RAPIDAPI_HOST`, defaulting to `us-housing-market-data1.p.rapidapi.com`
- cron secrets for Zillow ingest and status refresh
- `ZILLOW_LOCATIONS` for semicolon-separated city list overrides

A local environment file exists and contains a RapidAPI key-shaped value and host value by length only; `.env.prod` is missing in this checkout. I did not print or use the key.

Relevant files inspected:

- `/home/shan/projects/homematch-v2/docs/RAPIDAPI_ZILLOW.md`
- `/home/shan/projects/homematch-v2/docs/SETUP_GUIDE.md`
- `/home/shan/projects/homematch-v2/docs/property-vibes-backfill.md`
- `/home/shan/projects/homematch-v2/src/lib/api/zillow-client.ts`
- `/home/shan/projects/homematch-v2/src/lib/ingestion/zillow.ts`
- `/home/shan/projects/homematch-v2/src/lib/migration/data-transformer.ts`
- `/home/shan/projects/homematch-v2/src/app/api/admin/ingest/zillow/route.ts`
- `/home/shan/projects/homematch-v2/src/app/api/admin/status-refresh/route.ts`
- `/home/shan/projects/homematch-v2/src/app/api/zillow/random-image/route.ts`
- `/home/shan/projects/homematch-v2/src/app/api/admin/generate-vibes-zillow/route.ts`
- `scripts/ingest-zillow.ts`
- `scripts/refresh-zillow-status.ts`
- `scripts/refresh-zillow-status-search.ts`
- `scripts/refresh-zillow-status-detail.ts`
- `scripts/fetch-zillow-images.ts`
- `scripts/report-zillow-coverage.ts`

### Endpoints used today

The docs and code use these RapidAPI endpoints:

- `GET /propertyExtendedSearch`
  - Main listing discovery endpoint.
  - Query assumptions include `location`, `status_type=ForSale`, `page`, `pageSize`, optional `sort`, optional `minPrice`, optional `maxPrice`.
  - Code expects results under `props` and counts under `totalResultCount` for coverage reporting.
- `GET /property` and `GET /property-details`
  - Status/detail refresh by `zpid`.
  - Different files use different detail endpoint names, which is a portability risk.
- `GET /images`
  - Fetches full gallery by `zpid` for random-image cards and vibes generation.

The older `src/lib/api/zillow-client.ts` also contains methods for `/property-history`, `/comparable-properties`, `/neighborhood-info`, and `/market-trends`, but the live ingestion/status scripts I inspected are materially centered on search, details/status, and images.

### Data model HomeMatch needs from a provider

Minimum viable fields currently transformed into `properties`:

- Stable provider listing/property id: currently `zpid`, used as `onConflict: zpid`
- Address, city, state, zip
- Price
- Bedrooms, bathrooms
- Living area / square feet
- Lot size
- Year built
- Property type mapped to HomeMatch enum
- Listing status and active/inactive flag
- Image URLs
- Latitude/longitude

Useful but not mandatory fields:

- MLS number
- Listing agent / broker attribution
- Days on market / listing date
- HOA
- Price/listing history
- Public-record property characteristics
- Sale/rent valuation, comps, market stats
- Media update timestamp or stable media ids
- Explicit terms for user-facing display, caching, attribution, and derived content/LLM usage

### Request volume and operational pattern

Current documented RapidAPI plan math assumes an Ultra plan with 45,000 requests/month and 3 requests/second.

Default HomeMatch crawl shape:

- 74 Bay Area locations in `src/app/api/admin/ingest/zillow/route.ts`.
- Default `pageSize=50` and `maxPages=10`.
- Worst case ingestion run: 74 locations \* 10 pages = 740 search requests per sort.
- Suggested schedule in docs:
  - daily `sort=Newest`: about 22,200 requests/month
  - daily status refresh, 600 active listings/day: about 18,000 requests/month
  - weekly `sort=Price_Low_High`: about 2,960 requests/month
  - total about 43,160/month before image refresh/manual runs/spikes
- Default pacing is 350ms, roughly 3 rps with headroom.

This means any replacement provider needs to handle at least 45k monthly requests, a few hundred to a few thousand records per city crawl, pagination, and daily active-listing refresh. If the provider prices per returned record rather than per request, HomeMatch must re-run the monthly cost model.

## Risk assessment of current RapidAPI route

### Strengths

- Already integrated and tested around HomeMatch's current schema.
- Cheap/fast if the current subscription is active.
- Search, detail, and image gallery endpoints map well to the current product experience.
- The code has retry/backoff behavior and a cost model in docs.

### Production risks

- It is an unofficial aggregator path, not a Zillow partnership or MLS agreement.
- The actual host/provider is `apimaker` on RapidAPI per public search result, not a direct Zillow API relationship.
- Endpoint and response names are not standardized; the code already uses both `/property` and `/property-details` in different places.
- Terms, display rights, media rights, caching rights, and attribution obligations are unclear from the app docs.
- RapidAPI marketplace plans can change, disappear, throttle, or fail without the same enterprise SLA posture as direct providers.
- If the subscription is inactive, production becomes a billing/account problem, not an engineering problem.
- The current monthly plan leaves only about 1,800 requests of headroom after suggested ingestion/status/weekly coverage; image refreshes and manual debugging can exceed that quickly.

Bottom line: keep as a temporary adapter, not the canonical production dependency.

## Provider evaluation matrix

| Provider / route                                                       | Best fit                                                |                Active listings fit |                             Production fit for HomeMatch | Notes                                                                                                                                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------: | -------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current RapidAPI `us-housing-market-data1`                             | Short-term continuity                                   |                     High if active |                                               Medium-low | Already integrated but unofficial, terms/continuity uncertain, tight quota headroom.                                                                                                                        |
| RentCast API                                                           | Near-term replacement candidate                         |                               High | High for pilot, medium-high for production pending terms | Public REST API; sale listings, property records, valuations, market data; 140M+ records; docs show sale listing search by city/state/zip/lat-lng/radius/status/price/days listed and pagination up to 500. |
| Official MLS/IDX/RESO via BridgeMLS / MLSListings / CRMLS / IDX vendor | Long-term listing source of truth                       |                          Very high |  Highest data quality but high compliance/setup friction | Requires licensed broker/agent/member/vendor relationship, display rules, attribution, MLS-specific approval. Not a no-click API subscription.                                                              |
| ATTOM                                                                  | Enrichment, public records, valuation, market analytics | Medium/unclear for active listings |        High as enrichment; not first listing replacement | Strong national property/public-record data, 158M+ properties, 30-day trial. Better for parcel/tax/sales/community/valuation than consumer active listing inventory.                                        |
| HouseCanary                                                            | Valuation, forecasting, risk, market analytics          |                         Low-medium |                                     Medium as enrichment | 75+ data points and 36-month forecasts per HouseCanary article. Valuable for recommendations/analytics, not primary listing inventory.                                                                      |
| RealEstateAPI.com / BatchData-like lead-gen APIs                       | Property records, AVM, skip tracing, investor workflows |                     Medium/unclear |                                 Medium; diligence needed | Likely useful for property/owner/enrichment. Must avoid owner/contact data unless product use case and privacy review approve it.                                                                           |
| Datafiniti                                                             | Bulk property/listing enrichment from many sites        |                             Medium |                         Medium-low for first replacement | Useful for bulk/custom data. Pricing appears materially higher from third-party snippets, and licensing/source freshness needs diligence.                                                                   |
| Homesage.ai                                                            | AI valuation/investment analytics                       |                         Low-medium |                                     Medium as enrichment | Interesting for valuation/renovation/investment insights; not the cleanest listing ingestion swap.                                                                                                          |
| Scraping infrastructure                                                | Fallback data acquisition                               |                             Medium |                                       Low for production | Avoid for HomeMatch production unless explicitly legally approved. Terms, anti-bot, data quality, and sustainability risks are high.                                                                        |

## Candidate details

### 1. RentCast

Public claims and docs reviewed:

- API page: 140M+ property records, valuation estimates, active sale/rental listings, market trends, 500k+ daily updates, 50 free API calls/month, no attribution/branding requirement.
- Help Center: public REST API, API dashboard with keys/usage/billing/error rates/latencies, 50 free API calls/month, paid plans scale with volume, flexible licensing subject to Terms.
- Developer docs: `GET Sale Listings` supports city/state/zip/address/lat-long/radius, property type, beds/baths, square footage, lot size, year built, status `Active`/`Inactive`, price, days since listed, limit 1-500, offset pagination, optional `X-Total-Count`.
- Developer docs: `GET Property Records` supports similar geo/property filters and limit 1-500.

Fit to HomeMatch:

- Strong field overlap: address, city/state/zip, status, price, beds/baths, sqft, lot size, year built, property type, location search, listing status, pagination.
- Could replace `propertyExtendedSearch` with sale-listing search per city or ZIP.
- Could replace detail/status refresh with sale-listing `status=Active` sweeps plus specific property/record lookups, depending on returned listing schema and ids.
- Known gap to verify: image media depth and user-facing photo display terms. RentCast public snippets emphasize listings and attributes; the spike must confirm image fields, media count, image caching/display permissions, attribution, and source/MLS compliance terms.

Recommendation: first paid/provider spike, but only within free-call limit until approval.

### 2. Official MLS / IDX / RESO

Public findings:

- RESO Web API is the modern industry data transport standard using REST/OData/JSON/OAuth and standardized data dictionaries, but RESO explicitly does not provide MLS data itself.
- CRMLS public IDX FAQ says IDX feeds allow agents/brokers to display for-sale/sold listings; display of other brokers' listings has conditions and attribution requirements.
- BridgeMLS public vendor page says members can access MLS data through RESO Web API using Bridge Interactive; access is typically for licensed real estate professionals such as agents/brokers, and bridgeMLS is RESO certified.
- MLSListings/IDX Broker public page advertises 1-hour update frequency and data connection/management fees in snippets.

Fit to HomeMatch:

- Highest data quality and legitimacy for Bay Area active listing display.
- Best path if HomeMatch becomes a real consumer listing product rather than a prototype/research experience.
- Harder because it may require Shan to partner with or become affiliated with a broker/agent, use an approved IDX vendor, comply with attribution/disclaimer/photo/sold-listing rules, and implement feed-specific display constraints.

Recommendation: long-term production path only after business/legal approval. Do not block the P3 provider spike on MLS, but design adapters to make MLS migration possible.

### 3. ATTOM

Public findings:

- ATTOM API covers 158M+ U.S. properties and 99% of residents, with property, community, consumer, financial, environmental, valuation, risk, market, mortgage, transaction, school, parcel, crime, appraisal, demographic, and sales-history data.
- ATTOM offers a 30-day trial per public docs.

Fit to HomeMatch:

- Good enrichment source for property characteristics, public records, tax/sales history, AVM, community/school/market risk.
- Not the clearest replacement for active, user-facing listing inventory and photos.

Recommendation: evaluate after RentCast or MLS path if HomeMatch needs deeper analytics/trust signals.

### 4. HouseCanary

Public findings:

- HouseCanary article says Data Explorer API provides 75+ data points and forecasts home price/rental performance up to 36 months.
- It positions itself around valuation, forecasting, risk, underwriting, and market intelligence.

Fit to HomeMatch:

- Potentially strong for recommendation quality, price/rent forecasts, and neighborhood/property insights.
- Weak as first active-listing source replacement.

Recommendation: enrichment/analytics later, not primary listing pipeline.

### 5. Datafiniti

Public findings:

- Search snippets describe property data API access to real-estate listings from dozens of websites and third-party pricing around 100k property records/month for about $899/month.

Fit to HomeMatch:

- Potentially useful if HomeMatch wants bulk datasets and can tolerate higher cost and provider diligence.
- Source licensing and freshness need review.

Recommendation: not the first replacement unless RentCast fails image/listing freshness requirements.

### 6. RealEstateAPI.com / BatchData-style options

Public findings:

- RealEstateAPI.com appears in 2026 API comparison content as developer-focused property data for custom apps and bulk integrations.
- BatchData public comparison content emphasizes 155M+ properties, 700+ attributes, owner/contact enrichment, skip tracing, bulk/direct-cloud access, and compliance tooling.

Fit to HomeMatch:

- Useful for property record enrichment and investor/lead workflows.
- Owner/contact enrichment is not aligned with the initial HomeMatch consumer discovery use case and creates privacy/compliance surface area.

Recommendation: defer unless a specific enrichment need emerges.

### 7. Homesage.ai

Public findings:

- Homesage search results emphasize AI valuation, renovation cost estimation, investment analytics, and broad U.S. property coverage.

Fit to HomeMatch:

- Interesting for future “why this home” analysis or investment/renovation insights.
- Not first choice for live listing/search/photo inventory.

Recommendation: later enrichment candidate.

## Migration path

### Phase 0: Approval and non-secret validation gate

Before engineering work beyond read-only evaluation:

- Confirm whether Shan wants to keep the current RapidAPI subscription active for temporary continuity.
- Confirm acceptable monthly budget bands: $0/free spike, <$100/month, <$500/month, or enterprise/custom.
- Confirm acceptable source policy:
  - unofficial RapidAPI allowed for prototype only?
  - direct provider required before launch?
  - MLS/IDX required before consumer listing display?
- Confirm whether HomeMatch can display third-party listing photos and use them for LLM-generated vibes.
- Confirm whether active listing data can be cached and for how long.

### Phase 1: Adapter boundary

Add a provider-neutral listing ingestion interface before swapping providers:

```ts
type ListingProvider = 'rapidapi-zillow' | 'rentcast' | 'idx-reso'

type ProviderListing = {
  provider: ListingProvider
  provider_listing_id: string
  provider_property_id?: string
  mls_number?: string
  address: string
  city: string
  state: string
  zip_code: string
  price: number
  bedrooms: number
  bathrooms: number
  square_feet?: number
  lot_size_sqft?: number
  year_built?: number
  property_type?: string
  listing_status: string
  is_active: boolean
  latitude?: number
  longitude?: number
  images?: string[]
  listed_at?: string
  days_on_market?: number
  attribution?: {
    listing_agent?: string
    listing_broker?: string
    source?: string
    source_url?: string
    required_disclaimer?: string
  }
  raw: unknown
}
```

Schema implication: add provider metadata rather than overloading `zpid` forever. Keep `zpid` for backward compatibility, but introduce `source_provider`, `source_listing_id`, `source_property_id`, `mls_number`, `source_updated_at`, `attribution`, and `raw_provider_payload` if production terms allow storing raw payloads.

### Phase 2: RentCast free-call spike

Within the 50 free calls/month and without paid activation:

- Create API client in a branch only after Shan approves using a free account/API key.
- Test 3-5 Bay Area cities or ZIPs with `limit=1-10`, `status=Active`, and `X-Total-Count` equivalent.
- Map fields to the adapter type.
- Verify media fields and licensing terms before any image/vibes use.
- Compare counts against current RapidAPI coverage script for the same cities if current RapidAPI is still usable.
- Produce a cost model for 74 cities at 500-per-page pagination and daily refresh.

Exit criteria:

- Active sale listing search works for Bay Area cities/ZIPs.
- Response includes stable ids and enough fields for HomeMatch cards.
- Photo/display terms are acceptable or HomeMatch can degrade to non-photo cards.
- Monthly request/record cost is approved.
- Rate limit can support daily ingestion/status refresh.

### Phase 3: Production hardening

- Add provider-level circuit breaker and per-provider request ledger.
- Add city/ZIP crawl schedule with monthly quota guardrails.
- Add stale/source confidence fields in UI/admin.
- Add compliance-rendered attribution/disclaimers if required.
- Add automated coverage report comparing DB active counts to provider totals.
- Keep RapidAPI disabled or fallback-only after RentCast parity.

### Phase 4: MLS/IDX path if HomeMatch becomes public listing product

- Decide broker/agent/vendor route.
- Identify Bay Area coverage needs across BridgeMLS, MLSListings, CRMLS, and any data-share gaps.
- Choose direct RESO/Bridge Interactive vs IDX vendor.
- Implement mandatory attribution/disclaimer/photo/sold-listing display rules.
- Keep the provider adapter so MLS feed becomes another provider, not a rewrite.

## Approval / cost gates

Do not proceed beyond read-only research until these are answered:

1. Current RapidAPI status: keep, cancel, or let inactive?
2. Trial key approval: may a RentCast free API key be created and used for <=50 calls/month?
3. Budget ceiling for provider tests: $0, <$100/month, <$500/month, or custom/enterprise OK?
4. Terms review: who approves display/caching/photo/LLM use of provider data?
5. Product posture: prototype/internal-only vs public consumer listing display?
6. MLS posture: is Shan willing to use a broker/agent/IDX-vendor path if required?
7. Data retention: how long can listing data, images, and raw payloads be cached after delisting?
8. Fallback UX: is it acceptable to show fewer/no images if provider terms or media coverage are weak?

## Concrete next action

Create a small engineering task: “Add listing provider abstraction and RentCast free-call spike plan.” It should not make paid calls. The first implementation should add adapter types, a no-op provider test harness, and a documented mapping table. Actual RentCast calls should wait for Shan’s explicit approval to create/use an API key and accept terms.

## Sources

Repo/code sources:

- `docs/RAPIDAPI_ZILLOW.md`: current endpoints, plan math, 45k/month/3 rps assumption, cron schedule.
- `src/app/api/admin/ingest/zillow/route.ts`: 74 Bay Area locations, `RAPIDAPI_KEY`, optional `RAPIDAPI_HOST`, sort/min/max/maxPages query params, cron secret protection.
- `src/lib/ingestion/zillow.ts`: default page size 50, max pages 10, 350ms delay, `props` parsing, `totalResultCount`, upsert by `zpid`, field mapping.
- `src/app/api/admin/status-refresh/route.ts`: active listing status refresh using `/property?zpid=...`, default limit 600.
- `src/app/api/zillow/random-image/route.ts` and `src/app/api/admin/generate-vibes-zillow/route.ts`: `/images?zpid=...` dependency.

Web sources:

- RentCast API: https://www.rentcast.io/api
- RentCast Help Center API article: https://help.rentcast.io/en/articles/7992900-rentcast-property-data-api
- RentCast developer docs, sale listings: https://developers.rentcast.io/reference/sale-listings
- RentCast developer docs, property records: https://developers.rentcast.io/reference/property-records
- ATTOM API overview: https://www.attomdata.com/solutions/property-data-api/how-it-works/
- RESO Web API: https://www.reso.org/reso-web-api/
- HouseCanary 2026 API comparison: https://www.housecanary.com/blog/real-estate-api
- CRMLS IDX FAQ search result: https://kb.crmls.org/knowledgebase/idx-and-listing-credit-faqs
- BridgeMLS RESO/IDX access search result: https://mlsimport.com/bridgemls
- MLSListings IDX Broker search result: https://idxbroker.com/mls/mlslistings-inc-mlslistings
