-- Fix critical security vulnerability in leads table
-- This addresses the issue where customer personal information could be stolen

-- 1. Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can manage their own leads" ON public.leads;

-- 2. Create more restrictive and secure policies
-- Only allow users to view their own leads
CREATE POLICY "Users can view their own leads only"
ON public.leads
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Only allow users to insert leads for themselves
CREATE POLICY "Users can create leads for themselves only"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Only allow users to update their own leads, and prevent changing customer_id
CREATE POLICY "Users can update their own leads only"
ON public.leads
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- Only allow users to delete their own leads
CREATE POLICY "Users can delete their own leads only"
ON public.leads
FOR DELETE
TO authenticated
USING (customer_id = auth.uid());

-- 3. Add additional security constraints
-- Ensure customer_id cannot be null (prevent orphaned records)
ALTER TABLE public.leads 
ALTER COLUMN customer_id SET NOT NULL;

-- 4. Create function for secure lead access logging
CREATE OR REPLACE FUNCTION public.log_lead_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access to sensitive lead data
  INSERT INTO public.audit_logs (
    user_id,
    table_name,
    action,
    record_id,
    sensitive_fields
  ) VALUES (
    auth.uid(),
    'leads',
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    ARRAY['customer_name', 'email', 'phone', 'address']
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_lead_access ON public.leads;
CREATE TRIGGER audit_lead_access
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_access();

-- 6. Add data validation constraints
-- Ensure email format is valid
ALTER TABLE public.leads 
ADD CONSTRAINT valid_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure phone number format (basic validation)
ALTER TABLE public.leads 
ADD CONSTRAINT valid_phone_format 
CHECK (phone IS NULL OR phone ~ '^[\+]?[\d\s\-\(\)]{7,20}$');

-- 7. Create secure function for lead statistics (no PII exposure)
CREATE OR REPLACE FUNCTION public.get_user_lead_stats(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_leads INTEGER,
  leads_by_status JSONB,
  leads_by_priority JSONB
) AS $$
BEGIN
  -- Verify the user can only access their own stats
  IF user_uuid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Can only view your own lead statistics';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_leads,
    jsonb_object_agg(status, count) as leads_by_status,
    jsonb_object_agg(priority, count) as leads_by_priority
  FROM (
    SELECT 
      COALESCE(status, 'unknown') as status,
      COALESCE(priority, 'medium') as priority,
      COUNT(*) as count
    FROM public.leads 
    WHERE customer_id = user_uuid
    GROUP BY GROUPING SETS ((status), (priority))
  ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Revoke unnecessary permissions
REVOKE ALL ON public.leads FROM anon;
REVOKE ALL ON public.leads FROM public;

-- Grant only necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;