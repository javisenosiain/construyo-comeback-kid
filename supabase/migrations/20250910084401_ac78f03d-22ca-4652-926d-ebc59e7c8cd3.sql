-- Create feedback forms table
CREATE TABLE public.feedback_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  form_name TEXT NOT NULL,
  form_title TEXT NOT NULL DEFAULT 'Project Feedback',
  form_description TEXT,
  rating_label TEXT DEFAULT 'Overall Rating',
  comments_label TEXT DEFAULT 'Comments',
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  is_active BOOLEAN NOT NULL DEFAULT true,
  zapier_webhook TEXT,
  google_sheets_sync BOOLEAN DEFAULT false,
  gdpr_consent_required BOOLEAN DEFAULT true,
  gdpr_consent_text TEXT DEFAULT 'I consent to my data being processed for feedback purposes.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback responses table
CREATE TABLE public.feedback_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.feedback_forms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  gdpr_consent BOOLEAN NOT NULL DEFAULT false,
  submission_ip INET,
  submission_user_agent TEXT,
  response_token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  zapier_synced BOOLEAN DEFAULT false,
  zapier_sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback delivery logs table
CREATE TABLE public.feedback_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.feedback_forms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'whatsapp', 'sms')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'responded')),
  response_token TEXT UNIQUE,
  external_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feedback_forms
CREATE POLICY "Users can manage their own feedback forms" 
ON public.feedback_forms 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create RLS policies for feedback_responses
CREATE POLICY "Users can view their own feedback responses" 
ON public.feedback_responses 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Public can submit feedback with valid token" 
ON public.feedback_responses 
FOR INSERT 
WITH CHECK (
  response_token IS NOT NULL AND 
  expires_at > now() AND
  EXISTS (
    SELECT 1 FROM public.feedback_delivery_logs 
    WHERE response_token = feedback_responses.response_token 
    AND delivery_status IN ('sent', 'delivered')
  )
);

CREATE POLICY "Users can update responses for analytics" 
ON public.feedback_responses 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create RLS policies for feedback_delivery_logs
CREATE POLICY "Users can manage their own feedback delivery logs" 
ON public.feedback_delivery_logs 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_feedback_responses_form_id ON public.feedback_responses(form_id);
CREATE INDEX idx_feedback_responses_project_id ON public.feedback_responses(project_id);
CREATE INDEX idx_feedback_responses_token ON public.feedback_responses(response_token);
CREATE INDEX idx_feedback_delivery_logs_project_id ON public.feedback_delivery_logs(project_id);
CREATE INDEX idx_feedback_delivery_logs_token ON public.feedback_delivery_logs(response_token);
CREATE INDEX idx_feedback_delivery_logs_status ON public.feedback_delivery_logs(delivery_status);

-- Create function to generate secure response tokens
CREATE OR REPLACE FUNCTION public.generate_feedback_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      SELECT 1 FROM public.feedback_delivery_logs WHERE response_token = token
      UNION
      SELECT 1 FROM public.feedback_responses WHERE response_token = token
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Create trigger to auto-generate tokens
CREATE OR REPLACE FUNCTION public.set_feedback_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.response_token IS NULL THEN
    NEW.response_token = public.generate_feedback_token();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_feedback_delivery_token
BEFORE INSERT ON public.feedback_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.set_feedback_token();

-- Create updated_at triggers
CREATE TRIGGER update_feedback_forms_updated_at
BEFORE UPDATE ON public.feedback_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_delivery_logs_updated_at
BEFORE UPDATE ON public.feedback_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();