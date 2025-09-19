-- Create helper functions for CRM settings to work around type generation delays

-- Function to get user CRM settings
CREATE OR REPLACE FUNCTION public.get_user_crm_settings(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    external_crm TEXT,
    is_active BOOLEAN,
    zapier_webhook TEXT,
    field_mappings JSONB,
    sync_enabled BOOLEAN,
    auto_sync BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        s.id,
        s.user_id,
        s.external_crm,
        s.is_active,
        s.zapier_webhook,
        s.field_mappings,
        s.sync_enabled,
        s.auto_sync,
        s.created_at,
        s.updated_at
    FROM public.external_crm_settings s
    WHERE s.user_id = p_user_id;
$$;

-- Function to upsert CRM settings
CREATE OR REPLACE FUNCTION public.upsert_crm_settings(
    p_user_id UUID,
    p_external_crm TEXT,
    p_is_active BOOLEAN,
    p_zapier_webhook TEXT,
    p_field_mappings JSONB,
    p_sync_enabled BOOLEAN,
    p_auto_sync BOOLEAN
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.external_crm_settings (
        user_id, external_crm, is_active, zapier_webhook, 
        field_mappings, sync_enabled, auto_sync, updated_at
    ) VALUES (
        p_user_id, p_external_crm, p_is_active, p_zapier_webhook,
        p_field_mappings, p_sync_enabled, p_auto_sync, now()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        external_crm = EXCLUDED.external_crm,
        is_active = EXCLUDED.is_active,
        zapier_webhook = EXCLUDED.zapier_webhook,
        field_mappings = EXCLUDED.field_mappings,
        sync_enabled = EXCLUDED.sync_enabled,
        auto_sync = EXCLUDED.auto_sync,
        updated_at = now();
$$;