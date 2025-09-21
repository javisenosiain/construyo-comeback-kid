-- Create integration_configs table for storing integration configurations
CREATE TABLE public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  encrypted_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name)
);

-- Create integration_activity_logs table for logging integration activities
CREATE TABLE public.integration_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'error', 'retry')),
  request_data TEXT,
  response_data TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for integration_configs
CREATE POLICY "Users can manage their own integration configs"
ON public.integration_configs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for integration_activity_logs
CREATE POLICY "Users can view their own integration logs"
ON public.integration_activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert integration logs"
ON public.integration_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_integration_configs_user_service ON public.integration_configs(user_id, service_name);
CREATE INDEX idx_integration_configs_active ON public.integration_configs(user_id, is_active);
CREATE INDEX idx_integration_activity_logs_user_created ON public.integration_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_integration_activity_logs_service_created ON public.integration_activity_logs(service_name, created_at DESC);

-- Create trigger to update updated_at column
CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();