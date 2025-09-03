import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RATE_LIMIT_DELAY = 5000; // 5 seconds for rate limits

interface Lead {
  id: string;
  customer_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  source?: string;
  status: string;
  description?: string;
  budget_range?: string;
}

interface MessageTemplate {
  id: string;
  template_name: string;
  template_type: 'email' | 'whatsapp' | 'sms';
  subject_template?: string;
  message_template: string;
  calendly_link_template: string;
  trigger_conditions: any;
}

interface AutoResponderRequest {
  leadId: string;
  triggerType?: 'lead_created' | 'lead_updated' | 'manual';
  templateId?: string;
  customMessage?: {
    type: 'email' | 'whatsapp' | 'sms';
    subject?: string;
    message: string;
    calendlyLink?: string;
  };
}

/**
 * Sleep function for implementing delays and retry logic
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Replace template variables with actual lead data
 * @param template - Template string with placeholders
 * @param lead - Lead data for replacement
 * @param calendlyLink - Calendly booking link
 * @returns Processed template string
 */
const processTemplate = (template: string, lead: Lead, calendlyLink: string): string => {
  const replacements: Record<string, string> = {
    '{FirstName}': lead.customer_name?.split(' ')[0] || 'there',
    '{LastName}': lead.customer_name?.split(' ').slice(1).join(' ') || '',
    '{FullName}': lead.customer_name || 'Valued Customer',
    '{ProjectType}': lead.project_type || 'construction',
    '{Email}': lead.email || '',
    '{Phone}': lead.phone || '',
    '{BudgetRange}': lead.budget_range || 'to be discussed',
    '{Description}': lead.description || '',
    '{CalendlyLink}': calendlyLink,
    '{LeadId}': lead.id
  };

  let processed = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    processed = processed.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return processed;
};

/**
 * Send email using Resend API with retry logic
 * @param toEmail - Recipient email
 * @param subject - Email subject
 * @param content - Email content
 * @param resend - Resend client instance
 * @param retryCount - Current retry attempt
 * @returns Message ID or null if failed
 */
const sendEmailWithRetry = async (
  toEmail: string,
  subject: string,
  content: string,
  resend: any,
  retryCount = 0
): Promise<string | null> => {
  try {
    console.log(`📧 Sending email to ${toEmail} (attempt ${retryCount + 1})`);
    
    const emailResponse = await resend.emails.send({
      from: "Construyo <noreply@construyo.co.uk>",
      to: [toEmail],
      subject: subject,
      html: content.replace(/\n/g, '<br>')
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    console.log('✅ Email sent successfully:', emailResponse.data?.id);
    return emailResponse.data?.id || 'sent';

  } catch (error) {
    console.error(`❌ Email send error (attempt ${retryCount + 1}):`, error);
    
    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES && 
        (error.message.includes('rate limit') || 
         error.message.includes('timeout') ||
         error.message.includes('network'))) {
      
      const delay = error.message.includes('rate limit') 
        ? RATE_LIMIT_DELAY 
        : INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(`⏳ Retrying email after ${delay}ms...`);
      await sleep(delay);
      return sendEmailWithRetry(toEmail, subject, content, resend, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Send WhatsApp message using respond.io API
 * @param phoneNumber - Recipient phone number
 * @param message - Message content
 * @param retryCount - Current retry attempt
 * @returns Message ID or null if failed
 */
const sendWhatsAppWithRetry = async (
  phoneNumber: string,
  message: string,
  retryCount = 0
): Promise<string | null> => {
  try {
    console.log(`📱 Sending WhatsApp to ${phoneNumber} (attempt ${retryCount + 1})`);
    
    const respondIoApiKey = Deno.env.get('RESPOND_IO_API_KEY');
    if (!respondIoApiKey) {
      throw new Error('RESPOND_IO_API_KEY not configured');
    }

    const response = await fetch('https://api.respond.io/v2/contact/phone:' + phoneNumber + '/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${respondIoApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          type: 'text',
          text: message
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ WhatsApp sent successfully:', result.messageId);
    return result.messageId || 'sent';

  } catch (error) {
    console.error(`❌ WhatsApp send error (attempt ${retryCount + 1}):`, error);
    
    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES && 
        (error.message.includes('rate limit') || 
         error.message.includes('timeout') ||
         error.message.includes('network'))) {
      
      const delay = error.message.includes('rate limit') 
        ? RATE_LIMIT_DELAY 
        : INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      
      console.log(`⏳ Retrying WhatsApp after ${delay}ms...`);
      await sleep(delay);
      return sendWhatsAppWithRetry(phoneNumber, message, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Log message delivery to database
 * @param supabase - Supabase client
 * @param logData - Message delivery log data
 */
const logMessageDelivery = async (supabase: any, logData: any): Promise<void> => {
  try {
    const { error } = await supabase
      .from('message_delivery_logs')
      .insert(logData);
    
    if (error) {
      console.error('❌ Failed to log message delivery:', error);
    } else {
      console.log('📝 Message delivery logged successfully');
    }
  } catch (error) {
    console.error('❌ Database logging error:', error);
  }
};

/**
 * Get appropriate message template based on lead and trigger conditions
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param lead - Lead data
 * @param triggerType - Type of trigger event
 * @param templateId - Specific template ID (optional)
 * @returns Message template or null
 */
const getMessageTemplate = async (
  supabase: any,
  userId: string,
  lead: Lead,
  triggerType: string,
  templateId?: string
): Promise<MessageTemplate | null> => {
  try {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (templateId) {
      query = query.eq('id', templateId);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch templates:', error);
      return null;
    }

    if (!templates || templates.length === 0) {
      console.log('⚠️ No active templates found');
      return null;
    }

    // If specific template requested, return it
    if (templateId && templates.length > 0) {
      return templates[0];
    }

    // Find matching template based on trigger conditions
    for (const template of templates) {
      const conditions = template.trigger_conditions || {};
      
      // Check if template matches trigger type
      if (conditions.trigger_on && conditions.trigger_on.includes(triggerType)) {
        // Check additional conditions
        if (conditions.conditions) {
          let matches = true;
          
          for (const [key, value] of Object.entries(conditions.conditions)) {
            if (lead[key as keyof Lead] !== value) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            return template;
          }
        } else {
          return template; // No additional conditions, trigger type match is enough
        }
      }
    }

    // Fallback to first active template
    return templates[0];
  } catch (error) {
    console.error('❌ Error fetching template:', error);
    return null;
  }
};

/**
 * Main auto-responder function
 * Sample call: { "leadId": "lead456", "triggerType": "lead_created" }
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const requestBody: AutoResponderRequest = await req.json();
    const { leadId, triggerType = 'manual', templateId, customMessage } = requestBody;

    console.log('🚀 Auto-responder triggered:', { leadId, triggerType, templateId });

    // Validate required parameters
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ Lead not found:', leadError);
      return new Response(
        JSON.stringify({ error: 'Lead not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📋 Processing lead: ${lead.customer_name} (${lead.email})`);

    let messageType: 'email' | 'whatsapp' | 'sms';
    let subject: string = '';
    let message: string;
    let calendlyLink: string;
    let templateUsed: MessageTemplate | null = null;

    if (customMessage) {
      // Use custom message
      messageType = customMessage.type;
      subject = customMessage.subject || '';
      message = customMessage.message;
      calendlyLink = customMessage.calendlyLink || 'https://calendly.com/your-company/consultation';
    } else {
      // Get appropriate template
      templateUsed = await getMessageTemplate(supabase, lead.customer_id, lead, triggerType, templateId);
      
      if (!templateUsed) {
        console.error('❌ No suitable template found');
        return new Response(
          JSON.stringify({ error: 'No suitable template found' }), 
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      messageType = templateUsed.template_type;
      calendlyLink = templateUsed.calendly_link_template;
      
      // Process templates with lead data
      if (templateUsed.subject_template) {
        subject = processTemplate(templateUsed.subject_template, lead, calendlyLink);
      }
      message = processTemplate(templateUsed.message_template, lead, calendlyLink);
    }

    console.log(`📤 Sending ${messageType} message to ${lead.customer_name}`);

    // Initialize messaging services
    let externalMessageId: string | null = null;
    let deliveryStatus = 'failed';
    let errorMessage: string | null = null;

    try {
      if (messageType === 'email') {
        if (!lead.email) {
          throw new Error('Lead has no email address');
        }

        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        externalMessageId = await sendEmailWithRetry(lead.email, subject, message, resend);
        deliveryStatus = 'sent';

      } else if (messageType === 'whatsapp') {
        if (!lead.phone) {
          throw new Error('Lead has no phone number');
        }

        externalMessageId = await sendWhatsAppWithRetry(lead.phone, message);
        deliveryStatus = 'sent';

      } else if (messageType === 'sms') {
        // SMS implementation would go here
        throw new Error('SMS functionality not yet implemented');
      }

    } catch (error) {
      console.error('❌ Message sending failed:', error);
      errorMessage = error.message;
      deliveryStatus = 'failed';
    }

    // Log message delivery
    await logMessageDelivery(supabase, {
      user_id: lead.customer_id,
      lead_id: leadId,
      template_id: templateUsed?.id || null,
      message_type: messageType,
      recipient_email: messageType === 'email' ? lead.email : null,
      recipient_phone: messageType === 'whatsapp' ? lead.phone : null,
      message_content: message,
      calendly_link: calendlyLink,
      delivery_status: deliveryStatus,
      external_message_id: externalMessageId,
      error_message: errorMessage,
      sent_at: deliveryStatus === 'sent' ? new Date().toISOString() : null
    });

    const response = {
      success: deliveryStatus === 'sent',
      leadId,
      messageType,
      deliveryStatus,
      externalMessageId,
      errorMessage,
      templateUsed: templateUsed?.template_name || 'Custom Message',
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Auto-responder completed:`, response);

    return new Response(
      JSON.stringify(response), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Auto-responder error:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(errorResponse), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});