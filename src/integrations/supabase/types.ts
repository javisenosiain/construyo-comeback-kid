export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          payload: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      builders: {
        Row: {
          bio: string | null
          company_name: string | null
          created_at: string | null
          id: string
          location: string | null
          services: string[] | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          services?: string[] | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          services?: string[] | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "builders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          preferred_contact: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          preferred_contact?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          preferred_contact?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_reviews: {
        Row: {
          id: string
          imported_at: string
          platform: string
          platform_url: string | null
          rating: number | null
          review_date: string | null
          review_text: string | null
          reviewer_name: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          id?: string
          imported_at?: string
          platform: string
          platform_url?: string | null
          rating?: number | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          id?: string
          imported_at?: string
          platform?: string
          platform_url?: string | null
          rating?: number | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          project_id: string | null
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string
          builder_id: string
          cover_letter: string | null
          id: string
          job_id: string
          notes: string | null
          portfolio_items: string[] | null
          proposed_budget: number | null
          proposed_timeline_weeks: number | null
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          applied_at?: string
          builder_id: string
          cover_letter?: string | null
          id?: string
          job_id: string
          notes?: string | null
          portfolio_items?: string[] | null
          proposed_budget?: number | null
          proposed_timeline_weeks?: number | null
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          applied_at?: string
          builder_id?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          portfolio_items?: string[] | null
          proposed_budget?: number | null
          proposed_timeline_weeks?: number | null
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          name: string
          parent_category_id: string | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      job_templates: {
        Row: {
          category: string
          common_requirements: string[] | null
          common_skills: string[] | null
          created_at: string
          description_template: string | null
          id: string
          name: string
          typical_budget_max: number | null
          typical_budget_min: number | null
          typical_timeline_weeks: number | null
        }
        Insert: {
          category: string
          common_requirements?: string[] | null
          common_skills?: string[] | null
          created_at?: string
          description_template?: string | null
          id?: string
          name: string
          typical_budget_max?: number | null
          typical_budget_min?: number | null
          typical_timeline_weeks?: number | null
        }
        Update: {
          category?: string
          common_requirements?: string[] | null
          common_skills?: string[] | null
          created_at?: string
          description_template?: string | null
          id?: string
          name?: string
          typical_budget_max?: number | null
          typical_budget_min?: number | null
          typical_timeline_weeks?: number | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          access_details: string | null
          address: string | null
          applicant_count: number | null
          budget_max: number | null
          budget_min: number | null
          builder_id: string | null
          category: string | null
          contact_preference: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          flexible_timing: boolean | null
          id: string
          lead_id: string | null
          materials_provided: boolean | null
          planning_permission_required: boolean | null
          postcode: string | null
          preferred_start_date: string | null
          priority: string | null
          project_type: string | null
          property_type: string | null
          requirements: string[] | null
          skills_needed: string[] | null
          start_date: string | null
          status: string | null
          timeline_weeks: number | null
          title: string
          view_count: number | null
        }
        Insert: {
          access_details?: string | null
          address?: string | null
          applicant_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          builder_id?: string | null
          category?: string | null
          contact_preference?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          flexible_timing?: boolean | null
          id?: string
          lead_id?: string | null
          materials_provided?: boolean | null
          planning_permission_required?: boolean | null
          postcode?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          project_type?: string | null
          property_type?: string | null
          requirements?: string[] | null
          skills_needed?: string[] | null
          start_date?: string | null
          status?: string | null
          timeline_weeks?: number | null
          title: string
          view_count?: number | null
        }
        Update: {
          access_details?: string | null
          address?: string | null
          applicant_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          builder_id?: string | null
          category?: string | null
          contact_preference?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          flexible_timing?: boolean | null
          id?: string
          lead_id?: string | null
          materials_provided?: boolean | null
          planning_permission_required?: boolean | null
          postcode?: string | null
          preferred_start_date?: string | null
          priority?: string | null
          project_type?: string | null
          property_type?: string | null
          requirements?: string[] | null
          skills_needed?: string[] | null
          start_date?: string | null
          status?: string | null
          timeline_weeks?: number | null
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          builder_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          source: string | null
          status: string | null
        }
        Insert: {
          builder_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          source?: string | null
          status?: string | null
        }
        Update: {
          builder_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          builder_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          type: string | null
          url: string
        }
        Insert: {
          builder_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          type?: string | null
          url: string
        }
        Update: {
          builder_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          job_id: string | null
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          budget_range: string | null
          client_name: string | null
          completion_date: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          project_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_range?: string | null
          client_name?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          project_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_range?: string | null
          client_name?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          project_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          hourly_rate: number | null
          id: string
          insurance_verified: boolean | null
          license_number: string | null
          location: string | null
          marketing_description: string | null
          phone: string | null
          role: string
          services: string[] | null
          specialties: string[] | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id: string
          insurance_verified?: boolean | null
          license_number?: string | null
          location?: string | null
          marketing_description?: string | null
          phone?: string | null
          role?: string
          services?: string[] | null
          specialties?: string[] | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          hourly_rate?: number | null
          id?: string
          insurance_verified?: boolean | null
          license_number?: string | null
          location?: string | null
          marketing_description?: string | null
          phone?: string | null
          role?: string
          services?: string[] | null
          specialties?: string[] | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      project_updates: {
        Row: {
          builder_id: string | null
          created_at: string | null
          id: string
          media_url: string | null
          project_id: string | null
          update_text: string | null
        }
        Insert: {
          builder_id?: string | null
          created_at?: string | null
          id?: string
          media_url?: string | null
          project_id?: string | null
          update_text?: string | null
        }
        Update: {
          builder_id?: string | null
          created_at?: string | null
          id?: string
          media_url?: string | null
          project_id?: string | null
          update_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          title: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referee_email: string | null
          referrer_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_email?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_email?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          builder_id: string
          customer_id: string
          id: string
          job_id: string | null
          last_reminder_sent: string | null
          reminder_count: number | null
          request_sent_at: string
          request_status: string | null
          review_token: string | null
        }
        Insert: {
          builder_id: string
          customer_id: string
          id?: string
          job_id?: string | null
          last_reminder_sent?: string | null
          reminder_count?: number | null
          request_sent_at?: string
          request_status?: string | null
          review_token?: string | null
        }
        Update: {
          builder_id?: string
          customer_id?: string
          id?: string
          job_id?: string | null
          last_reminder_sent?: string | null
          reminder_count?: number | null
          request_sent_at?: string
          request_status?: string | null
          review_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          project_id: string | null
          rating: number | null
          review_request_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          review_request_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          project_id?: string | null
          rating?: number | null
          review_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
