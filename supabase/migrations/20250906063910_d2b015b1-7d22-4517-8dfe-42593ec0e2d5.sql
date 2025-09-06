-- Create pricing rules table for auto-generating invoices
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  price_per_unit NUMERIC,
  unit_type TEXT, -- sqft, room, linear_ft, etc.
  currency TEXT DEFAULT 'GBP',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on pricing rules
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own pricing rules
CREATE POLICY "Users can manage their own pricing rules" ON public.pricing_rules
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create invoice analytics table
CREATE TABLE public.invoice_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invoice_id UUID REFERENCES public.construyo_invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created, sent, viewed, paid, failed, etc.
  event_data JSONB DEFAULT '{}',
  payment_provider TEXT, -- stripe, quickbooks, xero
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoice analytics
ALTER TABLE public.invoice_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own analytics
CREATE POLICY "Users can view their own invoice analytics" ON public.invoice_analytics
FOR SELECT USING (auth.uid() = user_id);

-- Create policy for system to insert analytics
CREATE POLICY "System can insert invoice analytics" ON public.invoice_analytics
FOR INSERT WITH CHECK (true);

-- Create payment provider settings table
CREATE TABLE public.payment_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL, -- stripe, quickbooks, xero
  is_active BOOLEAN DEFAULT false,
  encrypted_credentials TEXT, -- encrypted API keys/tokens
  webhook_url TEXT,
  sync_enabled BOOLEAN DEFAULT false,
  zapier_webhook TEXT, -- for Google Sheets sync
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider_type)
);

-- Enable RLS on payment provider settings
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own settings
CREATE POLICY "Users can manage their own payment settings" ON public.payment_provider_settings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_pricing_rules_user_project ON public.pricing_rules(user_id, project_type);
CREATE INDEX idx_invoice_analytics_user_invoice ON public.invoice_analytics(user_id, invoice_id);
CREATE INDEX idx_payment_settings_user_provider ON public.payment_provider_settings(user_id, provider_type);

-- Insert default pricing rules for common project types
INSERT INTO public.pricing_rules (user_id, project_type, base_price, price_per_unit, unit_type, currency) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 'kitchen', 5000, 150, 'sqft', 'GBP'),
  ((SELECT id FROM auth.users LIMIT 1), 'bathroom', 3000, 200, 'sqft', 'GBP'),
  ((SELECT id FROM auth.users LIMIT 1), 'extension', 15000, 100, 'sqft', 'GBP'),
  ((SELECT id FROM auth.users LIMIT 1), 'loft_conversion', 12000, 80, 'sqft', 'GBP'),
  ((SELECT id FROM auth.users LIMIT 1), 'landscaping', 2000, 50, 'sqft', 'GBP')
ON CONFLICT DO NOTHING;