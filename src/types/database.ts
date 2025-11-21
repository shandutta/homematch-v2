export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (cd3cf9e)'
  }
  public: {
    Tables: {
      households: {
        Row: {
          collaboration_mode: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          collaboration_mode?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          collaboration_mode?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_email: string
          invited_name: string | null
          message: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          invited_email: string
          invited_name?: string | null
          message?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_name?: string | null
          message?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_invitations_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invitations_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      neighborhoods: {
        Row: {
          bounds: unknown | null
          city: string
          created_at: string | null
          id: string
          median_price: number | null
          metro_area: string | null
          name: string
          state: string
          transit_score: number | null
          walk_score: number | null
        }
        Insert: {
          bounds?: unknown | null
          city: string
          created_at?: string | null
          id?: string
          median_price?: number | null
          metro_area?: string | null
          name: string
          state: string
          transit_score?: number | null
          walk_score?: number | null
        }
        Update: {
          bounds?: unknown | null
          city?: string
          created_at?: string | null
          id?: string
          median_price?: number | null
          metro_area?: string | null
          name?: string
          state?: string
          transit_score?: number | null
          walk_score?: number | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: string[] | null
          bathrooms: number
          bedrooms: number
          city: string
          coordinates: unknown | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          listing_status: string | null
          lot_size_sqft: number | null
          neighborhood_id: string | null
          parking_spots: number | null
          price: number
          property_hash: string | null
          property_type: string | null
          square_feet: number | null
          state: string
          updated_at: string | null
          year_built: number | null
          zip_code: string
          zpid: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          bathrooms: number
          bedrooms: number
          city: string
          coordinates?: unknown | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          listing_status?: string | null
          lot_size_sqft?: number | null
          neighborhood_id?: string | null
          parking_spots?: number | null
          price: number
          property_hash?: string | null
          property_type?: string | null
          square_feet?: number | null
          state: string
          updated_at?: string | null
          year_built?: number | null
          zip_code: string
          zpid?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          coordinates?: unknown | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          listing_status?: string | null
          lot_size_sqft?: number | null
          neighborhood_id?: string | null
          parking_spots?: number | null
          price?: number
          property_hash?: string | null
          property_type?: string | null
          square_feet?: number | null
          state?: string
          updated_at?: string | null
          year_built?: number | null
          zip_code?: string
          zpid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'properties_neighborhood_id_fkey'
            columns: ['neighborhood_id']
            isOneToOne: false
            referencedRelation: 'neighborhoods'
            referencedColumns: ['id']
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string | null
          filters: Json
          household_id: string | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          household_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          household_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saved_searches_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          household_id: string | null
          id: string
          onboarding_completed: boolean | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          household_id?: string | null
          id: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          household_id?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_user_profiles_household'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      user_property_interactions: {
        Row: {
          created_at: string | null
          household_id: string | null
          id: string
          interaction_type: string
          property_id: string
          score_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          interaction_type: string
          property_id: string
          score_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          household_id?: string | null
          id?: string
          interaction_type?: string
          property_id?: string
          score_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_property_interactions_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_property_interactions_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

// Core table types for easy access
export type UserProfile = Tables<'user_profiles'>
export type Household = Tables<'households'>
export type HouseholdInvitation = Tables<'household_invitations'>
export type Neighborhood = Tables<'neighborhoods'>
export type Property = Tables<'properties'>
export type UserPropertyInteraction = Tables<'user_property_interactions'>
export type SavedSearch = Tables<'saved_searches'>

// Insert types
export type UserProfileInsert = TablesInsert<'user_profiles'>
export type HouseholdInsert = TablesInsert<'households'>
export type HouseholdInvitationInsert = TablesInsert<'household_invitations'>
export type NeighborhoodInsert = TablesInsert<'neighborhoods'>
export type PropertyInsert = TablesInsert<'properties'>
export type UserPropertyInteractionInsert =
  TablesInsert<'user_property_interactions'>
export type SavedSearchInsert = TablesInsert<'saved_searches'>

// Update types
export type UserProfileUpdate = TablesUpdate<'user_profiles'>
export type HouseholdUpdate = TablesUpdate<'households'>
export type HouseholdInvitationUpdate = TablesUpdate<'household_invitations'>
export type NeighborhoodUpdate = TablesUpdate<'neighborhoods'>
export type PropertyUpdate = TablesUpdate<'properties'>
export type UserPropertyInteractionUpdate =
  TablesUpdate<'user_property_interactions'>
export type SavedSearchUpdate = TablesUpdate<'saved_searches'>

// Extended types with application logic
export type PropertyWithNeighborhood = Property & {
  neighborhood?: Neighborhood | null
}

export type InteractionType = 'viewed' | 'liked' | 'skip'

export type PropertyType = 'house' | 'condo' | 'townhouse' | 'apartment'

export type CollaborationMode = 'independent' | 'shared' | 'weighted'

export type SearchFilters = {
  price_min?: number
  price_max?: number
  bedrooms_min?: number
  bedrooms_max?: number
  bathrooms_min?: number
  bathrooms_max?: number
  square_feet_min?: number
  square_feet_max?: number
  property_types?: PropertyType[]
  neighborhoods?: string[]
  amenities?: string[]
}

export type UserPreferences = {
  search_preferences?: SearchFilters
  ml_model_weights?: Record<string, number>
  notification_settings?: {
    email_enabled?: boolean
    push_enabled?: boolean
    frequency?: 'immediate' | 'daily' | 'weekly'
  }
  ui_preferences?: {
    theme?: 'light' | 'dark' | 'system'
    cards_per_view?: number
  }
}

export type ScoreData = {
  ml_score?: number
  cold_start_score?: number
  online_lr_score?: number
  lightgbm_score?: number
  feature_importance?: Record<string, number>
  model_version?: string
  created_at?: string
}
