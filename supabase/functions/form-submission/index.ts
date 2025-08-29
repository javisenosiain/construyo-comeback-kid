import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormSubmissionPayload {
  formId: string;
  micrositeId?: string;
  formData: Record<string, string>;
  encryptedData?: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  zapierWebhook?: string;
}

interface FormSubmissionResult {
  submissionId: string;
  leadId: string;
  success: boolean;
  zapierSuccess?: boolean;
  errors?: string[];
}

/**
 * Enhanced Form Submission Handler
 * 
 * Features:
 * - Comprehensive input validation
 * - Data encryption and secure storage
 * - Construyo CRM integration
 * - Zapier webhook integration for external CRMs
 * - Audit logging and debugging
 * - Rate limiting and spam protection
 * - Real-time analytics tracking
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload: FormSubmissionPayload = await req.json();
    console.log('Processing form submission:', { 
      formId: payload.formId, 
      timestamp: payload.timestamp,
      hasZapier: !!payload.zapierWebhook 
    });

    // Validate required fields
    const validationErrors = validateSubmission(payload);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        errors: validationErrors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitCheck = await checkRateLimit(supabase, clientIP);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        success: false,
        errors: ['Too many submissions. Please try again later.']
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the submission
    const result = await processFormSubmission(supabase, payload, clientIP);

    // Log successful submission
    console.log('Form submission processed successfully:', {
      submissionId: result.submissionId,
      leadId: result.leadId,
      zapierSuccess: result.zapierSuccess
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Form submission error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      errors: ['Internal server error. Please try again.']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Validates form submission payload
 */
function validateSubmission(payload: FormSubmissionPayload): string[] {
  const errors: string[] = [];

  if (!payload.formId) {
    errors.push('Form ID is required');
  }

  if (!payload.formData || Object.keys(payload.formData).length === 0) {
    errors.push('Form data is required');
  }

  if (!payload.timestamp) {
    errors.push('Timestamp is required');
  }

  // Validate email format if present
  if (payload.formData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.formData.email)) {
      errors.push('Invalid email format');
    }
  }

  // Validate phone format if present
  if (payload.formData.phone) {
    const cleanPhone = payload.formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push('Invalid phone number format');
    }
  }

  // Validate required fields based on common patterns
  if (!payload.formData.name && !payload.formData.customer_name) {
    errors.push('Name is required');
  }

  return errors;
}

/**
 * Rate limiting to prevent spam
 */
async function checkRateLimit(supabase: any, clientIP: string): Promise<{ allowed: boolean; remaining?: number }> {
  try {
    // Check submissions from this IP in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('ip_address', clientIP)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true }; // Allow on error to not block legitimate users
    }

    const submissionCount = data?.length || 0;
    const maxSubmissions = 10; // Max 10 submissions per hour per IP

    return {
      allowed: submissionCount < maxSubmissions,
      remaining: Math.max(0, maxSubmissions - submissionCount)
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true };
  }
}

/**
 * Encrypts sensitive data for storage
 */
function encryptSensitiveData(data: Record<string, string>): string {
  try {
    // In production, use proper encryption libraries like libsodium
    // For now, using base64 encoding as a placeholder
    const sensitiveFields = ['email', 'phone', 'address'];
    const sensitiveData: Record<string, string> = {};
    
    sensitiveFields.forEach(field => {
      if (data[field]) {
        sensitiveData[field] = data[field];
      }
    });

    return btoa(JSON.stringify(sensitiveData));
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

/**
 * Processes the form submission and stores in CRM
 */
async function processFormSubmission(
  supabase: any, 
  payload: FormSubmissionPayload, 
  clientIP: string
): Promise<FormSubmissionResult> {
  const errors: string[] = [];
  let zapierSuccess = false;

  // 1. Create lead record in Construyo CRM
  const leadData = {
    customer_name: payload.formData.name || payload.formData.customer_name,
    email: payload.formData.email,
    phone: payload.formData.phone,
    project_type: payload.formData.project || payload.formData.project_type,
    description: payload.formData.message || payload.formData.description,
    timeline: payload.formData.timeline,
    budget_range: payload.formData.budget || payload.formData.budget_range,
    address: payload.formData.address,
    source: 'microsite_form',
    form_id: payload.formId,
    status: 'new',
    notes: `Form submission from ${payload.referrer || 'unknown'} at ${payload.timestamp}`,
    created_at: new Date().toISOString()
  };

  const { data: leadResult, error: leadError } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();

  if (leadError) {
    console.error('Lead creation error:', leadError);
    errors.push('Failed to create lead record');
    throw new Error('Lead creation failed');
  }

  const leadId = leadResult.id;

  // 2. Create detailed form submission record
  const submissionData = {
    form_id: payload.formId,
    microsite_id: payload.micrositeId,
    lead_id: leadId,
    form_data: payload.formData,
    encrypted_data: encryptSensitiveData(payload.formData),
    ip_address: clientIP,
    user_agent: payload.userAgent,
    referrer: payload.referrer,
    submission_status: 'completed',
    zapier_webhook: payload.zapierWebhook,
    created_at: new Date().toISOString()
  };

  const { data: submissionResult, error: submissionError } = await supabase
    .from('form_submissions')
    .insert([submissionData])
    .select()
    .single();

  if (submissionError) {
    console.error('Submission record error:', submissionError);
    errors.push('Failed to create submission record');
  }

  const submissionId = submissionResult?.id || 'unknown';

  // 3. Handle Zapier integration for external CRM sync
  if (payload.zapierWebhook) {
    try {
      zapierSuccess = await sendToZapier(payload.zapierWebhook, {
        ...payload.formData,
        leadId,
        submissionId,
        timestamp: payload.timestamp,
        source: 'construyo-microsite',
        formId: payload.formId
      });

      // Update submission record with Zapier status
      await supabase
        .from('form_submissions')
        .update({ 
          zapier_status: zapierSuccess ? 'success' : 'failed',
          zapier_sent_at: new Date().toISOString()
        })
        .eq('id', submissionId);

    } catch (zapierError) {
      console.error('Zapier integration error:', zapierError);
      zapierSuccess = false;
    }
  }

  // 4. Track analytics
  if (payload.micrositeId) {
    await trackFormSubmissionAnalytics(supabase, {
      micrositeId: payload.micrositeId,
      formId: payload.formId,
      leadId,
      submissionId,
      clientIP,
      userAgent: payload.userAgent,
      referrer: payload.referrer
    });
  }

  return {
    submissionId,
    leadId,
    success: true,
    zapierSuccess,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Sends form data to Zapier webhook
 */
async function sendToZapier(webhookUrl: string, data: Record<string, any>): Promise<boolean> {
  try {
    console.log('Sending data to Zapier webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      console.log('Zapier webhook successful');
      return true;
    } else {
      console.error('Zapier webhook failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Zapier webhook error:', error);
    return false;
  }
}

/**
 * Tracks form submission analytics
 */
async function trackFormSubmissionAnalytics(
  supabase: any, 
  analyticsData: {
    micrositeId: string;
    formId: string;
    leadId: string;
    submissionId: string;
    clientIP: string;
    userAgent?: string;
    referrer?: string;
  }
) {
  try {
    await supabase
      .from('microsite_analytics')
      .insert([{
        microsite_id: analyticsData.micrositeId,
        event_type: 'form_submission',
        event_data: {
          form_id: analyticsData.formId,
          lead_id: analyticsData.leadId,
          submission_id: analyticsData.submissionId,
          conversion: true
        },
        ip_address: analyticsData.clientIP,
        user_agent: analyticsData.userAgent,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // Don't fail the submission if analytics fails
  }
}