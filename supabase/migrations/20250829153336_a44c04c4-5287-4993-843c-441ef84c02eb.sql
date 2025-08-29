-- Create planning API cache table for 24-hour caching
CREATE TABLE public.planning_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  query TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast cache lookups
CREATE INDEX idx_planning_cache_key ON public.planning_api_cache(cache_key);
CREATE INDEX idx_planning_cache_timestamp ON public.planning_api_cache(timestamp);

-- Enable RLS (this is a system table, accessible only via edge functions)
ALTER TABLE public.planning_api_cache ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role key can access
CREATE POLICY "No public access to planning cache"
  ON public.planning_api_cache
  FOR ALL
  USING (false);

-- Create function to clean up old cache entries (run this as a scheduled job)
CREATE OR REPLACE FUNCTION public.cleanup_planning_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete cache entries older than 48 hours (double the cache duration for safety)
  DELETE FROM public.planning_api_cache 
  WHERE timestamp < now() - INTERVAL '48 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;