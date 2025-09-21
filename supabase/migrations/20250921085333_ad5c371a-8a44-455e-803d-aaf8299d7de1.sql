-- Create RPC functions for integration operations

-- Function to get user integration configs
CREATE OR REPLACE FUNCTION public.get_user_integration_configs(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  service_name TEXT,
  encrypted_config JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ic.id,
    ic.user_id,
    ic.service_name,
    ic.encrypted_config,
    ic.is_active,
    ic.created_at,
    ic.updated_at
  FROM public.integration_configs ic
  WHERE ic.user_id = user_uuid;
$$;

-- Function to upsert integration config
CREATE OR REPLACE FUNCTION public.upsert_integration_config(
  p_user_id UUID,
  p_service_name TEXT,
  p_encrypted_config JSONB,
  p_is_active BOOLEAN
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_id UUID;
BEGIN
  INSERT INTO public.integration_configs (
    user_id, service_name, encrypted_config, is_active, updated_at
  ) VALUES (
    p_user_id, p_service_name, p_encrypted_config, p_is_active, now()
  )
  ON CONFLICT (user_id, service_name) 
  DO UPDATE SET
    encrypted_config = EXCLUDED.encrypted_config,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO config_id;
  
  RETURN config_id;
END;
$$;

-- Function to log integration activity
CREATE OR REPLACE FUNCTION public.log_integration_activity(
  p_user_id UUID,
  p_service_name TEXT,
  p_action TEXT,
  p_status TEXT,
  p_request_data TEXT DEFAULT NULL,
  p_response_data TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.integration_activity_logs (
    user_id, service_name, action, status, request_data, 
    response_data, error_message, metadata, duration_ms
  ) VALUES (
    p_user_id, p_service_name, p_action, p_status, p_request_data,
    p_response_data, p_error_message, p_metadata, p_duration_ms
  );
$$;

-- Function to get last integration activity
CREATE OR REPLACE FUNCTION public.get_last_integration_activity(
  user_uuid UUID,
  service_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  service_name TEXT,
  action TEXT,
  status TEXT,
  request_data TEXT,
  response_data TEXT,
  error_message TEXT,
  metadata JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ial.id,
    ial.user_id,
    ial.service_name,
    ial.action,
    ial.status,
    ial.request_data,
    ial.response_data,
    ial.error_message,
    ial.metadata,
    ial.duration_ms,
    ial.created_at
  FROM public.integration_activity_logs ial
  WHERE ial.user_id = user_uuid
    AND (service_filter IS NULL OR ial.service_name = service_filter)
  ORDER BY ial.created_at DESC
  LIMIT 1;
$$;

-- Function to get integration analytics
CREATE OR REPLACE FUNCTION public.get_integration_analytics(
  user_uuid UUID,
  service_filter TEXT DEFAULT NULL,
  start_date TEXT DEFAULT NULL,
  end_date TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  service_name TEXT,
  action TEXT,
  status TEXT,
  request_data TEXT,
  response_data TEXT,
  error_message TEXT,
  metadata JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ial.id,
    ial.user_id,
    ial.service_name,
    ial.action,
    ial.status,
    ial.request_data,
    ial.response_data,
    ial.error_message,
    ial.metadata,
    ial.duration_ms,
    ial.created_at
  FROM public.integration_activity_logs ial
  WHERE ial.user_id = user_uuid
    AND (service_filter IS NULL OR ial.service_name = service_filter)
    AND (start_date IS NULL OR ial.created_at >= start_date::timestamp)
    AND (end_date IS NULL OR ial.created_at <= end_date::timestamp)
  ORDER BY ial.created_at DESC;
$$;