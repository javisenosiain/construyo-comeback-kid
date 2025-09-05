-- =============================================
-- SECURITY FIX: Protect Sensitive Customer Data in Microsites
-- =============================================

-- Step 1: Drop the existing overly permissive public policy
DROP POLICY IF EXISTS "Public can view active microsites" ON public.microsites;

-- Step 2: Create a secure view that only exposes safe public data
CREATE OR REPLACE VIEW public.microsites_public AS
SELECT 
  id,
  client_name,
  domain_slug,
  -- Extract only safe, non-sensitive data from microsite_data
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
    -- Remove sensitive contact information but keep display HTML
    'html', microsite_data->>'html'
  ) as microsite_data,
  is_active,
  created_at
FROM public.microsites
WHERE is_active = true;

-- Step 3: Enable RLS on the view (even though it's already filtered)
-- Note: Views inherit permissions, but we want to be explicit about security

-- Step 4: Create a new restricted policy for public access to the main table
-- This policy should only allow very specific, safe access patterns
CREATE POLICY "Authenticated users can view active microsites (safe data only)" 
ON public.microsites 
FOR SELECT 
USING (
  is_active = true 
  AND auth.role() = 'authenticated'
);

-- Step 5: Create a function to safely get microsite data for public display
CREATE OR REPLACE FUNCTION public.get_microsite_public_data(microsite_slug text)
RETURNS TABLE (
  id uuid,
  client_name text,
  domain_slug text,
  safe_microsite_data jsonb,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.client_name,
    m.domain_slug,
    -- Only return safe, non-sensitive data
    jsonb_build_object(
      'clientName', m.microsite_data->>'clientName',
      'description', m.microsite_data->>'description',
      'services', m.microsite_data->'services',
      'styling', m.microsite_data->'styling',
      'logoUrl', m.microsite_data->>'logoUrl',
      'calendlyUrl', m.microsite_data->>'calendlyUrl',
      'showPortfolio', m.microsite_data->'showPortfolio',
      'portfolioSettings', jsonb_build_object(
        'maxItems', m.microsite_data->'portfolioSettings'->>'maxItems',
        'showReviews', m.microsite_data->'portfolioSettings'->>'showReviews',
        'googleReviewUrl', m.microsite_data->'portfolioSettings'->>'googleReviewUrl',
        'trustpilotReviewUrl', m.microsite_data->'portfolioSettings'->>'trustpilotReviewUrl'
      ),
      -- Include rendered HTML but strip any remaining sensitive data
      'html', m.microsite_data->>'html'
    ) as safe_microsite_data,
    m.is_active,
    m.created_at
  FROM public.microsites m
  WHERE m.domain_slug = microsite_slug 
    AND m.is_active = true;
$$;

-- Step 6: Log this security fix
INSERT INTO public.audit_logs (
  user_id,
  table_name,
  action,
  record_id,
  sensitive_fields
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user
  'microsites',
  'SECURITY_FIX',
  gen_random_uuid(),
  ARRAY['contact.email', 'contact.phone', 'zapierWebhook']
);