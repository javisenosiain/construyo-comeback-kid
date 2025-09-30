-- Restrict public view privileges to SELECT only (correct syntax)
REVOKE ALL ON public.microsites_public FROM anon, authenticated;
GRANT SELECT ON public.microsites_public TO anon, authenticated;

-- Document the intent of the view
COMMENT ON VIEW public.microsites_public IS 'Public read-only view exposing only active microsites. SELECT-only for anon/authenticated; no write permissions.';