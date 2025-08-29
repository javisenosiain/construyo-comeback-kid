-- Fix function search path security issues
-- Add SET search_path = 'public' to all functions for security

-- Fix encrypt_sensitive_data function
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name TEXT,
  p_action TEXT,
  p_record_id UUID,
  p_sensitive_fields TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix set_review_token_expiration function
CREATE OR REPLACE FUNCTION public.set_review_token_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.request_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at = now() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix audit_business_settings_access function
CREATE OR REPLACE FUNCTION public.audit_business_settings_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix existing functions that also need search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$;