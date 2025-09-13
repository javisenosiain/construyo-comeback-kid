-- Create table for social media post scheduling
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT,
  gallery_id UUID,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'twitter', 'linkedin')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'carousel', 'story')),
  caption TEXT,
  media_urls TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  canva_design_id TEXT,
  buffer_post_id TEXT,
  zapier_workflow_id TEXT,
  engagement_metrics JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own social media posts"
ON public.social_media_posts
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create table for social media analytics
CREATE TABLE public.social_media_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'reach', 'like', 'comment', 'share', 'click', 'save')),
  event_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own social media analytics"
ON public.social_media_analytics
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert social media analytics"
ON public.social_media_analytics
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_social_media_posts_user_id ON public.social_media_posts(user_id);
CREATE INDEX idx_social_media_posts_status ON public.social_media_posts(status);
CREATE INDEX idx_social_media_posts_scheduled_for ON public.social_media_posts(scheduled_for);
CREATE INDEX idx_social_media_analytics_user_id ON public.social_media_analytics(user_id);
CREATE INDEX idx_social_media_analytics_post_id ON public.social_media_analytics(post_id);

-- Create trigger for updated_at
CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create foreign key reference to project_galleries if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_galleries') THEN
    ALTER TABLE public.social_media_posts
    ADD CONSTRAINT fk_social_media_posts_gallery_id
    FOREIGN KEY (gallery_id) REFERENCES public.project_galleries(id);
  END IF;
END $$;