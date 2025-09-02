-- Security Hardening Migration: Fix user_id constraints and enhance RLS policies

-- 1. Make user_id NOT NULL and add proper defaults for critical tables
ALTER TABLE public.automation_rules 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.builders 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.customers 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.customer_interactions 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Update all database functions to use secure search_path
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_table_name text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid, p_sensitive_data text[] DEFAULT NULL::text[], p_event_data jsonb DEFAULT '{}'::jsonb, p_risk_level text DEFAULT 'low'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    table_name,
    record_id,
    sensitive_data_accessed,
    event_data,
    risk_level
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_table_name,
    p_record_id,
    p_sensitive_data,
    p_event_data,
    p_risk_level
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get the next sequence number for this user
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.construyo_invoices
  WHERE user_id = auth.uid();
  
  -- Format as INV-001, INV-002, etc.
  formatted_number := 'INV-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN formatted_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(p_ip_address inet, p_email text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Use simple obfuscation for now
  IF data IS NULL OR LENGTH(data) = 0 THEN
    RETURN data;
  END IF;
  
  -- Return masked version for display
  RETURN LEFT(data, 3) || REPEAT('*', GREATEST(0, LENGTH(data) - 6)) || RIGHT(data, 3);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_review_token_expiration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.request_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at = now() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_sensitive_access(p_table_name text, p_action text, p_record_id uuid, p_sensitive_fields text[] DEFAULT NULL::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    
    -- Remove any potentially confusing characters
    code := replace(code, '0', 'A');
    code := replace(code, 'O', 'B');
    code := replace(code, 'I', 'C');
    code := replace(code, 'L', 'D');
    code := replace(code, '1', 'E');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_planning_cache()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete cache entries older than 48 hours (double the cache duration for safety)
  DELETE FROM public.planning_api_cache 
  WHERE timestamp < now() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$function$;

-- 3. Create enhanced security event logging function
CREATE OR REPLACE FUNCTION public.log_enhanced_security_event(
  p_event_type text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    table_name,
    record_id,
    event_data,
    risk_level,
    created_at
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_table_name,
    p_record_id,
    jsonb_build_object(
      'ip_address', p_ip_address,
      'user_agent', p_user_agent,
      'event_data', p_event_data
    ),
    p_risk_level,
    now()
  );
END;
$function$;

-- 4. Create rate limiting function for public endpoints
CREATE OR REPLACE FUNCTION public.check_endpoint_rate_limit(
  p_endpoint text,
  p_ip_address inet,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  request_count integer;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM public.security_events
  WHERE event_type = 'endpoint_access'
    AND event_data->>'endpoint' = p_endpoint
    AND event_data->>'ip_address' = p_ip_address::text
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;
  
  -- Log this access attempt
  PERFORM public.log_enhanced_security_event(
    'endpoint_access',
    p_ip_address,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('endpoint', p_endpoint, 'request_count', request_count + 1),
    CASE WHEN request_count >= p_max_requests THEN 'high' ELSE 'low' END
  );
  
  -- Return false if rate limit exceeded
  RETURN request_count < p_max_requests;
END;
$function$;

-- 5. Create audit function for profile access (if not exists)
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  sensitive_fields TEXT[] := ARRAY['email', 'phone', 'license_number'];
BEGIN
  -- Log access to sensitive profile fields
  PERFORM public.log_sensitive_access(
    'profiles',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    sensitive_fields
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;