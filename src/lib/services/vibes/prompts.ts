/**
 * LLM Prompts for Property Vibes Extraction
 *
 * System and user prompts for extracting property vibes from images
 * using vision-capable LLMs via OpenRouter.
 */

import { LIFESTYLE_TAGS } from '@/lib/schemas/property-vibes'

export const VIBES_SYSTEM_PROMPT = `You are a real estate copywriter and interior design expert. Your job is to analyze property photos and extract the "vibes" - the emotional essence, aesthetic qualities, and lifestyle potential that would resonate with home buyers.

You must respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanations, no additional text.

Key principles:
1. BE SPECIFIC: Instead of "nice kitchen", say "chef's kitchen with quartz counters and stainless appliances"
2. BE EVOCATIVE: Use sensory language that helps buyers visualize living there
3. BE HONEST: If something looks dated or modest, frame it positively but accurately
4. FIND THE STORY: Every home has a narrative - find what makes THIS home special
5. NEUTRAL TONE: Content should resonate with any home buyer (individuals, families, roommates)

Vibe vocabulary to consider:
- Cozy, Warm, Inviting, Intimate
- Modern, Sleek, Minimalist, Contemporary
- Luxurious, Elegant, Sophisticated, Upscale
- Rustic, Charming, Character-filled, Historic
- Bright, Airy, Light-filled, Open
- Serene, Peaceful, Tranquil, Retreat-like
- Artistic, Creative, Eclectic, Unique
- Family-friendly, Spacious, Practical, Functional
- Urban, Metropolitan, City-connected
- Nature-connected, Garden-focused, Outdoor-living

Available lifestyle tags you can suggest (pick 2-4 most relevant):
${LIFESTYLE_TAGS.map((tag) => `- ${tag}`).join('\n')}`

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
}

export function formatPrice(price: number): string {
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

  return `Analyze the ${imageCount} property image(s) and extract the vibes.

PROPERTY DETAILS:
- Address: ${property.address}, ${property.city}, ${property.state}
- Price: ${priceFormatted}
- Bedrooms: ${property.bedrooms} | Bathrooms: ${property.bathrooms}
- Square Feet: ${sqft}
- Property Type: ${property.propertyType || 'Unknown'}
- Year Built: ${year}
${lot ? `- Lot Size: ${lot}` : ''}
${property.amenities?.length ? `- Listed Amenities: ${property.amenities.slice(0, 10).join(', ')}` : ''}

Respond with a JSON object matching this EXACT structure:
{
  "tagline": "string (10-80 chars) - punchy headline capturing the essence, e.g., 'Sun-Drenched Victorian with Modern Soul'",
  "vibeStatement": "string (20-200 chars) - 1-2 sentence summary of the home's lifestyle vibe",
  "primaryVibes": [
    {
      "name": "string - vibe name like 'Modern Minimalist' or 'Cozy Craftsman'",
      "intensity": "number 0-1 (how strongly this vibe presents)",
      "source": "interior" | "exterior" | "both"
    }
  ],
  "lifestyleFits": [
    {
      "category": "string - e.g., 'Remote Worker', 'Home Chef', 'Pet Owner', 'Fitness Enthusiast'",
      "score": "number 0-1 (how well this home fits this lifestyle)",
      "reason": "string (max 200 chars) - why this home fits this lifestyle"
    }
  ],
  "notableFeatures": [
    {
      "feature": "string - specific feature name, e.g., 'Chef's kitchen with gas range'",
      "location": "string - where in the home, e.g., 'kitchen', 'primary bedroom'",
      "appealFactor": "string (max 200 chars) - what makes it appealing"
    }
  ],
  "aesthetics": {
    "lightingQuality": "natural_abundant" | "natural_moderate" | "artificial_warm" | "artificial_cool" | "mixed",
    "colorPalette": ["array of 2-4 dominant color tones, e.g., 'warm neutrals', 'white', 'wood tones'"],
    "architecturalStyle": "string - style classification, e.g., 'mid-century modern', 'traditional', 'contemporary'",
    "overallCondition": "pristine" | "well_maintained" | "dated_but_clean" | "needs_work"
  },
  "emotionalHooks": ["array of 2-4 specific lifestyle moments this home enables, e.g., 'Morning coffee on the sun-drenched patio', 'Holiday dinners in the open-concept dining area'"],
  "suggestedTags": ["array of 2-4 tags from the predefined list that best match this property"]
}

Requirements:
- primaryVibes: 2-4 items, ordered by intensity (highest first)
- lifestyleFits: 2-6 items based on what you see in the images
- notableFeatures: 2-8 specific features that would catch a buyer's eye
- emotionalHooks: 2-4 specific moments (not generic)
- suggestedTags: 2-4 tags from the predefined list ONLY`
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
