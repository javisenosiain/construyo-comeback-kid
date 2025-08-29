-- CRITICAL SECURITY FIX: Enable RLS on all tables that were missing it
-- This prevents public access to sensitive customer data

-- Check and fix RLS status for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Check and fix RLS status for customers table  
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Check and fix RLS status for payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Check and fix RLS status for leads table (might already be enabled)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- The profiles table should already have RLS enabled, but let's ensure it
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Additional security: Ensure construyo_invoices has proper RLS
ALTER TABLE public.construyo_invoices ENABLE ROW LEVEL SECURITY;

-- Additional security: Ensure construyo_reviews has proper RLS  
ALTER TABLE public.construyo_reviews ENABLE ROW LEVEL SECURITY;

-- Additional security: Ensure business_settings has proper RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Log this security fix
INSERT INTO public.audit_logs (user_id, table_name, action, record_id, sensitive_fields)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, 
  'security_fix', 
  'ENABLE_RLS_BULK', 
  gen_random_uuid(),
  ARRAY['users', 'customers', 'payments', 'leads', 'profiles', 'construyo_invoices', 'construyo_reviews', 'business_settings']
);