-- Create discount rules table
CREATE TABLE public.discount_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('referral', 'repeat_client', 'volume', 'seasonal', 'custom')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  max_usage INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount applications table
CREATE TABLE public.discount_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  discount_rule_id UUID NOT NULL REFERENCES public.discount_rules(id) ON DELETE CASCADE,
  original_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  client_notified_at TIMESTAMP WITH TIME ZONE,
  notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
  notification_channel TEXT CHECK (notification_channel IN ('email', 'whatsapp', 'both')),
  client_response JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for discount_rules
CREATE POLICY "Users can manage their own discount rules" ON public.discount_rules
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for discount_applications
CREATE POLICY "Users can manage their own discount applications" ON public.discount_applications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_discount_rules_user_id ON public.discount_rules(user_id);
CREATE INDEX idx_discount_rules_active ON public.discount_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_discount_applications_user_id ON public.discount_applications(user_id);
CREATE INDEX idx_discount_applications_invoice_id ON public.discount_applications(invoice_id);

-- Create updated_at trigger for discount_rules
CREATE TRIGGER update_discount_rules_updated_at
  BEFORE UPDATE ON public.discount_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default discount rules
INSERT INTO public.discount_rules (user_id, rule_name, rule_type, discount_type, discount_value, conditions, max_usage) VALUES
  (auth.uid(), 'Referral Discount', 'referral', 'percentage', 10.00, '{"min_amount": 100}', 100),
  (auth.uid(), 'Repeat Client Discount', 'repeat_client', 'percentage', 5.00, '{"min_previous_orders": 2}', NULL),
  (auth.uid(), 'Volume Discount', 'volume', 'percentage', 15.00, '{"min_amount": 5000}', NULL)
ON CONFLICT DO NOTHING;