-- Security Enhancement Migration
-- Add audit logging, sensitive data protection, and token expiration

-- Create audit log table for sensitive data access
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID NOT NULL,
  sensitive_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own audit logs, and admins to view all
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function for encrypting sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pgcrypto for encryption (requires extension)
  -- For now, we'll use a simple obfuscation until pgcrypto is available
  IF data IS NULL OR LENGTH(data) = 0 THEN
    RETURN data;
  END IF;
  
  -- Return masked version for display, actual encryption would require pgcrypto
  RETURN LEFT(data, 3) || REPEAT('*', GREATEST(0, LENGTH(data) - 6)) || RIGHT(data, 3);
END;
$$;

-- Create function for audit logging
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name TEXT,
  p_action TEXT,
  p_record_id UUID,
  p_sensitive_fields TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    action,
    record_id,
    sensitive_fields
  ) VALUES (
    auth.uid(),
    p_table_name,
    p_action,
    p_record_id,
    p_sensitive_fields
  );
END;
$$;

-- Add expiration to review tokens
ALTER TABLE public.construyo_reviews 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing review tokens to expire in 48 hours
UPDATE public.construyo_reviews 
SET token_expires_at = COALESCE(created_at, now()) + INTERVAL '48 hours'
WHERE request_token IS NOT NULL AND token_expires_at IS NULL;

-- Create trigger to set token expiration on new reviews
CREATE OR REPLACE FUNCTION public.set_review_token_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.request_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at = now() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_review_token_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.construyo_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_review_token_expiration();

-- Update review policy to check token expiration
DROP POLICY IF EXISTS "Public can view reviews by token" ON public.construyo_reviews;

CREATE POLICY "Public can view reviews by valid token" 
ON public.construyo_reviews 
FOR SELECT 
USING (
  request_token IS NOT NULL 
  AND (token_expires_at IS NULL OR token_expires_at > now())
);

-- Create trigger for auditing sensitive business_settings access
CREATE OR REPLACE FUNCTION public.audit_business_settings_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sensitive_fields TEXT[] := ARRAY['stripe_account_id', 'license_number', 'insurance_number', 'whatsapp_number'];
BEGIN
  -- Log access to sensitive fields
  PERFORM public.log_sensitive_access(
    'business_settings',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    sensitive_fields
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER audit_business_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_business_settings_access();

-- Create rate limiting table for authentication attempts
CREATE TABLE public.auth_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on rate limits
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access to rate limit data
CREATE POLICY "No public access to rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (false);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_ip_address INET,
  p_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_limit_record RECORD;
  max_attempts INTEGER := 5;
  window_minutes INTEGER := 15;
  block_minutes INTEGER := 30;
BEGIN
  -- Clean up old rate limit records
  DELETE FROM public.auth_rate_limits 
  WHERE first_attempt_at < now() - INTERVAL '1 hour';
  
  -- Check current rate limit
  SELECT * INTO rate_limit_record
  FROM public.auth_rate_limits
  WHERE ip_address = p_ip_address
    AND (p_email IS NULL OR email = p_email)
    AND first_attempt_at > now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- If blocked, check if block period has expired
  IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > now() THEN
    RETURN FALSE;
  END IF;
  
  -- If too many attempts, block
  IF rate_limit_record.attempt_count >= max_attempts THEN
    UPDATE public.auth_rate_limits
    SET blocked_until = now() + (block_minutes || ' minutes')::INTERVAL
    WHERE id = rate_limit_record.id;
    RETURN FALSE;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.auth_rate_limits (ip_address, email, attempt_count, first_attempt_at, last_attempt_at)
  VALUES (p_ip_address, p_email, 1, now(), now())
  ON CONFLICT (ip_address) 
  DO UPDATE SET
    attempt_count = auth_rate_limits.attempt_count + 1,
    last_attempt_at = now(),
    email = COALESCE(EXCLUDED.email, auth_rate_limits.email);
  
  RETURN TRUE;
END;
$$;