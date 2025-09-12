-- Create table for storing generated galleries
CREATE TABLE public.project_galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  gallery_type TEXT NOT NULL DEFAULT 'photo', -- 'photo', 'video', 'mixed'
  title TEXT NOT NULL,
  description TEXT,
  media_count INTEGER NOT NULL DEFAULT 0,
  generation_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  gallery_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  ai_provider TEXT, -- 'openai', 'runwayml'
  generation_config JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.project_galleries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own galleries"
ON public.project_galleries
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create table for gallery analytics
CREATE TABLE public.gallery_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gallery_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'download', 'share'
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.gallery_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics
CREATE POLICY "Users can view their own gallery analytics"
ON public.gallery_analytics
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Public can insert gallery analytics"
ON public.gallery_analytics
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_project_galleries_user_project ON public.project_galleries(user_id, project_id);
CREATE INDEX idx_project_galleries_status ON public.project_galleries(generation_status);
CREATE INDEX idx_gallery_analytics_gallery_id ON public.gallery_analytics(gallery_id);

-- Add updated_at trigger
CREATE TRIGGER update_project_galleries_updated_at
  BEFORE UPDATE ON public.project_galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();