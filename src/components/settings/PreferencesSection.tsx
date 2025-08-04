'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserService } from '@/lib/services/users'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

interface PreferencesSectionProps {
  user: User
  profile: UserProfile
}

export function PreferencesSection({ user, profile }: PreferencesSectionProps) {
  const userService = new UserService()
  // Define local preferences type for UI-specific preferences
  type LocalPreferences = UserPreferences & {
    priceRange?: [number, number]
    bedrooms?: number
    bathrooms?: number
    propertyTypes?: Record<string, boolean>
    mustHaves?: Record<string, boolean>
    searchRadius?: number
  }
  
  const preferences = (profile.preferences || {}) as LocalPreferences
  
  const [loading, setLoading] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>(
    preferences.priceRange || [200000, 800000]
  )
  const [bedrooms, setBedrooms] = useState(preferences.bedrooms || 2)
  const [bathrooms, setBathrooms] = useState(preferences.bathrooms || 2)
  const [propertyTypes, setPropertyTypes] = useState(preferences.propertyTypes || {
    house: true,
    condo: true,
    townhouse: true,
  })
  const [mustHaves, setMustHaves] = useState(preferences.mustHaves || {
    parking: false,
    pool: false,
    gym: false,
    petFriendly: false,
  })
  const [searchRadius, setSearchRadius] = useState(preferences.searchRadius || 10)

  const savePreferences = async () => {
    setLoading(true)
    try {
      await userService.updateUserProfile(user.id, {
        preferences: {
          ...preferences,
          priceRange,
          bedrooms,
          bathrooms,
          propertyTypes,
          mustHaves,
          searchRadius,
        },
      })
      toast.success('Preferences saved successfully')
    } catch (_error) {
      toast.error('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Search Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-purple-200">
              Price Range: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
            </Label>
            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              min={0}
              max={2000000}
              step={50000}
              className="[&_[role=slider]]:bg-purple-500"
            />
          </div>

          {/* Bedrooms and Bathrooms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-purple-200">Minimum Bedrooms</Label>
              <Select value={bedrooms.toString()} onValueChange={(v) => setBedrooms(Number(v))}>
                <SelectTrigger className="bg-white/10 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}+ {num === 1 ? 'Bedroom' : 'Bedrooms'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-purple-200">Minimum Bathrooms</Label>
              <Select value={bathrooms.toString()} onValueChange={(v) => setBathrooms(Number(v))}>
                <SelectTrigger className="bg-white/10 border-purple-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}+ {num === 1 ? 'Bathroom' : 'Bathrooms'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Radius */}
          <div className="space-y-2">
            <Label className="text-purple-200">Search Radius: {searchRadius} miles</Label>
            <Slider
              value={[searchRadius]}
              onValueChange={([v]) => setSearchRadius(v)}
              min={1}
              max={50}
              step={1}
              className="[&_[role=slider]]:bg-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-xl text-white">Property Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            house: 'Single Family Home',
            condo: 'Condo/Apartment',
            townhouse: 'Townhouse',
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="text-purple-200 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={key}
                checked={propertyTypes[key]}
                onCheckedChange={(checked) =>
                  setPropertyTypes({ ...propertyTypes, [key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-xl text-white">Must-Have Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            parking: 'Parking',
            pool: 'Pool',
            gym: 'Gym/Fitness Center',
            petFriendly: 'Pet Friendly',
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`must-${key}`} className="text-purple-200 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={`must-${key}`}
                checked={mustHaves[key]}
                onCheckedChange={(checked) =>
                  setMustHaves({ ...mustHaves, [key]: checked })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={savePreferences}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </>
        )}
      </Button>
    </div>
  )
}