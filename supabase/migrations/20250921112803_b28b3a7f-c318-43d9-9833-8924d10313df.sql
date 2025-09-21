-- Fix the security definer view issue
-- The problem is likely with the get_microsite_public_data function acting as a security definer view
-- Let's convert it to use proper RLS policies instead

-- First, drop the security definer function
DROP FUNCTION IF EXISTS public.get_microsite_public_data(text);

-- Create a secure RLS policy instead for public microsite access
CREATE POLICY "Public can view active microsites by slug"
ON public.microsites
FOR SELECT
TO public
USING (is_active = true);

-- Grant public read access to microsites table for the specific public view
GRANT SELECT ON public.microsites TO anon;

-- Ensure the microsites_public view does not use security definer
-- by recreating it as a simple view without any security definer properties
DROP VIEW IF EXISTS public.microsites_public;

CREATE VIEW public.microsites_public AS
SELECT 
  id,
  client_name,
  domain_slug,
  jsonb_build_object(
    'clientName', microsite_data->>'clientName',
    'description', microsite_data->>'description',
    'services', microsite_data->'services',
    'styling', microsite_data->'styling',
    'logoUrl', microsite_data->>'logoUrl',
    'calendlyUrl', microsite_data->>'calendlyUrl',
    'showPortfolio', microsite_data->'showPortfolio',
    'portfolioSettings', jsonb_build_object(
      'maxItems', microsite_data->'portfolioSettings'->>'maxItems',
      'showReviews', microsite_data->'portfolioSettings'->>'showReviews',
      'googleReviewUrl', microsite_data->'portfolioSettings'->>'googleReviewUrl',
      'trustpilotReviewUrl', microsite_data->'portfolioSettings'->>'trustpilotReviewUrl'
    ),
    'html', microsite_data->>'html'
  ) as microsite_data,
  is_active,
  created_at
FROM public.microsites
WHERE is_active = true;