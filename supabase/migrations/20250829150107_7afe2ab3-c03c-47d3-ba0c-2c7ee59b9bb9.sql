-- Security Enhancement Migration (Fixed)
-- Add audit logging, sensitive data protection, and token expiration

-- Add missing columns to existing audit_logs table if they don't exist
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS sensitive_fields TEXT[],
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create function for encrypting sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use simple obfuscation for now
  IF data IS NULL OR LENGTH(data) = 0 THEN
    RETURN data;
  END IF;
  
  -- Return masked version for display
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

DROP TRIGGER IF EXISTS set_review_token_expiration_trigger ON public.construyo_reviews;
CREATE TRIGGER set_review_token_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.construyo_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_review_token_expiration();

-- Update review policy to check token expiration
DROP POLICY IF EXISTS "Public can view reviews by token" ON public.construyo_reviews;
DROP POLICY IF EXISTS "Public can view reviews by valid token" ON public.construyo_reviews;

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

DROP TRIGGER IF EXISTS audit_business_settings_trigger ON public.business_settings;
CREATE TRIGGER audit_business_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_business_settings_access();