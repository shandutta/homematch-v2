'use client'

import { Property, Neighborhood } from '@/lib/schemas/property'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'
import { Badge } from '@/components/ui/badge'
import {
  MotionDiv,
  MotionP,
  MotionSpan,
} from '@/components/ui/motion-components'
import {
  Coffee,
  TreePine,
  Wifi,
  Heart,
  Users,
  Sparkles,
  UtensilsCrossed,
  GraduationCap,
  Home,
  MapPin,
  Utensils,
  Baby,
  Car,
  Sunset,
  Mountain,
  Waves,
  Music,
  BookOpen,
  ShoppingBag,
  Dumbbell,
  Palmtree,
} from 'lucide-react'

interface StorytellingDescriptionProps {
  property: Property
  neighborhood?: Neighborhood
  vibes?: PropertyVibes | null
  isMutualLike?: boolean
  className?: string
  showNeighborhoodPerks?: boolean
  showFutureVision?: boolean
  showLifestyleTags?: boolean
  variant?: 'full' | 'compact' | 'minimal'
}

// Lifestyle tags with their associated icons and colors
// Using saturated colors with white text for better readability on dark backgrounds
const LIFESTYLE_TAGS = {
  'Work from Home Ready': { icon: Wifi, color: 'bg-blue-500 text-white' },
  "Entertainer's Dream": {
    icon: UtensilsCrossed,
    color: 'bg-purple-500 text-white',
  },
  'Pet Paradise': { icon: TreePine, color: 'bg-green-500 text-white' },
  'Urban Oasis': { icon: Sparkles, color: 'bg-amber-500 text-white' },
  'Family Haven': { icon: Users, color: 'bg-pink-500 text-white' },
  'Cozy Retreat': { icon: Coffee, color: 'bg-orange-500 text-white' },
  "Scholar's Den": {
    icon: GraduationCap,
    color: 'bg-indigo-500 text-white',
  },
  'Love Nest': { icon: Heart, color: 'bg-rose-500 text-white' },
  'Future Family Home': {
    icon: Baby,
    color: 'bg-emerald-500 text-white',
  },
  'Entertainment Haven': {
    icon: Music,
    color: 'bg-violet-500 text-white',
  },
  'Urban Love Nest': { icon: Home, color: 'bg-rose-500 text-white' },
  'Weekend Retreat': { icon: Mountain, color: 'bg-slate-500 text-white' },
  'Culinary Paradise': { icon: Utensils, color: 'bg-amber-500 text-white' },
  'Commuter Friendly': { icon: Car, color: 'bg-cyan-500 text-white' },
  'Date Night Central': {
    icon: Sunset,
    color: 'bg-orange-500 text-white',
  },
  'Wellness Sanctuary': { icon: Dumbbell, color: 'bg-teal-500 text-white' },
  'Beach Lifestyle': { icon: Waves, color: 'bg-sky-500 text-white' },
  "Book Lovers' Haven": {
    icon: BookOpen,
    color: 'bg-indigo-500 text-white',
  },
  'Shopping Paradise': {
    icon: ShoppingBag,
    color: 'bg-fuchsia-500 text-white',
  },
  'Tropical Vibes': { icon: Palmtree, color: 'bg-lime-500 text-white' },
} as const

// Enhanced lifestyle story templates
const LIFESTYLE_STORIES = {
  morningRoutines: [
    'Perfect for morning coffee on the private balcony overlooking the {feature}',
    'Start your days together with sunrise views from the master bedroom',
    'Imagine lazy Sunday brunches in the sun-drenched breakfast nook',
    'Wake up to natural light flooding your serene bedroom sanctuary',
  ],
  eveningMoments: [
    'Cozy fireplace perfect for romantic winter evenings together',
    'Unwind on your private patio with evening cocktails and conversation',
    'End busy days with peaceful moments in your garden retreat',
    'Create intimate dinner experiences in your gourmet kitchen',
  ],
  culinaryAdventures: [
    "Chef's kitchen designed for your weekend cooking adventures together",
    'Spacious kitchen island perfect for meal prep and wine tastings',
    'Entertain friends with ease in this culinary paradise',
    'Modern kitchen where culinary dreams become delicious reality',
  ],
  workLife: [
    'Dedicated home office spaces for both of you to thrive professionally',
    'Quiet study nooks perfect for focused work and creative projects',
    'Flexible spaces that adapt to your evolving work-from-home needs',
    'Professional home environment with residential comfort',
  ],
  entertaining: [
    'Open floor plan flows seamlessly for hosting dinner parties',
    'Perfect gathering space for game nights and celebrations',
    'Indoor-outdoor living ideal for summer barbecues',
    'Sophisticated entertaining areas for memorable occasions',
  ],
  relaxation: [
    'Private outdoor space for quiet moments and meditation',
    'Spa-like master suite for ultimate relaxation and romance',
    'Reading nooks bathed in natural light for peaceful afternoons',
    'Serene spaces designed for rest and rejuvenation',
  ],
}

// Neighborhood lifestyle descriptions
const NEIGHBORHOOD_PERKS = {
  walkable: [
    'Walking distance to charming farmers markets and local cafes',
    'Stroll to romantic date night restaurants and wine bars',
    'Explore tree-lined streets perfect for evening walks together',
    'Discover neighborhood gems just steps from your front door',
  ],
  transit: [
    'Easy commute for both partners via nearby transit connections',
    'Convenient access to downtown cultural attractions',
    'Seamless city exploration without the parking hassles',
    'Urban connectivity with suburban tranquility',
  ],
  recreation: [
    'Minutes from parks perfect for weekend picnics and outdoor activities',
    'Close to hiking trails and recreational facilities',
    'Community spaces ideal for staying active together',
    'Access to sports facilities and fitness opportunities',
  ],
  cultural: [
    'Surrounded by galleries, theaters, and cultural venues',
    'Rich arts scene perfect for date nights and exploration',
    'Historic charm meets modern convenience',
    'Vibrant community with year-round festivals and events',
  ],
  quiet: [
    'Peaceful residential street perfect for evening strolls',
    'Quiet neighborhood ideal for starting a family',
    'Tree-lined streets providing natural tranquility',
    'Serene environment away from city noise',
  ],
}

// Future vision tags based on property features
const FUTURE_VISION_TAGS = {
  familyReady: {
    tag: 'Future Family Home',
    descriptions: [
      'Space to grow your family and create lasting memories',
      'Perfect foundation for the next chapter of your love story',
      'Room for little feet to run and laughter to fill the halls',
    ],
  },
  entertaining: {
    tag: 'Entertainment Haven',
    descriptions: [
      'Host unforgettable gatherings with friends and family',
      'Create the social hub your circle will love to visit',
      'Perfect backdrop for celebrations big and small',
    ],
  },
  romantic: {
    tag: 'Urban Love Nest',
    descriptions: [
      'Intimate space designed for two hearts beating as one',
      'Cozy sanctuary perfect for deepening your connection',
      'Your private retreat from the busy world outside',
    ],
  },
  retreat: {
    tag: 'Weekend Retreat',
    descriptions: [
      'Escape the everyday in your own peaceful haven',
      'Recharge and reconnect in serene surroundings',
      'Your personal oasis for rest and relaxation',
    ],
  },
}

// Property type specific templates
const DESCRIPTION_TEMPLATES: Record<
  'house' | 'condo' | 'townhome' | 'apartment' | 'other',
  Record<'starter' | 'family' | 'luxury', string[]>
> = {
  house: {
    starter: [
      'Perfect starter home where your love story begins',
      'Charming space to build your first memories together',
      'Your launching pad into homeownership and happiness',
      'Cozy foundation for the adventures ahead',
    ],
    family: [
      'Spacious haven designed for growing families',
      'Room to grow, laugh, and create lifelong memories',
      'Perfect for Sunday morning pancakes and bedtime stories',
      'Where family traditions are born and cherished',
    ],
    luxury: [
      'Elegant retreat showcasing sophisticated style',
      'Executive home perfect for intimate gatherings',
      'Luxury living where every detail speaks to your success',
      'Refined sanctuary for the discerning couple',
    ],
  },
  condo: {
    starter: [
      'Modern urban living simplified for busy couples',
      'Lock-and-leave lifestyle with metropolitan convenience',
      'Stylish space perfect for cozy date nights at home',
      'Contemporary comfort in the heart of the action',
    ],
    family: [
      'Vertical living with endless horizontal possibilities',
      'Maintenance-free lifestyle with family-friendly amenities',
      'High-rise views perfect for morning coffee rituals',
      'Urban family life made effortless and enjoyable',
    ],
    luxury: [
      'Sky-high luxury with breathtaking panoramic views',
      'Penthouse living for couples with elevated tastes',
      'Resort-style amenities right at your doorstep',
      'Sophisticated urban living at its absolute finest',
    ],
  },
  townhome: {
    starter: [
      'Best of both worlds - private space with community connection',
      'Townhome charm perfect for young professionals in love',
      'Multi-level living with single-level intimacy',
      'Your own front door and backyard dreams realized',
    ],
    family: [
      'Multi-level design perfect for busy growing families',
      'Private outdoor space for barbecues and playtime',
      'Community atmosphere with individual privacy',
      'Room to spread out while staying beautifully connected',
    ],
    luxury: [
      'Upscale townhome living with premium designer finishes',
      'Executive lifestyle with refreshingly low maintenance',
      'Sophisticated design seamlessly meets practical living',
      'Prestigious address with thoughtful family features',
    ],
  },
  apartment: {
    starter: [
      'Urban apartment living at its most vibrant finest',
      'Convenient location perfect for adventurous city lovers',
      'Modern amenities without any maintenance worries',
      'Your launching pad for exciting urban adventures',
    ],
    family: [
      'Spacious apartment with thoughtful family-focused features',
      'Building amenities perfect for growing families',
      'Urban convenience with suburban comfort levels',
      'City living intelligently designed for family life',
    ],
    luxury: [
      'Premium apartment living with white-glove concierge service',
      'Five-star amenities and personalized attention',
      'Luxury apartment living completely redefined',
      'Urban sophistication reaching its absolute peak',
    ],
  },
  other: {
    starter: [
      'Unique property perfect for creative couples',
      'Something special for those who dare to be different',
      'Unconventional charm for unconventional love',
      'One-of-a-kind opportunity for adventurous hearts',
    ],
    family: [
      'Distinctive property offering unique family living',
      'Special features perfect for creative family life',
      'Unique design elements for families who stand out',
      'Character-filled space for memorable family moments',
    ],
    luxury: [
      'Extraordinary property for those with discerning taste',
      'Luxury living with distinctive architectural character',
      'Unique luxury offering unlike anything else available',
      'Exceptional property for couples with exceptional standards',
    ],
  },
}

// Mutual like specific messages
const MUTUAL_LIKE_MESSAGES = [
  'Both hearts say yes to this special place',
  'Your perfect match found the perfect match',
  'Two hearts, one home, endless possibilities',
  'When you both know, you both know',
  'This is where your shared dreams take shape',
  'Love at first sight, for both of you',
]

type NormalizedPropertyType =
  | 'house'
  | 'condo'
  | 'townhome'
  | 'apartment'
  | 'other'

const normalizePropertyType = (
  type?: Property['property_type'] | null
): NormalizedPropertyType => {
  const rawType = (type || '') as string

  if (!rawType) return 'house'
  if (rawType === 'single_family' || rawType === 'manufactured') return 'house'
  if (rawType === 'multi_family' || rawType === 'apartment') return 'apartment'
  if (rawType === 'townhouse' || rawType === 'townhome') return 'townhome'
  if (rawType === 'condo') return 'condo'
  if (rawType === 'house') return 'house'
  return 'other'
}

// Deterministic random function using property ID as seed
function seededRandom(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  const normalized = Math.abs(hash) / 2147483647
  return normalized
}

// Get deterministic random index based on property ID and context
function getSeededIndex(
  propertyId: string,
  context: string,
  arrayLength: number
): number {
  const combinedSeed = `${propertyId}-${context}`
  const random = seededRandom(combinedSeed)
  return Math.floor(random * arrayLength)
}

function generateLifestyleTags(
  property: Property,
  neighborhood?: Neighborhood
): string[] {
  const propertyType = normalizePropertyType(property.property_type)
  const tags: string[] = []

  // Work from home logic - enhanced
  if (property.bedrooms && property.bedrooms >= 3) {
    tags.push('Work from Home Ready')
  }

  // Entertaining logic - enhanced
  if (
    property.square_feet &&
    property.square_feet > 1500 &&
    property.bathrooms >= 2
  ) {
    tags.push("Entertainer's Dream")
  }

  // Large entertaining spaces
  if (property.square_feet && property.square_feet > 2000) {
    tags.push('Entertainment Haven')
  }

  // Pet-friendly logic
  if (
    propertyType === 'house' &&
    property.lot_size_sqft !== null &&
    property.lot_size_sqft > 2000
  ) {
    tags.push('Pet Paradise')
  }

  // Urban oasis logic - enhanced
  if (
    propertyType === 'condo' &&
    property.amenities?.some(
      (a) =>
        a.toLowerCase().includes('pool') ||
        a.toLowerCase().includes('gym') ||
        a.toLowerCase().includes('spa')
    )
  ) {
    tags.push('Urban Oasis')
    tags.push('Wellness Sanctuary')
  }

  // Family logic - enhanced for future planning
  if (property.bedrooms && property.bedrooms >= 3 && property.bathrooms >= 2) {
    tags.push('Family Haven')
    tags.push('Future Family Home')
  }

  // Cozy retreat logic
  if (
    property.bedrooms &&
    property.bedrooms <= 2 &&
    property.square_feet &&
    property.square_feet <= 1200
  ) {
    tags.push('Cozy Retreat')
    tags.push('Urban Love Nest')
  }

  // Luxury kitchen/culinary focus
  if (
    property.amenities?.some(
      (a) =>
        a.toLowerCase().includes('kitchen') ||
        a.toLowerCase().includes('granite') ||
        a.toLowerCase().includes('stainless')
    )
  ) {
    tags.push('Culinary Paradise')
  }

  // Transit and walkability
  if (neighborhood?.walk_score && neighborhood.walk_score > 80) {
    tags.push("Scholar's Den")
    tags.push('Date Night Central')
  }

  if (neighborhood?.transit_score && neighborhood.transit_score > 70) {
    tags.push('Commuter Friendly')
  }

  // Beach/water proximity (mock logic - would need actual data)
  if (
    property.amenities?.some(
      (a) =>
        a.toLowerCase().includes('beach') || a.toLowerCase().includes('water')
    )
  ) {
    tags.push('Beach Lifestyle')
    tags.push('Weekend Retreat')
  }

  // Shopping and lifestyle
  if (neighborhood?.walk_score && neighborhood.walk_score > 70) {
    tags.push('Shopping Paradise')
  }

  // Always include romantic options for couples
  tags.push('Love Nest')

  // Return max 3 tags, with preference for unique/interesting ones
  const uniqueTags = [...new Set(tags)]
  // Use property ID for deterministic shuffling
  const shuffled = uniqueTags.sort((a, b) => {
    const seedA = seededRandom(`${property.id}-${a}`)
    const seedB = seededRandom(`${property.id}-${b}`)
    return seedA - seedB
  })
  return shuffled.slice(0, 3)
}

function getLifestyleStory(
  property: Property,
  _neighborhood?: Neighborhood
): string {
  const stories: string[] = []

  // Morning routines based on features
  if (
    property.amenities?.some(
      (a) =>
        a.toLowerCase().includes('balcony') || a.toLowerCase().includes('patio')
    )
  ) {
    stories.push(
      LIFESTYLE_STORIES.morningRoutines[0].replace('{feature}', 'garden')
    )
  } else {
    stories.push(...LIFESTYLE_STORIES.morningRoutines.slice(1))
  }

  // Evening moments
  if (property.amenities?.some((a) => a.toLowerCase().includes('fireplace'))) {
    stories.push(LIFESTYLE_STORIES.eveningMoments[0])
  } else {
    stories.push(...LIFESTYLE_STORIES.eveningMoments.slice(1))
  }

  // Culinary adventures
  if (property.square_feet && property.square_feet > 1200) {
    stories.push(...LIFESTYLE_STORIES.culinaryAdventures.slice(0, 2))
  } else {
    stories.push(...LIFESTYLE_STORIES.culinaryAdventures.slice(2))
  }

  // Work life
  if (property.bedrooms && property.bedrooms >= 3) {
    stories.push(LIFESTYLE_STORIES.workLife[0])
  } else {
    stories.push(...LIFESTYLE_STORIES.workLife.slice(1))
  }

  // Entertaining
  if (property.square_feet && property.square_feet > 1500) {
    stories.push(...LIFESTYLE_STORIES.entertaining.slice(0, 2))
  }

  // Relaxation
  stories.push(...LIFESTYLE_STORIES.relaxation)

  // Pick a deterministic story based on property ID
  const index = getSeededIndex(property.id, 'lifestyle-story', stories.length)
  return stories[index]
}

function getNeighborhoodPerks(
  property: Property,
  _neighborhood?: Neighborhood
): string {
  const perks: string[] = []

  if (_neighborhood?.walk_score && _neighborhood.walk_score > 80) {
    perks.push(...NEIGHBORHOOD_PERKS.walkable)
  }

  if (_neighborhood?.transit_score && _neighborhood.transit_score > 70) {
    perks.push(...NEIGHBORHOOD_PERKS.transit)
  }

  // Default to cultural and quiet options
  perks.push(...NEIGHBORHOOD_PERKS.cultural)
  perks.push(...NEIGHBORHOOD_PERKS.quiet)

  if (perks.length === 0) {
    perks.push('Charming neighborhood perfect for couples exploring together')
  }

  const index = getSeededIndex(property.id, 'neighborhood-perk', perks.length)
  return perks[index]
}

function getFutureVisionTag(
  property: Property
): { tag: string; description: string } | null {
  // Family potential
  if (property.bedrooms && property.bedrooms >= 3 && property.bathrooms >= 2) {
    const vision = FUTURE_VISION_TAGS.familyReady
    const index = getSeededIndex(
      property.id,
      'future-vision-family',
      vision.descriptions.length
    )
    return {
      tag: vision.tag,
      description: vision.descriptions[index],
    }
  }

  // Entertainment focus
  if (property.square_feet && property.square_feet > 1500) {
    const vision = FUTURE_VISION_TAGS.entertaining
    const index = getSeededIndex(
      property.id,
      'future-vision-entertainment',
      vision.descriptions.length
    )
    return {
      tag: vision.tag,
      description: vision.descriptions[index],
    }
  }

  // Cozy romantic space
  if (property.bedrooms && property.bedrooms <= 2) {
    const vision = FUTURE_VISION_TAGS.romantic
    const index = getSeededIndex(
      property.id,
      'future-vision-romantic',
      vision.descriptions.length
    )
    return {
      tag: vision.tag,
      description: vision.descriptions[index],
    }
  }

  // Default retreat
  const vision = FUTURE_VISION_TAGS.retreat
  const index = getSeededIndex(
    property.id,
    'future-vision-retreat',
    vision.descriptions.length
  )
  return {
    tag: vision.tag,
    description: vision.descriptions[index],
  }
}

function getDescription(
  property: Property,
  neighborhood?: Neighborhood,
  isMutualLike?: boolean
): string {
  // Return mutual like message first if applicable
  if (isMutualLike) {
    const mutualIndex = getSeededIndex(
      property.id,
      'mutual-like',
      MUTUAL_LIKE_MESSAGES.length
    )
    return MUTUAL_LIKE_MESSAGES[mutualIndex]
  }

  const normalizedType = normalizePropertyType(property.property_type)

  // Determine price category
  let priceCategory: 'starter' | 'family' | 'luxury'
  if (property.price < 300000) {
    priceCategory = 'starter'
  } else if (property.price < 600000) {
    priceCategory = 'family'
  } else {
    priceCategory = 'luxury'
  }

  // Get templates for this property type and price category
  const templates =
    DESCRIPTION_TEMPLATES[normalizedType]?.[priceCategory] ||
    DESCRIPTION_TEMPLATES.house.starter

  // Choose a template description based on property ID
  const index = getSeededIndex(
    property.id,
    `description-${normalizedType}-${priceCategory}`,
    templates.length
  )
  return templates[index]
}

export function StorytellingDescription({
  property,
  neighborhood,
  vibes,
  isMutualLike = false,
  className = '',
  showNeighborhoodPerks = true,
  showFutureVision = true,
  showLifestyleTags = true,
  variant = 'full',
}: StorytellingDescriptionProps) {
  // Use LLM-generated vibes when available, fallback to templates
  const hasVibes = !!vibes

  // Description: use vibes tagline or template
  const description = hasVibes
    ? vibes.tagline
    : getDescription(property, neighborhood, isMutualLike)

  // Lifestyle tags: use vibes suggested_tags or generate from property
  const lifestyleTags = hasVibes
    ? vibes.suggested_tags.filter(
        (tag): tag is keyof typeof LIFESTYLE_TAGS => tag in LIFESTYLE_TAGS
      )
    : generateLifestyleTags(property, neighborhood)

  // Lifestyle story: use vibes vibe_statement or template
  const lifestyleStory = hasVibes
    ? vibes.vibe_statement
    : getLifestyleStory(property, neighborhood)

  // Neighborhood perks: keep template-based for now (vibes focus on property, not neighborhood)
  const neighborhoodPerk = showNeighborhoodPerks
    ? getNeighborhoodPerks(property, neighborhood)
    : null

  // Future vision: use vibes lifestyle_fits if available, else template
  const futureVision = showFutureVision
    ? hasVibes && vibes.lifestyle_fits?.length > 0
      ? {
          tag: vibes.lifestyle_fits[0].category,
          description: vibes.lifestyle_fits[0].reason,
        }
      : getFutureVisionTag(property)
    : null

  // Emotional hooks from vibes (used in full variant)
  const emotionalHooks = hasVibes ? vibes.emotional_hooks : null

  // Primary vibes (used for enhanced display in full variant)
  const primaryVibes = hasVibes ? vibes.primary_vibes : null

  if (variant === 'minimal') {
    return (
      <MotionDiv
        className={`space-y-2 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-token-sm leading-relaxed text-slate-600">
          {isMutualLike ? description : lifestyleStory}
        </p>
      </MotionDiv>
    )
  }

  if (variant === 'compact') {
    return (
      <MotionDiv
        className={`space-y-2 ${className}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Main Description */}
        <p
          className={`text-token-sm leading-relaxed font-medium ${
            isMutualLike
              ? 'rounded-md border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 px-2 py-1 text-pink-700'
              : 'text-slate-600'
          }`}
        >
          {isMutualLike && (
            <Heart className="mr-1 inline h-3 w-3 fill-pink-500 text-pink-500" />
          )}
          {description}
        </p>

        {/* Future vision tag - show as subtle pill when enabled */}
        {futureVision && (
          <div className="rounded-token-2xl shadow-token-sm border border-blue-100/70 bg-gradient-to-r from-blue-50/90 via-slate-50 to-purple-50/70 px-3.5 py-2.5 text-slate-700 ring-1 ring-blue-100/60">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-700 uppercase">
                  {futureVision.tag}
                </p>
                <p className="text-[11px] leading-snug text-slate-600">
                  {futureVision.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top 2 Lifestyle Tags */}
        {showLifestyleTags && lifestyleTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lifestyleTags.slice(0, 2).map((tag, _index) => {
              const tagConfig =
                LIFESTYLE_TAGS[tag as keyof typeof LIFESTYLE_TAGS]
              const IconComponent = tagConfig.icon

              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={`${tagConfig.color} text-token-xs flex items-center gap-1 px-2 py-0.5`}
                >
                  <IconComponent className="h-2.5 w-2.5" />
                  {tag}
                </Badge>
              )
            })}
          </div>
        )}
      </MotionDiv>
    )
  }

  return (
    <MotionDiv
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      {/* Primary Description */}
      <MotionP
        className={`text-token-sm leading-relaxed font-medium ${
          isMutualLike
            ? 'rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 px-3 py-2 text-pink-700'
            : 'text-slate-600'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {isMutualLike && (
          <MotionSpan
            className="mr-2 inline-flex items-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.3,
            }}
          >
            <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
          </MotionSpan>
        )}
        {description}
      </MotionP>

      {/* Lifestyle Story - Only show if not a mutual like (avoid redundancy) */}
      {!isMutualLike && (
        <MotionP
          className="text-token-sm leading-relaxed text-slate-500 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {lifestyleStory}
        </MotionP>
      )}

      {/* Primary Vibes - LLM-generated vibes display */}
      {primaryVibes && primaryVibes.length > 0 && (
        <MotionDiv
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {primaryVibes.slice(0, 4).map((vibe, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1"
            >
              <span className="text-token-xs font-medium text-slate-700">
                {vibe.name}
              </span>
              <span className="text-token-xs text-slate-400">
                {vibe.source === 'both'
                  ? '↔'
                  : vibe.source === 'interior'
                    ? '🏠'
                    : '🌳'}
              </span>
            </div>
          ))}
        </MotionDiv>
      )}

      {/* Emotional Hooks - LLM-generated lifestyle moments */}
      {emotionalHooks && emotionalHooks.length > 0 && (
        <MotionDiv
          className="space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.38 }}
        >
          {emotionalHooks.slice(0, 2).map((hook, i) => (
            <p
              key={i}
              className="text-token-xs leading-relaxed text-slate-400 italic"
            >
              &quot;{hook}&quot;
            </p>
          ))}
        </MotionDiv>
      )}

      {/* Neighborhood Perks */}
      {neighborhoodPerk && (
        <MotionP
          className="text-token-sm flex items-start gap-2 leading-relaxed text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
          {neighborhoodPerk}
        </MotionP>
      )}

      {/* Future Vision Tag */}
      {futureVision && (
        <MotionDiv
          className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span className="text-token-xs font-semibold text-blue-800">
              {futureVision.tag}
            </span>
          </div>
          <p className="text-token-xs leading-relaxed text-blue-700">
            {futureVision.description}
          </p>
        </MotionDiv>
      )}

      {/* Lifestyle Tags */}
      {showLifestyleTags && lifestyleTags.length > 0 && (
        <MotionDiv
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          {lifestyleTags.map((tag, _index) => {
            const tagConfig = LIFESTYLE_TAGS[tag as keyof typeof LIFESTYLE_TAGS]
            const IconComponent = tagConfig.icon

            return (
              <MotionDiv
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: 0.7 + _index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge
                  variant="secondary"
                  className={`${tagConfig.color} text-token-xs flex cursor-default items-center gap-1 px-2 py-1 font-medium transition-all hover:shadow-sm`}
                >
                  <IconComponent className="h-3 w-3" />
                  {tag}
                </Badge>
              </MotionDiv>
            )
          })}
        </MotionDiv>
      )}
    </MotionDiv>
  )
}
