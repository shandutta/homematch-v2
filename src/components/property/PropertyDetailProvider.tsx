'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { Property, Neighborhood } from '@/lib/schemas/property'
import { PropertyDetailModal } from './PropertyDetailModal'

interface PropertyDetailContextValue {
  openPropertyDetail: (property: Property, neighborhood?: Neighborhood) => void
  closePropertyDetail: () => void
}

const PropertyDetailContext = createContext<PropertyDetailContextValue | null>(
  null
)

export function usePropertyDetail() {
  const context = useContext(PropertyDetailContext)
  if (!context) {
    throw new Error(
      'usePropertyDetail must be used within a PropertyDetailProvider'
    )
  }
  return context
}

interface PropertyDetailProviderProps {
  children: ReactNode
}

export function PropertyDetailProvider({
  children,
}: PropertyDetailProviderProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  )
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<
    Neighborhood | undefined
  >()
  const [isOpen, setIsOpen] = useState(false)

  const openPropertyDetail = useCallback(
    (property: Property, neighborhood?: Neighborhood) => {
      setSelectedProperty(property)
      setSelectedNeighborhood(neighborhood)
      setIsOpen(true)
    },
    []
  )

  const closePropertyDetail = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Delay clearing property to allow close animation
      setTimeout(() => {
        setSelectedProperty(null)
        setSelectedNeighborhood(undefined)
      }, 200)
    }
  }, [])

  return (
    <PropertyDetailContext.Provider
      value={{ openPropertyDetail, closePropertyDetail }}
    >
      {children}
      <PropertyDetailModal
        property={selectedProperty}
        neighborhood={selectedNeighborhood}
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </PropertyDetailContext.Provider>
  )
}
