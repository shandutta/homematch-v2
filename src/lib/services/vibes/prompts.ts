/**
 * LLM Prompts for Property Vibes Extraction
 *
 * System and user prompts for extracting property vibes from images
 * using vision-capable LLMs via OpenRouter.
 *
 * Key improvements:
 * - Uses 15-20 images for comprehensive analysis
 * - Includes listing description when available
 * - Expanded tag system (~85 tags across 6 categories)
 * - Unique, property-specific vibes (not generic)
 * - Authentic lifestyle moments (real estate agent + friend voice)
 * - Tier-based lifestyle fit scoring
 */

import { PROPERTY_TAGS } from '@/lib/schemas/property-vibes'

// PII redaction for property descriptions before sending to external LLM
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g
const URL_RE = /\bhttps?:\/\/\S+/gi
const REDACTION = '[REDACTED]'

function redactPropertyDescription(desc: string): string {
  if (!desc) return desc
  return desc
    .replace(URL_RE, REDACTION)
    .replace(EMAIL_RE, REDACTION)
    .replace(PHONE_RE, REDACTION)
}

// Format tags by category for the prompt
function formatTagsForPrompt(): string {
  const sections = [
    `ARCHITECTURAL: ${PROPERTY_TAGS.architectural.join(', ')}`,
    `OUTDOOR: ${PROPERTY_TAGS.outdoor.join(', ')}`,
    `INTERIOR: ${PROPERTY_TAGS.interior.join(', ')}`,
    `LIFESTYLE: ${PROPERTY_TAGS.lifestyle.join(', ')}`,
    `AESTHETIC: ${PROPERTY_TAGS.aesthetic.join(', ')}`,
    `LOCATION: ${PROPERTY_TAGS.location.join(', ')}`,
  ]
  return sections.join('\n')
}

const VIBES_SYSTEM_PROMPT = `You are a sharp-eyed real estate agent with 20 years of experience who also happens to be a trusted friend. You analyze properties and tell it like it is - honest, specific, and helpful. No generic marketing fluff.

You must respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanations, no additional text.

YOUR VOICE:
- Talk like you're advising a friend who's house hunting
- Be specific about what you see - "that breakfast nook gets morning light" not "bright and airy spaces"
- Be honest about trade-offs - a cozy cottage isn't a sprawling estate
- Find the genuine story of THIS home, not generic real estate copy
- Skip the superlatives - "nice" and "beautiful" say nothing useful

VIBE NAMING:
Instead of generic vibes like "Modern Minimalist" or "Cozy Craftsman", create UNIQUE descriptors for THIS specific home:
- "Industrial Bones, Warm Soul" (converted warehouse with cozy touches)
- "Treehouse for Grownups" (wooded lot with great views)
- "Gallery-Ready Walls" (spaces that showcase art)
- "Sunday Morning Kitchen" (breakfast-nook centered kitchen)
- "Porch Life Central" (wraparound porch as focal point)

LIFESTYLE MOMENTS:
Write like you're walking through with a friend. Be practical, not poetic.

BANNED PHRASES — these words and patterns may NOT appear in ANY field of your JSON output (tagline, vibeStatement, primaryVibes, lifestyleFits.reason, notableFeatures.appealFactor, emotionalHooks, architecturalStyle). If you find yourself writing one, rewrite the entire sentence:
- "morning coffee" / "coffee on the patio" / "coffee in the kitchen"
- "holiday gatherings" / "entertaining guests" / "host sunday dinner"
- "sun-drenched" / "sun-soaked" / "sun-filled"
- "perfect for" / "perfect spot" / "perfectly suited"
- "secret garden" / "hidden gem" / "tucked away"
- "mesmerizing" / "stunning" / "breathtaking" / "gorgeous" / "absolutely"
- "echoing footsteps" / "lingering memories" / any poetic narration
- "relaxing evenings" / "cozy nights" / "quiet mornings" / "quiet evenings"
- "retreat" / "sanctuary" / "oasis" / "haven" used as nouns describing the home (using these in a tag name like "Wellness Sanctuary" from the AVAILABLE TAGS list is OK; in prose it is NOT)
- "This isn't X, it's Y" / "This isn't just a house" / "More than just a"
- Starting any sentence with "This isn't" or "This is more than"
- "nobody wants to leave" / "the kind of place where" / "you host"

INSTEAD, write practical observations like:
- "That kitchen island? It's where homework happens while you cook dinner"
- "The den off the master - your housemate's late-night work calls won't wake you"
- "Backyard's got room for a firepit. Your friends will thank you"
- "Third bedroom has that awkward corner - works great for a standing desk"
- "Mudroom right off the garage - you'll actually use the front door for guests"
- "Double sinks in the primary bath - no more fighting over counter space"

TAG SELECTION DISCIPLINE (critical — most outputs over-tag):
- Default to 4-5 tags, NOT 8. Eight tags is reserved for properties with unusually rich evidence.
- Each tag must be earned by a SPECIFIC observation. If you can't point to a room, fixture, score, or listed feature, do not use the tag.
- PREFER tags from the ARCHITECTURAL, OUTDOOR, INTERIOR, and AESTHETIC categories — these describe what's actually visible. LIFESTYLE tags are inferences and require stronger evidence.
- These "easy" lifestyle categories are over-used — only include them if the evidence below is met:
  - "Remote Work Ready": must see a dedicated office, study, or quiet flex room. A bedroom with a desk does NOT count.
  - "Growing Family": requires 3+ bedrooms AND a fenced yard or play area visible. Just "3 beds" is not enough.
  - "Pet Paradise": requires a fenced yard, dog run, mudroom, or pet wash. Generic "backyard" is not enough.
  - "First-Time Buyer": only when price is clearly entry-tier for the local market AND the home is small/simple. Not for $1M+ homes.
  - "Walkable Neighborhood": requires neighborhood walk score >= 70 in the provided neighborhood context. Do NOT infer from images.
- Same discipline applies to "lifestyleFits.category" — do not include these categories unless the same evidence is present.
- For lifestyleFits specifically, target 2-3 fits (not 6). Each must cite a different room / feature.

AVAILABLE TAGS (pick 4-8 that genuinely apply, default 4-5):
${formatTagsForPrompt()}`

export interface NeighborhoodVibesContext {
  neighborhoodName: string
  tagline: string
  themes: Array<{ name: string; whyItMatters: string }>
  localHighlights: Array<{
    name: string
    category: string
    whyItMatters: string
  }>
  residentFits: Array<{ profile: string; reason: string }>
  walkScore: number | null
  transitScore: number | null
}

export interface PropertyContext {
  address: string
  city: string
  state: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number | null
  propertyType: string | null
  yearBuilt: number | null
  lotSizeSqft: number | null
  amenities: string[] | null
  description: string | null
  neighborhoodVibes?: NeighborhoodVibesContext | null
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function buildUserPrompt(
  property: PropertyContext,
  imageCount: number
): string {
  const priceFormatted = formatPrice(property.price)
  const sqft = property.squareFeet
    ? `${property.squareFeet.toLocaleString()} sqft`
    : 'Unknown'
  const year = property.yearBuilt || 'Unknown'
  const lot = property.lotSizeSqft
    ? `${property.lotSizeSqft.toLocaleString()} sqft lot`
    : null

  // Build property details section
  let details = `PROPERTY DETAILS:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: ${priceFormatted}
- Bedrooms: ${property.bedrooms} | Bathrooms: ${property.bathrooms}
- Square Feet: ${sqft}
- Property Type: ${property.propertyType || 'Unknown'}
- Year Built: ${year}`

  if (lot) {
    details += `\n- Lot Size: ${lot}`
  }

  if (property.amenities?.length) {
    details += `\n- Listed Amenities: ${property.amenities.slice(0, 15).join(', ')}`
  }

  // Add neighborhood context if available. Source: neighborhood_vibes table,
  // which is generated from grounded listing stats + walk/transit scores. We
  // feed it here so location-flavored tags (Walkable Neighborhood, Transit
  // Friendly) have actual data behind them instead of LLM guesses.
  let neighborhoodSection = ''
  const nv = property.neighborhoodVibes
  if (nv) {
    const themes = nv.themes
      .slice(0, 3)
      .map((t) => `  - ${t.name}: ${t.whyItMatters}`)
      .join('\n')
    const highlights = nv.localHighlights
      .slice(0, 3)
      .map((h) => `  - ${h.name} (${h.category}): ${h.whyItMatters}`)
      .join('\n')
    const fits = nv.residentFits
      .slice(0, 3)
      .map((r) => `  - ${r.profile}: ${r.reason}`)
      .join('\n')
    const scores: string[] = []
    if (typeof nv.walkScore === 'number') {
      scores.push(`Walk Score ${nv.walkScore}/100`)
    }
    if (typeof nv.transitScore === 'number') {
      scores.push(`Transit Score ${nv.transitScore}/100`)
    }
    neighborhoodSection = `

NEIGHBORHOOD CONTEXT (${nv.neighborhoodName}):
${nv.tagline}${scores.length ? `\nScores: ${scores.join(', ')}` : ''}
Themes:
${themes}
Local Highlights:
${highlights}
Resident Fits:
${fits}

Use the neighborhood context to ground LOCATION tags. Do NOT invent walkability,
transit, or nightlife claims unsupported by the scores or themes above.`
  }

  // Add description if available
  let descriptionSection = ''
  if (property.description) {
    // Redact PII from description before sending to external LLM provider
    const sanitized = redactPropertyDescription(property.description)
    // Truncate very long descriptions
    const desc =
      sanitized.length > 800 ? sanitized.slice(0, 800) + '...' : sanitized
    descriptionSection = `

LISTING DESCRIPTION:
${desc}`
  }

  return `Analyze the ${imageCount} property image(s) and extract buyer-relevant evidence and fit signals.

${details}${neighborhoodSection}${descriptionSection}

Respond with a JSON object matching this EXACT structure:
{
  "tagline": "string (10-80 chars) - restrained, specific headline about a visible/listed feature. MUST contain a concrete noun (room, fixture, material, feature) — not a category or feeling. Forbidden: tagline cannot start with the city name; cannot contain any of these tag names verbatim ('Culinary Haven', 'Chef's Kitchen', 'Indoor-Outdoor Flow', 'Gallery-Ready Walls', 'Natural Light Filled', 'Remote Work Ready'). NO hype words like dream, perfect, magical, oasis, breathtaking, absolute, endless.",
  "vibeStatement": "string (20-200 chars) - 1-2 practical sentences grounded in visible/listed facts. MUST name at least one of: the city, the bedroom count (as '3-bed' / 'four bedrooms'), the square footage bracket, or a SPECIFIC listed amenity. Name the evidence before the lifestyle implication. NEVER start with 'This isn't' or 'More than'. Good examples: 'The Walnut Creek condo's office nook and rear bedrooms make remote-work days plausible.' or 'In 1,500 sqft, a kitchen island plus deck sliders supports casual dinners.'",
  "primaryVibes": [
    {
      "name": "string - UNIQUE evidence-backed descriptor for THIS home (not generic like 'Modern Minimalist'). Think: 'Rear-Deck Entertaining' or 'Separated Office Nook'",
      "intensity": "number 0.0-1.0 - internal ranking only, not shown to users. Just vary them meaningfully.",
      "source": "interior" | "exterior" | "both"
    }
  ],
  "lifestyleFits": [
    {
      "category": "string - MUST be from predefined list. PREFER the less-common options: Culinary Haven, Book Lover's Nook, Hobbyist Heaven, Creative Studio, Multi-Gen Living, Fitness Focused, Empty Nester, Indoor-Outdoor Flow, Entertainer's Dream. The four 'easy' tags (Remote Work Ready, Growing Family, Pet Paradise, First-Time Buyer) require strict evidence — see TAG SELECTION DISCIPLINE above.",
      "score": "number 0.0-1.0 - how well this property fits the lifestyle category",
      "reason": "string (max 200 chars) - cite a SPECIFIC room/feature/listed amenity. Each reason in this array must reference a DIFFERENT piece of evidence (no two reasons may share their first noun phrase)."
    }
  ],
  "notableFeatures": [
    {
      "feature": "string - specific feature (e.g., 'Double oven with gas cooktop')",
      "location": "string - where (e.g., 'kitchen', 'primary suite')",
      "appealFactor": "string (max 200 chars) - practical buyer relevance, not romance copy"
    }
  ],
	  "aesthetics": {
	    "lightingQuality": "natural_abundant" | "natural_moderate" | "artificial_warm" | "artificial_cool" | "mixed",
	    "colorPalette": ["2-4 dominant tones you actually see, e.g., 'warm gray', 'honey oak', 'navy accents'"],
	    "architecturalStyle": "string (max 80 chars) - describe what you ACTUALLY see (e.g., 'split-level with cedar shake siding', 'two-story Mediterranean with red tile roof', 'Edwardian rowhouse'). Do NOT guess at a decade or 'modern updates' unless you can point to specific updates in the photos.",
	    "overallCondition": "pristine" | "well_maintained" | "dated_but_clean" | "needs_work"
	  },
	  "emotionalHooks": ["2-4 evidence-backed buyer notes. NO: quotes, dream, perfect, magical, sun-drenched, morning coffee, endless possibilities. YES: 'Mudroom storage helps with kids and dogs.' or 'Double sinks reduce weekday bathroom bottlenecks.'"],
	  "suggestedTags": ["EXACTLY 4 or 5 tags. Do NOT exceed 5. Each tag MUST be from the AVAILABLE TAGS list above (exact spelling/case). At least 3 of your tags MUST come from ARCHITECTURAL / OUTDOOR / INTERIOR / AESTHETIC categories (visible features), not LIFESTYLE / LOCATION. Do not invent new tags."]
}

	Requirements:
	- primaryVibes: 2-4 items with UNIQUE evidence-backed names for this property. Vary intensities meaningfully.
	- lifestyleFits: 2-3 items (NOT 6). Every reason must cite a feature, room, layout, score, or neighborhood fact. Each lifestyleFit must use a DIFFERENT category — no duplicates within one property.
	- notableFeatures: 2-8 specific features that would catch a buyer's eye
	- Don't fixate on one repeated detail (e.g., gates/fences); balance interior + outdoor.
	- emotionalHooks: 2-4 concise buyer notes, not sentimental narration. Each hook must reference a DIFFERENT room or feature.
	- suggestedTags: 4-5 tags ONLY from AVAILABLE TAGS above. Exact spelling/case. Pick from multiple categories. At least 3 must be visible-feature tags (not lifestyle).`
}

/**
 * Build the complete message array for the LLM
 */
export function buildVibesMessages(
  property: PropertyContext,
  imageUrls: string[]
): { systemPrompt: string; userPrompt: string; imageUrls: string[] } {
  return {
    systemPrompt: VIBES_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(property, imageUrls.length),
    imageUrls,
  }
}
