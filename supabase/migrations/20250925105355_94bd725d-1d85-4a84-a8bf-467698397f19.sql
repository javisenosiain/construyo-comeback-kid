-- Create beta_subscribers table for tracking beta signups
CREATE TABLE public.beta_subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public beta signup" ON public.beta_subscribers
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own subscription" ON public.beta_subscribers
FOR SELECT USING (true);

-- Add trigger for timestamps
CREATE TRIGGER update_beta_subscribers_updated_at
BEFORE UPDATE ON public.beta_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();