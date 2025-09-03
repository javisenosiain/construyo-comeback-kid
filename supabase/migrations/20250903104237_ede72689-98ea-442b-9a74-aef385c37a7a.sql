-- Create message templates table for auto-responder system
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('email', 'whatsapp', 'sms')),
  subject_template TEXT, -- For emails
  message_template TEXT NOT NULL,
  calendly_link_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_conditions JSONB DEFAULT '{}' ::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on message templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for message templates
CREATE POLICY "Users can manage their own message templates" 
ON public.message_templates 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create message delivery logs table
CREATE TABLE public.message_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  template_id UUID REFERENCES public.message_templates(id),
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'whatsapp', 'sms')),
  recipient_email TEXT,
  recipient_phone TEXT,
  message_content TEXT NOT NULL,
  calendly_link TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  external_message_id TEXT, -- ID from messaging service
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  booking_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on message delivery logs
ALTER TABLE public.message_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for message delivery logs
CREATE POLICY "Users can view their own message delivery logs" 
ON public.message_delivery_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert message delivery logs" 
ON public.message_delivery_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own message delivery logs" 
ON public.message_delivery_logs 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create booking link analytics table
CREATE TABLE public.booking_link_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  message_log_id UUID REFERENCES public.message_delivery_logs(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('click', 'booking_started', 'booking_completed')),
  calendly_event_id TEXT,
  calendly_event_uri TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  event_data JSONB DEFAULT '{}' ::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on booking analytics
ALTER TABLE public.booking_link_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for booking analytics
CREATE POLICY "Users can view their own booking analytics" 
ON public.booking_link_analytics 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Public can insert booking analytics" 
ON public.booking_link_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX idx_message_templates_type_active ON public.message_templates(template_type, is_active);
CREATE INDEX idx_message_delivery_logs_user_id ON public.message_delivery_logs(user_id);
CREATE INDEX idx_message_delivery_logs_lead_id ON public.message_delivery_logs(lead_id);
CREATE INDEX idx_message_delivery_logs_status ON public.message_delivery_logs(delivery_status);
CREATE INDEX idx_booking_analytics_user_id ON public.booking_link_analytics(user_id);
CREATE INDEX idx_booking_analytics_lead_id ON public.booking_link_analytics(lead_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_delivery_logs_updated_at
BEFORE UPDATE ON public.message_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default message templates
INSERT INTO public.message_templates (
  user_id, 
  template_name, 
  template_type, 
  subject_template, 
  message_template, 
  calendly_link_template,
  trigger_conditions
) VALUES
(
  gen_random_uuid(), -- This will need to be updated with actual user IDs
  'Welcome & Quote Booking (Email)',
  'email',
  'Your {ProjectType} Project Quote - Let''s Schedule a Call!',
  'Hi {FirstName},

Thank you for your interest in our {ProjectType} services! We''re excited to help bring your project to life.

To provide you with an accurate quote tailored to your specific needs, I''d love to schedule a brief consultation call with you. This will allow us to:

• Understand your project requirements in detail
• Discuss timeline and budget expectations  
• Answer any questions you might have
• Provide you with a personalized quote

Please use the link below to book a convenient time for our call:
{CalendlyLink}

We typically respond to all inquiries within 24 hours and look forward to discussing your {ProjectType} project soon!

Best regards,
The Construyo Team

P.S. Feel free to reply to this email if you have any immediate questions.',
  'https://calendly.com/your-company/consultation',
  '{"trigger_on": ["lead_created", "lead_updated"], "conditions": {"status": "new"}}'
),
(
  gen_random_uuid(),
  'Welcome & Quote Booking (WhatsApp)',
  'whatsapp',
  null,
  'Hi {FirstName}! 👋

Thanks for your interest in our {ProjectType} services! 

To give you the best quote possible, let''s have a quick chat about your project. 

Book a convenient time here: {CalendlyLink}

We''ll discuss:
✅ Your specific requirements
✅ Timeline & budget
✅ Answer your questions

Usually takes 15-20 minutes. Looking forward to helping with your {ProjectType} project! 🏗️',
  'https://calendly.com/your-company/consultation',
  '{"trigger_on": ["lead_created"], "conditions": {"source": "whatsapp"}}'
);