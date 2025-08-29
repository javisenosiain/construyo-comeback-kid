-- Create referral_codes table for tracking referral links
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  referral_message TEXT,
  whatsapp_template TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create referral_clicks table for tracking
CREATE TABLE public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL
);

-- Create lead_capture_forms table for embeddable forms
CREATE TABLE public.lead_capture_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_title TEXT DEFAULT 'Get a Free Quote',
  form_description TEXT,
  fields JSONB DEFAULT '[]'::jsonb, -- Custom form fields configuration
  redirect_url TEXT,
  thank_you_message TEXT DEFAULT 'Thank you! We''ll be in touch soon.',
  embed_code TEXT, -- Generated embed code
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation_rules table for CRM automation
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'new_lead', 'invoice_paid', 'project_completed', etc.
  conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb, -- Array of actions to perform
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customer_interactions table for tracking all touchpoints
CREATE TABLE public.customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'email', 'whatsapp', 'call', 'meeting', etc.
  subject TEXT,
  content TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  automation_rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add additional fields to existing leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.lead_capture_forms(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS on new tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_capture_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for referral_codes
CREATE POLICY "Users can manage their own referral codes"
  ON public.referral_codes
  FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for referral_clicks
CREATE POLICY "Users can view their referral clicks"
  ON public.referral_clicks
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.referral_codes 
    WHERE id = referral_clicks.referral_code_id 
    AND user_id = auth.uid()
  ));

CREATE POLICY "Public can create referral clicks"
  ON public.referral_clicks
  FOR INSERT
  WITH CHECK (true);

-- Create RLS policies for lead_capture_forms
CREATE POLICY "Users can manage their own forms"
  ON public.lead_capture_forms
  FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for automation_rules
CREATE POLICY "Users can manage their own automation rules"
  ON public.automation_rules
  FOR ALL
  USING (user_id = auth.uid());

-- Create RLS policies for customer_interactions
CREATE POLICY "Users can manage their own customer interactions"
  ON public.customer_interactions
  FOR ALL
  USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_capture_forms_updated_at
  BEFORE UPDATE ON public.lead_capture_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;