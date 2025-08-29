-- Create core MVP tables for Construyo platform

-- Leads table for lead capture and management
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  project_type TEXT,
  description TEXT,
  location TEXT,
  budget_min DECIMAL,
  budget_max DECIMAL,
  source TEXT, -- 'whatsapp_referral', 'website_form', 'planning_alert', 'manual'
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Users can view their own leads" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);

-- Construyo invoices table
CREATE TABLE public.construyo_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  project_title TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
  due_date DATE,
  sent_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.construyo_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can manage their own invoices" ON public.construyo_invoices
  FOR ALL USING (auth.uid() = user_id);

-- Construyo reviews table
CREATE TABLE public.construyo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.construyo_invoices(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  platform TEXT, -- 'google', 'trustpilot', 'facebook', 'direct'
  status TEXT DEFAULT 'requested', -- 'requested', 'received', 'published'
  request_token TEXT UNIQUE,
  requested_date TIMESTAMPTZ DEFAULT now(),
  received_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.construyo_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews
CREATE POLICY "Users can manage their own reviews" ON public.construyo_reviews
  FOR ALL USING (auth.uid() = user_id);

-- Allow public access to view reviews (for public review links)
CREATE POLICY "Public can view reviews by token" ON public.construyo_reviews
  FOR SELECT USING (request_token IS NOT NULL);

-- Social media posts table
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  platform TEXT NOT NULL, -- 'instagram', 'facebook', 'linkedin'
  post_type TEXT NOT NULL, -- 'before_after', 'progress', 'completion', 'testimonial'
  content TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platform_post_id TEXT,
  engagement_stats JSONB, -- likes, comments, shares, reach
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for social posts
CREATE POLICY "Users can manage their own social posts" ON public.social_posts
  FOR ALL USING (auth.uid() = user_id);

-- Business settings table for user preferences and integrations
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  business_type TEXT,
  license_number TEXT,
  insurance_number TEXT,
  service_areas TEXT[],
  specialties TEXT[],
  default_currency TEXT DEFAULT 'GBP',
  stripe_account_id TEXT,
  whatsapp_number TEXT,
  instagram_connected BOOLEAN DEFAULT false,
  facebook_connected BOOLEAN DEFAULT false,
  automation_settings JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for business settings
CREATE POLICY "Users can manage their own business settings" ON public.business_settings
  FOR ALL USING (auth.uid() = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construyo_invoices_updated_at
  BEFORE UPDATE ON public.construyo_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_construyo_reviews_updated_at
  BEFORE UPDATE ON public.construyo_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;