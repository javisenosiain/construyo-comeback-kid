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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          record_id: string
          sensitive_fields: string[] | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id: string
          sensitive_fields?: string[] | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string
          sensitive_fields?: string[] | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          email: string | null
          first_attempt_at: string | null
          id: string
          ip_address: unknown
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          email?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address: unknown
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          email?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
        }
        Relationships: []
      }
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
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          trigger_type: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          status: string
          subscribed_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          subscribed_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          subscribed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_link_analytics: {
        Row: {
          calendly_event_id: string | null
          calendly_event_uri: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          lead_id: string | null
          message_log_id: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          message_log_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          calendly_event_id?: string | null
          calendly_event_uri?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          message_log_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_link_analytics_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: false
            referencedRelation: "message_delivery_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      builders: {
        Row: {
          bio: string | null
          company_name: string | null
          created_at: string | null
          id: string
          location: string | null
          services: string[] | null
          user_id: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          services?: string[] | null
          user_id?: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          services?: string[] | null
          user_id?: string
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
      business_settings: {
        Row: {
          automation_settings: Json | null
          business_name: string | null
          business_type: string | null
          created_at: string
          default_currency: string | null
          facebook_connected: boolean | null
          id: string
          instagram_connected: boolean | null
          insurance_number: string | null
          license_number: string | null
          notification_preferences: Json | null
          service_areas: string[] | null
          specialties: string[] | null
          stripe_account_id: string | null
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          automation_settings?: Json | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          default_currency?: string | null
          facebook_connected?: boolean | null
          id?: string
          instagram_connected?: boolean | null
          insurance_number?: string | null
          license_number?: string | null
          notification_preferences?: Json | null
          service_areas?: string[] | null
          specialties?: string[] | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          automation_settings?: Json | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          default_currency?: string | null
          facebook_connected?: boolean | null
          id?: string
          instagram_connected?: boolean | null
          insurance_number?: string | null
          license_number?: string | null
          notification_preferences?: Json | null
          service_areas?: string[] | null
          specialties?: string[] | null
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      catalogue_analytics: {
        Row: {
          catalogue_item_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          microsite_id: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          catalogue_item_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          microsite_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          catalogue_item_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          microsite_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_analytics_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_analytics_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogue_analytics_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites_public"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogue_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      catalogue_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration_estimate: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean | null
          name: string
          price: number | null
          price_display: string | null
          pricing_type: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_estimate?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          name: string
          price?: number | null
          price_display?: string | null
          pricing_type?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_estimate?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          name?: string
          price?: number | null
          price_display?: string | null
          pricing_type?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogue_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalogue_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
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
      construyo_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_name: string
          due_date: string | null
          id: string
          invoice_number: string
          lead_id: string | null
          notes: string | null
          paid_date: string | null
          project_title: string
          sent_date: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name: string
          due_date?: string | null
          id?: string
          invoice_number: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          project_title: string
          sent_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_name?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          lead_id?: string | null
          notes?: string | null
          paid_date?: string | null
          project_title?: string
          sent_date?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      construyo_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          id: string
          invoice_id: string | null
          lead_id: string | null
          platform: string | null
          published_date: string | null
          rating: number | null
          received_date: string | null
          request_token: string | null
          requested_date: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          platform?: string | null
          published_date?: string | null
          rating?: number | null
          received_date?: string | null
          request_token?: string | null
          requested_date?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          platform?: string | null
          published_date?: string | null
          rating?: number | null
          received_date?: string | null
          request_token?: string | null
          requested_date?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "construyo_reviews_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "construyo_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          automation_rule_id: string | null
          content: string | null
          created_at: string
          id: string
          interaction_type: string
          lead_id: string | null
          metadata: Json | null
          opened_at: string | null
          responded_at: string | null
          sent_at: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          automation_rule_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Update: {
          automation_rule_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          lead_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          billing_address: string | null
          business_registration: string | null
          city: string | null
          company_id: string
          company_name: string | null
          conversion_date: string | null
          country: string | null
          created_at: string | null
          created_by: string
          credit_limit: number | null
          customer_type: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          original_lead_id: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          primary_contact: string | null
          service_address: string | null
          status: Database["public"]["Enums"]["customer_status"] | null
          tags: string[] | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          archived_at?: string | null
          billing_address?: string | null
          business_registration?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          conversion_date?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          original_lead_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          primary_contact?: string | null
          service_address?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          archived_at?: string | null
          billing_address?: string | null
          business_registration?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          conversion_date?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          credit_limit?: number | null
          customer_type?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          original_lead_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          primary_contact?: string | null
          service_address?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          tags?: string[] | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_original_lead_id_fkey"
            columns: ["original_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_applications: {
        Row: {
          applied_at: string
          client_notified_at: string | null
          client_response: Json | null
          created_at: string
          discount_amount: number
          discount_rule_id: string
          final_amount: number
          id: string
          invoice_id: string
          notification_channel: string | null
          notification_status: string | null
          original_amount: number
          user_id: string
        }
        Insert: {
          applied_at?: string
          client_notified_at?: string | null
          client_response?: Json | null
          created_at?: string
          discount_amount: number
          discount_rule_id: string
          final_amount: number
          id?: string
          invoice_id: string
          notification_channel?: string | null
          notification_status?: string | null
          original_amount: number
          user_id: string
        }
        Update: {
          applied_at?: string
          client_notified_at?: string | null
          client_response?: Json | null
          created_at?: string
          discount_amount?: number
          discount_rule_id?: string
          final_amount?: number
          id?: string
          invoice_id?: string
          notification_channel?: string | null
          notification_status?: string | null
          original_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_applications_discount_rule_id_fkey"
            columns: ["discount_rule_id"]
            isOneToOne: false
            referencedRelation: "discount_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_rules: {
        Row: {
          conditions: Json
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_usage: number | null
          rule_name: string
          rule_type: string
          updated_at: string
          usage_count: number | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          rule_name: string
          rule_type: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          rule_name?: string
          rule_type?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      external_crm_settings: {
        Row: {
          auto_sync: boolean
          created_at: string
          external_crm: string
          field_mappings: Json
          id: string
          is_active: boolean
          sync_enabled: boolean
          updated_at: string
          user_id: string
          zapier_webhook: string
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          external_crm: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
          zapier_webhook: string
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          external_crm?: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
          zapier_webhook?: string
        }
        Relationships: []
      }
      external_crm_sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          external_crm: string
          field_mappings: Json
          id: string
          record_id: string
          record_type: string
          retry_count: number
          sync_status: string
          synced_at: string | null
          user_id: string
          zapier_webhook: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_crm: string
          field_mappings?: Json
          id?: string
          record_id: string
          record_type: string
          retry_count?: number
          sync_status: string
          synced_at?: string | null
          user_id: string
          zapier_webhook: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_crm?: string
          field_mappings?: Json
          id?: string
          record_id?: string
          record_type?: string
          retry_count?: number
          sync_status?: string
          synced_at?: string | null
          user_id?: string
          zapier_webhook?: string
        }
        Relationships: []
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
      feedback_delivery_logs: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          delivery_method: string
          delivery_status: string
          error_message: string | null
          expires_at: string
          external_message_id: string | null
          form_id: string
          id: string
          project_id: string
          responded_at: string | null
          response_token: string | null
          sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_method: string
          delivery_status?: string
          error_message?: string | null
          expires_at?: string
          external_message_id?: string | null
          form_id: string
          id?: string
          project_id: string
          responded_at?: string | null
          response_token?: string | null
          sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_method?: string
          delivery_status?: string
          error_message?: string | null
          expires_at?: string
          external_message_id?: string | null
          form_id?: string
          id?: string
          project_id?: string
          responded_at?: string | null
          response_token?: string | null
          sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_delivery_logs_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_forms: {
        Row: {
          comments_label: string | null
          created_at: string
          form_description: string | null
          form_name: string
          form_title: string
          gdpr_consent_required: boolean | null
          gdpr_consent_text: string | null
          google_sheets_sync: boolean | null
          id: string
          is_active: boolean
          rating_label: string | null
          thank_you_message: string | null
          updated_at: string
          user_id: string
          zapier_webhook: string | null
        }
        Insert: {
          comments_label?: string | null
          created_at?: string
          form_description?: string | null
          form_name: string
          form_title?: string
          gdpr_consent_required?: boolean | null
          gdpr_consent_text?: string | null
          google_sheets_sync?: boolean | null
          id?: string
          is_active?: boolean
          rating_label?: string | null
          thank_you_message?: string | null
          updated_at?: string
          user_id: string
          zapier_webhook?: string | null
        }
        Update: {
          comments_label?: string | null
          created_at?: string
          form_description?: string | null
          form_name?: string
          form_title?: string
          gdpr_consent_required?: boolean | null
          gdpr_consent_text?: string | null
          google_sheets_sync?: boolean | null
          id?: string
          is_active?: boolean
          rating_label?: string | null
          thank_you_message?: string | null
          updated_at?: string
          user_id?: string
          zapier_webhook?: string | null
        }
        Relationships: []
      }
      feedback_resolutions: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_method: string
          external_message_id: string | null
          feedback_response_id: string
          id: string
          initiated_at: string
          project_id: string
          resolution_notes: string | null
          resolution_status: string
          resolution_token: string | null
          resolved_at: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_method: string
          external_message_id?: string | null
          feedback_response_id: string
          id?: string
          initiated_at?: string
          project_id: string
          resolution_notes?: string | null
          resolution_status?: string
          resolution_token?: string | null
          resolved_at?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_method?: string
          external_message_id?: string | null
          feedback_response_id?: string
          id?: string
          initiated_at?: string
          project_id?: string
          resolution_notes?: string | null
          resolution_status?: string
          resolution_token?: string | null
          resolved_at?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          comments: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          form_id: string
          gdpr_consent: boolean
          id: string
          project_id: string
          rating: number
          response_token: string | null
          submission_ip: unknown | null
          submission_user_agent: string | null
          submitted_at: string
          user_id: string
          zapier_sync_error: string | null
          zapier_synced: boolean | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          form_id: string
          gdpr_consent?: boolean
          id?: string
          project_id: string
          rating: number
          response_token?: string | null
          submission_ip?: unknown | null
          submission_user_agent?: string | null
          submitted_at?: string
          user_id: string
          zapier_sync_error?: string | null
          zapier_synced?: boolean | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          form_id?: string
          gdpr_consent?: boolean
          id?: string
          project_id?: string
          rating?: number
          response_token?: string | null
          submission_ip?: unknown | null
          submission_user_agent?: string | null
          submitted_at?: string
          user_id?: string
          zapier_sync_error?: string | null
          zapier_synced?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          encrypted_data: string | null
          form_data: Json
          form_id: string | null
          id: string
          ip_address: unknown | null
          lead_id: string | null
          microsite_id: string | null
          referrer: string | null
          submission_status: string
          updated_at: string
          user_agent: string | null
          zapier_sent_at: string | null
          zapier_status: string | null
          zapier_webhook: string | null
        }
        Insert: {
          created_at?: string
          encrypted_data?: string | null
          form_data?: Json
          form_id?: string | null
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          microsite_id?: string | null
          referrer?: string | null
          submission_status?: string
          updated_at?: string
          user_agent?: string | null
          zapier_sent_at?: string | null
          zapier_status?: string | null
          zapier_webhook?: string | null
        }
        Update: {
          created_at?: string
          encrypted_data?: string | null
          form_data?: Json
          form_id?: string | null
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          microsite_id?: string | null
          referrer?: string | null
          submission_status?: string
          updated_at?: string
          user_agent?: string | null
          zapier_sent_at?: string | null
          zapier_status?: string | null
          zapier_webhook?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          gallery_id: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          gallery_id: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          gallery_id?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integration_activity_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          request_data: string | null
          response_data: string | null
          service_name: string
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          request_data?: string | null
          response_data?: string | null
          service_name: string
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          request_data?: string | null
          response_data?: string | null
          service_name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          created_at: string
          encrypted_config: Json
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_config?: Json
          id?: string
          is_active?: boolean
          service_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_config?: Json
          id?: string
          is_active?: boolean
          service_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          invoice_id: string | null
          payment_provider: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          invoice_id?: string | null
          payment_provider?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          payment_provider?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_analytics_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "construyo_invoices"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_capture_forms: {
        Row: {
          created_at: string
          embed_code: string | null
          fields: Json | null
          form_description: string | null
          form_name: string
          form_title: string | null
          id: string
          is_active: boolean | null
          redirect_url: string | null
          thank_you_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embed_code?: string | null
          fields?: Json | null
          form_description?: string | null
          form_name: string
          form_title?: string | null
          id?: string
          is_active?: boolean | null
          redirect_url?: string | null
          thank_you_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embed_code?: string | null
          fields?: Json | null
          form_description?: string | null
          form_name?: string
          form_title?: string | null
          id?: string
          is_active?: boolean | null
          redirect_url?: string | null
          thank_you_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          archived_at: string | null
          assigned_to: string | null
          city: string | null
          conversion_notes: string | null
          converted_at: string | null
          converted_to_customer_id: string | null
          country: string | null
          created_at: string | null
          created_by: string
          email: string | null
          estimated_budget_max: number | null
          estimated_budget_min: number | null
          estimated_timeline: string | null
          first_name: string
          id: string
          last_contact_date: string | null
          last_name: string
          lead_source: string | null
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          priority: string | null
          project_description: string | null
          project_type: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          city?: string | null
          conversion_notes?: string | null
          converted_at?: string | null
          converted_to_customer_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by: string
          email?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          estimated_timeline?: string | null
          first_name: string
          id?: string
          last_contact_date?: string | null
          last_name: string
          lead_source?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          project_description?: string | null
          project_type?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          city?: string | null
          conversion_notes?: string | null
          converted_at?: string | null
          converted_to_customer_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string
          email?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          estimated_timeline?: string | null
          first_name?: string
          id?: string
          last_contact_date?: string | null
          last_name?: string
          lead_source?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          priority?: string | null
          project_description?: string | null
          project_type?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_converted_customer"
            columns: ["converted_to_customer_id"]
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
      message_delivery_logs: {
        Row: {
          booking_completed_at: string | null
          calendly_link: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          external_message_id: string | null
          id: string
          lead_id: string | null
          message_content: string
          message_type: string
          recipient_email: string | null
          recipient_phone: string | null
          retry_count: number | null
          sent_at: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_completed_at?: string | null
          calendly_link?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          message_content: string
          message_type: string
          recipient_email?: string | null
          recipient_phone?: string | null
          retry_count?: number | null
          sent_at?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_completed_at?: string | null
          calendly_link?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string
          message_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          retry_count?: number | null
          sent_at?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_delivery_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          calendly_link_template: string | null
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          subject_template: string | null
          template_name: string
          template_type: string
          trigger_conditions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendly_link_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          subject_template?: string | null
          template_name: string
          template_type: string
          trigger_conditions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendly_link_template?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          subject_template?: string | null
          template_name?: string
          template_type?: string
          trigger_conditions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      microsite_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          microsite_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          microsite_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          microsite_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "microsite_analytics_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsite_analytics_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites_public"
            referencedColumns: ["id"]
          },
        ]
      }
      microsites: {
        Row: {
          analytics_data: Json | null
          client_name: string
          created_at: string
          domain_slug: string
          form_id: string | null
          id: string
          is_active: boolean
          microsite_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_data?: Json | null
          client_name: string
          created_at?: string
          domain_slug: string
          form_id?: string | null
          id?: string
          is_active?: boolean
          microsite_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_data?: Json | null
          client_name?: string
          created_at?: string
          domain_slug?: string
          form_id?: string | null
          id?: string
          is_active?: boolean
          microsite_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "microsites_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_settings: {
        Row: {
          created_at: string | null
          encrypted_credentials: string | null
          id: string
          is_active: boolean | null
          provider_type: string
          sync_enabled: boolean | null
          updated_at: string | null
          user_id: string
          webhook_url: string | null
          zapier_webhook: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_credentials?: string | null
          id?: string
          is_active?: boolean | null
          provider_type: string
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          webhook_url?: string | null
          zapier_webhook?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_credentials?: string | null
          id?: string
          is_active?: boolean | null
          provider_type?: string
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          webhook_url?: string | null
          zapier_webhook?: string | null
        }
        Relationships: []
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
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_api_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          id: string
          query: string
          timestamp: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          id?: string
          query: string
          timestamp?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          id?: string
          query?: string
          timestamp?: string
        }
        Relationships: []
      }
      planning_searches: {
        Row: {
          created_at: string | null
          id: string
          postcode: string
          results: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          postcode: string
          results?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          postcode?: string
          results?: Json | null
        }
        Relationships: []
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
      pricing_rules: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          price_per_unit: number | null
          project_type: string
          unit_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          price_per_unit?: number | null
          project_type: string
          unit_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          price_per_unit?: number | null
          project_type?: string
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          company_id: string | null
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
          primary_role: Database["public"]["Enums"]["app_role"] | null
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
          company_id?: string | null
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
          primary_role?: Database["public"]["Enums"]["app_role"] | null
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
          company_id?: string | null
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
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          role?: string
          services?: string[] | null
          specialties?: string[] | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_galleries: {
        Row: {
          ai_provider: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          error_message: string | null
          gallery_type: string
          gallery_url: string | null
          generation_config: Json | null
          generation_status: string
          id: string
          media_count: number
          processing_time_seconds: number | null
          project_id: string
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          gallery_type?: string
          gallery_url?: string | null
          generation_config?: Json | null
          generation_status?: string
          id?: string
          media_count?: number
          processing_time_seconds?: number | null
          project_id: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          error_message?: string | null
          gallery_type?: string
          gallery_url?: string | null
          generation_config?: Json | null
          generation_status?: string
          id?: string
          media_count?: number
          processing_time_seconds?: number | null
          project_id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
      quote_requests: {
        Row: {
          calendly_event_id: string | null
          calendly_event_url: string | null
          catalogue_item_id: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          estimated_budget: string | null
          form_data: Json | null
          id: string
          microsite_id: string | null
          preferred_timeline: string | null
          project_description: string | null
          quote_amount: number | null
          quote_notes: string | null
          source_url: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendly_event_id?: string | null
          calendly_event_url?: string | null
          catalogue_item_id?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          estimated_budget?: string | null
          form_data?: Json | null
          id?: string
          microsite_id?: string | null
          preferred_timeline?: string | null
          project_description?: string | null
          quote_amount?: number | null
          quote_notes?: string | null
          source_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendly_event_id?: string | null
          calendly_event_url?: string | null
          catalogue_item_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          estimated_budget?: string | null
          form_data?: Json | null
          id?: string
          microsite_id?: string | null
          preferred_timeline?: string | null
          project_description?: string | null
          quote_amount?: number | null
          quote_notes?: string | null
          source_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "catalogue_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_microsite_id_fkey"
            columns: ["microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          clicked_at: string
          converted: boolean | null
          id: string
          ip_address: unknown | null
          lead_id: string | null
          referral_code_id: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          converted?: boolean | null
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          referral_code_id?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          converted?: boolean | null
          id?: string
          ip_address?: unknown | null
          lead_id?: string | null
          referral_code_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          campaign_name: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          referral_message: string | null
          reward_description: string | null
          target_microsite_id: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_failed: number | null
          total_sent: number | null
          updated_at: string
          user_id: string | null
          whatsapp_template: string | null
        }
        Insert: {
          campaign_name?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          referral_message?: string | null
          reward_description?: string | null
          target_microsite_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id?: string | null
          whatsapp_template?: string | null
        }
        Update: {
          campaign_name?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          referral_message?: string | null
          reward_description?: string | null
          target_microsite_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_failed?: number | null
          total_sent?: number | null
          updated_at?: string
          user_id?: string | null
          whatsapp_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_target_microsite_id_fkey"
            columns: ["target_microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_target_microsite_id_fkey"
            columns: ["target_microsite_id"]
            isOneToOne: false
            referencedRelation: "microsites_public"
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
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          record_id: string | null
          risk_level: string | null
          sensitive_data_accessed: string[] | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          risk_level?: string | null
          sensitive_data_accessed?: string[] | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          risk_level?: string | null
          sensitive_data_accessed?: string[] | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_media_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          platform: string
          post_id: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          platform: string
          post_id?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          platform?: string
          post_id?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_media_posts: {
        Row: {
          buffer_post_id: string | null
          canva_design_id: string | null
          caption: string | null
          content_type: string
          created_at: string
          engagement_metrics: Json | null
          error_message: string | null
          gallery_id: string | null
          hashtags: string[] | null
          id: string
          media_urls: string[] | null
          platform: string
          posted_at: string | null
          project_id: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
          zapier_workflow_id: string | null
        }
        Insert: {
          buffer_post_id?: string | null
          canva_design_id?: string | null
          caption?: string | null
          content_type: string
          created_at?: string
          engagement_metrics?: Json | null
          error_message?: string | null
          gallery_id?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: string[] | null
          platform: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id: string
          zapier_workflow_id?: string | null
        }
        Update: {
          buffer_post_id?: string | null
          canva_design_id?: string | null
          caption?: string | null
          content_type?: string
          created_at?: string
          engagement_metrics?: Json | null
          error_message?: string | null
          gallery_id?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: string[] | null
          platform?: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          zapier_workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_social_media_posts_gallery_id"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "project_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          content: string | null
          created_at: string
          engagement_stats: Json | null
          id: string
          lead_id: string | null
          media_urls: string[] | null
          platform: string
          platform_post_id: string | null
          post_type: string
          posted_at: string | null
          scheduled_for: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          lead_id?: string | null
          media_urls?: string[] | null
          platform: string
          platform_post_id?: string | null
          post_type: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          engagement_stats?: Json | null
          id?: string
          lead_id?: string | null
          media_urls?: string[] | null
          platform?: string
          platform_post_id?: string | null
          post_type?: string
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      submission_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          submissions_count: number | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          submissions_count?: number | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          submissions_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          company_id: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          "company name": string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          "company name"?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role: string
        }
        Update: {
          "company name"?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      video_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          user_agent: string | null
          user_id: string
          video_generation_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id: string
          video_generation_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
          video_generation_id?: string
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          completed_at: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          project_id: string
          runwayml_task_id: string | null
          status: string
          testimonial_text: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          runwayml_task_id?: string | null
          status?: string
          testimonial_text?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_type?: string
          video_url?: string | null
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          runwayml_task_id?: string | null
          status?: string
          testimonial_text?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_sent_at: string | null
          last_updated: string | null
          name: string | null
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_sent_at?: string | null
          last_updated?: string | null
          name?: string | null
          phone: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_sent_at?: string | null
          last_updated?: string | null
          name?: string | null
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_referral_logs: {
        Row: {
          activity_type: string
          campaign_id: string | null
          clicked_at: string | null
          contact_name: string | null
          contact_phone: string
          converted_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          read_at: string | null
          referral_link: string | null
          sent_at: string | null
        }
        Insert: {
          activity_type: string
          campaign_id?: string | null
          clicked_at?: string | null
          contact_name?: string | null
          contact_phone: string
          converted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          referral_link?: string | null
          sent_at?: string | null
        }
        Update: {
          activity_type?: string
          campaign_id?: string | null
          clicked_at?: string | null
          contact_name?: string | null
          contact_phone?: string
          converted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          read_at?: string | null
          referral_link?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_referral_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      microsites_public: {
        Row: {
          client_name: string | null
          created_at: string | null
          domain_slug: string | null
          id: string | null
          is_active: boolean | null
          microsite_data: Json | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          domain_slug?: string | null
          id?: string | null
          is_active?: boolean | null
          microsite_data?: never
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          domain_slug?: string | null
          id?: string | null
          is_active?: boolean | null
          microsite_data?: never
        }
        Relationships: []
      }
    }
    Functions: {
      check_auth_rate_limit: {
        Args: { p_email?: string; p_ip_address: unknown }
        Returns: boolean
      }
      check_endpoint_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip_address: unknown
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_planning_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      convert_lead_to_customer: {
        Args: { p_conversion_notes?: string; p_lead_id: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      generate_feedback_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_resolution_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_integration_analytics: {
        Args: {
          end_date?: string
          service_filter?: string
          start_date?: string
          user_uuid: string
        }
        Returns: {
          action: string
          created_at: string
          duration_ms: number
          error_message: string
          id: string
          metadata: Json
          request_data: string
          response_data: string
          service_name: string
          status: string
          user_id: string
        }[]
      }
      get_last_integration_activity: {
        Args: { service_filter?: string; user_uuid: string }
        Returns: {
          action: string
          created_at: string
          duration_ms: number
          error_message: string
          id: string
          metadata: Json
          request_data: string
          response_data: string
          service_name: string
          status: string
          user_id: string
        }[]
      }
      get_user_companies: {
        Args: { _user_id?: string }
        Returns: {
          company_id: string
          company_name: string
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_crm_settings: {
        Args: { p_user_id: string }
        Returns: {
          auto_sync: boolean
          created_at: string
          external_crm: string
          field_mappings: Json
          id: string
          is_active: boolean
          sync_enabled: boolean
          updated_at: string
          user_id: string
          zapier_webhook: string
        }[]
      }
      get_user_integration_configs: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string
          encrypted_config: Json
          id: string
          is_active: boolean
          service_name: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_lead_stats: {
        Args: { user_uuid?: string }
        Returns: {
          leads_by_priority: Json
          leads_by_status: Json
          total_leads: number
        }[]
      }
      has_role: {
        Args: {
          _company_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_user: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      log_enhanced_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_ip_address?: unknown
          p_record_id?: string
          p_risk_level?: string
          p_table_name?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      log_integration_activity: {
        Args: {
          p_action: string
          p_duration_ms?: number
          p_error_message?: string
          p_metadata?: Json
          p_request_data?: string
          p_response_data?: string
          p_service_name: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_record_id?: string
          p_risk_level?: string
          p_sensitive_data?: string[]
          p_table_name?: string
        }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: {
          p_action: string
          p_record_id: string
          p_sensitive_fields?: string[]
          p_table_name: string
        }
        Returns: undefined
      }
      upsert_crm_settings: {
        Args: {
          p_auto_sync: boolean
          p_external_crm: string
          p_field_mappings: Json
          p_is_active: boolean
          p_sync_enabled: boolean
          p_user_id: string
          p_zapier_webhook: string
        }
        Returns: undefined
      }
      upsert_integration_config: {
        Args: {
          p_encrypted_config: Json
          p_is_active: boolean
          p_service_name: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_user" | "admin" | "builder" | "viewer" | "customer"
      customer_status: "active" | "inactive" | "archived"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "won"
        | "lost"
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
    Enums: {
      app_role: ["super_user", "admin", "builder", "viewer", "customer"],
      customer_status: ["active", "inactive", "archived"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "won",
        "lost",
      ],
    },
  },
} as const
