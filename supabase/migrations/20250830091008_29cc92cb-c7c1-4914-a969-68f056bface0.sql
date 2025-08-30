-- Create form_submissions table for detailed tracking and debugging
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES public.lead_capture_forms(id),
  microsite_id UUID REFERENCES public.microsites(id),
  lead_id UUID REFERENCES public.leads(id),
  form_data JSONB NOT NULL DEFAULT '{}',
  encrypted_data TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  submission_status TEXT NOT NULL DEFAULT 'pending',
  zapier_webhook TEXT,
  zapier_status TEXT,
  zapier_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own form submissions" 
ON public.form_submissions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lead_capture_forms 
    WHERE lead_capture_forms.id = form_submissions.form_id 
    AND lead_capture_forms.user_id = auth.uid()
  )
);

CREATE POLICY "Public can insert form submissions" 
ON public.form_submissions FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON public.form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_form_submissions_ip_address ON public.form_submissions(ip_address);

-- Create trigger for updated_at
CREATE TRIGGER update_form_submissions_updated_at
BEFORE UPDATE ON public.form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();