-- Create microsites table for tracking generated client microsites
CREATE TABLE public.microsites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  domain_slug TEXT NOT NULL UNIQUE,
  microsite_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_id UUID REFERENCES public.lead_capture_forms(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analytics_data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.microsites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own microsites" 
ON public.microsites 
FOR ALL 
USING (user_id = auth.uid());

-- Allow public read access to active microsites (for viewing)
CREATE POLICY "Public can view active microsites" 
ON public.microsites 
FOR SELECT 
USING (is_active = true);

-- Create function to update timestamps
CREATE TRIGGER update_microsites_updated_at
BEFORE UPDATE ON public.microsites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create analytics tracking table
CREATE TABLE public.microsite_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  microsite_id UUID NOT NULL REFERENCES public.microsites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'view', 'form_submission', 'click'
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analytics
ALTER TABLE public.microsite_analytics ENABLE ROW LEVEL SECURITY;

-- Analytics policies
CREATE POLICY "Users can view analytics for their microsites" 
ON public.microsite_analytics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.microsites 
  WHERE microsites.id = microsite_analytics.microsite_id 
  AND microsites.user_id = auth.uid()
));

-- Public can insert analytics events (for tracking)
CREATE POLICY "Public can insert analytics events" 
ON public.microsite_analytics 
FOR INSERT 
WITH CHECK (true);