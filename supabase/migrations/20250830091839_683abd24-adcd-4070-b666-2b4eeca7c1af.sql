-- Create WhatsApp contacts table for duplicate handling and merging
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_sent_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique phone per user
  UNIQUE(user_id, phone)
);

-- Create WhatsApp referral logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.whatsapp_referral_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  activity_type TEXT NOT NULL, -- 'sent', 'delivered', 'read', 'clicked', 'converted'
  message_id TEXT,
  referral_link TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add WhatsApp-specific fields to referral_codes table
ALTER TABLE public.referral_codes 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS target_microsite_id UUID REFERENCES public.microsites(id),
ADD COLUMN IF NOT EXISTS reward_description TEXT,
ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_referral_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_contacts
CREATE POLICY "Users can manage their own WhatsApp contacts" 
ON public.whatsapp_contacts FOR ALL 
USING (user_id = auth.uid());

-- Create policies for whatsapp_referral_logs  
CREATE POLICY "Users can view their campaign referral logs" 
ON public.whatsapp_referral_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.referral_codes 
    WHERE referral_codes.id = whatsapp_referral_logs.campaign_id 
    AND referral_codes.user_id = auth.uid()
  )
);

CREATE POLICY "Public can insert referral logs" 
ON public.whatsapp_referral_logs FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_phone ON public.whatsapp_contacts(user_id, phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_email ON public.whatsapp_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_referral_logs_campaign ON public.whatsapp_referral_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_referral_logs_phone ON public.whatsapp_referral_logs(contact_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_referral_logs_sent_at ON public.whatsapp_referral_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_referral_codes_target_microsite ON public.referral_codes(target_microsite_id) WHERE target_microsite_id IS NOT NULL;