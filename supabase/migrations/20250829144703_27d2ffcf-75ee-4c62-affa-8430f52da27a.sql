-- Fix security issues: Enable RLS on existing tables and fix function search paths

-- Enable RLS on existing tables that don't have it enabled
ALTER TABLE IF EXISTS public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.external_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Fix function search paths by setting them explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY definer SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
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
$$;