-- Create booking link analytics table for tracking Calendly interactions
CREATE TABLE IF NOT EXISTS public.booking_link_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID,
  event_type TEXT NOT NULL,
  calendly_event_id TEXT,
  calendly_event_uri TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  message_log_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking analytics
ALTER TABLE public.booking_link_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own booking analytics
CREATE POLICY "Users can view their own booking analytics" 
ON public.booking_link_analytics 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow public inserts for webhook data
CREATE POLICY "Public can insert booking analytics" 
ON public.booking_link_analytics 
FOR INSERT 
WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_booking_analytics_user_id ON public.booking_link_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_lead_id ON public.booking_link_analytics(lead_id);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_event_type ON public.booking_link_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_created_at ON public.booking_link_analytics(created_at);