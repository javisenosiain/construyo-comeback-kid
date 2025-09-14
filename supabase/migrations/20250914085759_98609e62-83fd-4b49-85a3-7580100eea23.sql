-- Create table for video generation requests and storage
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  video_type TEXT NOT NULL DEFAULT 'before_after', -- before_after, testimonial, progress
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  before_image_url TEXT,
  after_image_url TEXT,
  testimonial_text TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  runwayml_task_id TEXT,
  duration INTEGER, -- in seconds
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own video generations"
ON public.video_generations
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create analytics table for video generation
CREATE TABLE public.video_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_generation_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- generation_started, generation_completed, video_viewed, video_shared
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for analytics
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics
CREATE POLICY "Users can view their own video analytics"
ON public.video_analytics
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Public can insert video analytics"
ON public.video_analytics
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX idx_video_generations_status ON public.video_generations(status);
CREATE INDEX idx_video_generations_project_id ON public.video_generations(project_id);
CREATE INDEX idx_video_analytics_video_generation_id ON public.video_analytics(video_generation_id);
CREATE INDEX idx_video_analytics_event_type ON public.video_analytics(event_type);

-- Create trigger for updated_at
CREATE TRIGGER update_video_generations_updated_at
  BEFORE UPDATE ON public.video_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();