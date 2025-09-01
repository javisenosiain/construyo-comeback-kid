-- CRITICAL SECURITY FIXES FOR DATA PROTECTION

-- 1. Fix leads table RLS policies (CRITICAL DATA LEAK FIX)
DROP POLICY IF EXISTS "Builders can view leads assigned to them" ON public.leads;
DROP POLICY IF EXISTS "Customers can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads they're involved in" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads they're involved in" ON public.leads;

-- Make user_id columns NOT NULL for security (prevent orphaned records)
ALTER TABLE public.leads ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN customer_id SET DEFAULT auth.uid();

-- Create secure RLS policies for leads
CREATE POLICY "Users can manage their own leads" 
ON public.leads 
FOR ALL 
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- 2. Fix user_id constraints across all user-owned tables
ALTER TABLE public.business_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.catalogue_categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.catalogue_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.lead_capture_forms ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.microsites ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.portfolio_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.construyo_invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.construyo_reviews ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.external_reviews ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.quote_requests ALTER COLUMN user_id SET NOT NULL;

-- 3. Secure public catalog data from competitor theft
DROP POLICY IF EXISTS "Public can view active categories" ON public.catalogue_categories;
CREATE POLICY "Authenticated users can view categories" 
ON public.catalogue_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can view job categories" ON public.job_categories;
CREATE POLICY "Authenticated users can view job categories" 
ON public.job_categories 
FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can view job templates" ON public.job_templates;
CREATE POLICY "Authenticated users can view job templates" 
ON public.job_templates 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Add rate limiting constraints for public endpoints
CREATE TABLE IF NOT EXISTS public.submission_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  submissions_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(ip_address, endpoint)
);

ALTER TABLE public.submission_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access to rate limits" 
ON public.submission_rate_limits 
FOR ALL 
USING (false);

-- 5. Enhanced audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  ip_address inet,
  user_agent text,
  table_name text,
  record_id uuid,
  sensitive_data_accessed text[],
  event_data jsonb DEFAULT '{}',
  risk_level text DEFAULT 'low',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can access security events" 
ON public.security_events 
FOR ALL 
USING (false);

-- 6. Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_sensitive_data text[] DEFAULT NULL,
  p_event_data jsonb DEFAULT '{}',
  p_risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 7. Add proper constraints for data validation
ALTER TABLE public.leads ADD CONSTRAINT email_format_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);

ALTER TABLE public.quote_requests ADD CONSTRAINT email_format_check 
CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 8. Fix function search paths for security
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.cleanup_planning_cache() SET search_path = public;