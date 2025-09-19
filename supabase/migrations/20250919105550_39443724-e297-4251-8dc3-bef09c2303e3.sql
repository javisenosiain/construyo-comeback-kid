-- Create external CRM settings table
CREATE TABLE public.external_crm_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    external_crm TEXT NOT NULL CHECK (external_crm IN ('hubspot', 'pipedrive', 'zoho', 'google_sheets')),
    is_active BOOLEAN NOT NULL DEFAULT false,
    zapier_webhook TEXT NOT NULL,
    field_mappings JSONB NOT NULL DEFAULT '{"lead": {}, "customer": {}, "invoice": {}}'::jsonb,
    sync_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_sync BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create external CRM sync logs table
CREATE TABLE public.external_crm_sync_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('lead', 'customer', 'invoice')),
    record_id UUID NOT NULL,
    external_crm TEXT NOT NULL,
    sync_status TEXT NOT NULL CHECK (sync_status IN ('pending', 'success', 'failed', 'retrying')),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    zapier_webhook TEXT NOT NULL,
    field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.external_crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_crm_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for external_crm_settings
CREATE POLICY "Users can manage their own CRM settings" 
ON public.external_crm_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for external_crm_sync_logs
CREATE POLICY "Users can view their own sync logs" 
ON public.external_crm_sync_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert sync logs" 
ON public.external_crm_sync_logs 
FOR INSERT 
WITH CHECK (true);

-- Create triggers for updated_at timestamp
CREATE TRIGGER update_external_crm_settings_updated_at
    BEFORE UPDATE ON public.external_crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_external_crm_settings_user_id ON public.external_crm_settings(user_id);
CREATE INDEX idx_external_crm_sync_logs_user_id ON public.external_crm_sync_logs(user_id);
CREATE INDEX idx_external_crm_sync_logs_record ON public.external_crm_sync_logs(record_type, record_id);
CREATE INDEX idx_external_crm_sync_logs_status ON public.external_crm_sync_logs(sync_status);
CREATE INDEX idx_external_crm_sync_logs_created_at ON public.external_crm_sync_logs(created_at);