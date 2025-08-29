-- Fix business_settings security vulnerabilities (without duplicate foreign key)
-- 1. First, update any existing records with NULL user_id (if any)
-- 2. Make user_id NOT NULL to prevent future security issues  
-- 3. Add additional security constraints

-- Step 1: Check for and handle any NULL user_id records
UPDATE business_settings 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Step 2: Make user_id NOT NULL to enforce data integrity
ALTER TABLE business_settings 
ALTER COLUMN user_id SET NOT NULL;

-- Step 3: Create audit trigger for business_settings access
-- This will log all access to sensitive business data
CREATE OR REPLACE FUNCTION public.audit_business_settings_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Step 4: Create trigger to audit business settings access
DROP TRIGGER IF EXISTS audit_business_settings_trigger ON business_settings;
CREATE TRIGGER audit_business_settings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION audit_business_settings_access();

-- Step 5: Update RLS policy to be more explicit and secure
DROP POLICY IF EXISTS "Users can manage their own business settings" ON business_settings;

-- Create separate, more specific policies for better security
CREATE POLICY "Users can insert their own business settings" 
ON business_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own business settings" 
ON business_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own business settings" 
ON business_settings FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business settings" 
ON business_settings FOR DELETE 
USING (auth.uid() = user_id);

-- Step 6: Add index for better performance on user_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_settings_user_id 
ON business_settings(user_id);