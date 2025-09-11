-- Create resolution tracking table for negative feedback diversion
CREATE TABLE public.feedback_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_response_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  resolution_notes TEXT,
  resolution_token TEXT UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT NOT NULL,
  external_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_resolutions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own feedback resolutions"
ON public.feedback_resolutions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public can access with valid token
CREATE POLICY "Public can access resolutions with valid token"
ON public.feedback_resolutions
FOR SELECT
USING (resolution_token IS NOT NULL AND token_expires_at > now());

-- Create function to generate resolution token
CREATE OR REPLACE FUNCTION public.generate_resolution_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a secure 32-character token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.feedback_resolutions WHERE resolution_token = token
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Create trigger to auto-generate resolution token
CREATE OR REPLACE FUNCTION public.set_resolution_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.resolution_token IS NULL THEN
    NEW.resolution_token = public.generate_resolution_token();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_resolution_token_trigger
  BEFORE INSERT ON public.feedback_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_resolution_token();

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_resolutions_updated_at
  BEFORE UPDATE ON public.feedback_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_feedback_resolutions_user_id ON public.feedback_resolutions(user_id);
CREATE INDEX idx_feedback_resolutions_project_id ON public.feedback_resolutions(project_id);
CREATE INDEX idx_feedback_resolutions_token ON public.feedback_resolutions(resolution_token);
CREATE INDEX idx_feedback_resolutions_status ON public.feedback_resolutions(resolution_status);
CREATE INDEX idx_feedback_resolutions_feedback_response_id ON public.feedback_resolutions(feedback_response_id);