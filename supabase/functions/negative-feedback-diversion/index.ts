/**
 * Negative Feedback Diversion Edge Function
 * 
 * Automatically detects feedback ratings <4 and triggers resolution communications.
 * Features:
 * - Monitor negative feedback from Construyo CRM
 * - Send automated resolution messages via email/WhatsApp
 * - Track resolution attempts and outcomes
 * - GDPR-compliant data handling
 * - Integration with Resend and Respond.io
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

// CORS headers for web requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface NegativeFeedbackRequest {
  feedback_response_id: string;
  delivery_method: 'email' | 'whatsapp';
  custom_message?: string;
}

interface FeedbackResponse {
  id: string;
  user_id: string;
  project_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  rating: number;
  comments?: string;
  submitted_at: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'process':
        return await processNegativeFeedback(req);
      case 'monitor':
        return await monitorForNegativeFeedback(req);
      case 'resolve':
        return await handleResolutionResponse(req);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('General error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Server error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Process specific negative feedback and trigger resolution
 */
async function processNegativeFeedback(req: Request) {
  const requestData: NegativeFeedbackRequest = await req.json();
  console.log('Processing negative feedback diversion:', requestData);

  // Validate required fields
  if (!requestData.feedback_response_id || !requestData.delivery_method) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required fields: feedback_response_id, delivery_method' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Get feedback response details
  const { data: feedbackData, error: feedbackError } = await supabase
    .from('feedback_responses')
    .select('*')
    .eq('id', requestData.feedback_response_id)
    .single();

  if (feedbackError || !feedbackData) {
    console.error('Feedback fetch error:', feedbackError);
    return new Response(
      JSON.stringify({ 
        error: 'Feedback response not found' 
      }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Check if rating is actually negative (<4)
  if (feedbackData.rating >= 4) {
    return new Response(
      JSON.stringify({ 
        error: 'Feedback rating is not negative (rating >= 4)' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Check for existing resolution attempts (within 24 hours)
  const { data: existingResolution } = await supabase
    .from('feedback_resolutions')
    .select('id')
    .eq('feedback_response_id', requestData.feedback_response_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single();

  if (existingResolution) {
    return new Response(
      JSON.stringify({ 
        error: 'Resolution already initiated for this feedback within the last 24 hours' 
      }),
      { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Create resolution tracking entry
  const { data: resolutionLog, error: logError } = await supabase
    .from('feedback_resolutions')
    .insert([{
      user_id: feedbackData.user_id,
      feedback_response_id: feedbackData.id,
      project_id: feedbackData.project_id,
      customer_name: feedbackData.customer_name,
      customer_email: feedbackData.customer_email || null,
      customer_phone: feedbackData.customer_phone || null,
      delivery_method: requestData.delivery_method,
      resolution_status: 'pending',
    }])
    .select('*')
    .single();

  if (logError || !resolutionLog) {
    console.error('Resolution log creation error:', logError);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create resolution log' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  console.log('Created resolution log with token:', resolutionLog.resolution_token);

  // Generate resolution form URL
  const resolutionUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'https://your-domain.com'}/resolution/${resolutionLog.resolution_token}`;

  let deliveryResult;

  try {
    // Send resolution message via selected delivery method
    switch (requestData.delivery_method) {
      case 'email':
        deliveryResult = await sendEmailResolution({
          ...feedbackData,
          resolutionUrl,
          resolutionLogId: resolutionLog.id,
          customMessage: requestData.custom_message,
        });
        break;
        
      case 'whatsapp':
        deliveryResult = await sendWhatsAppResolution({
          ...feedbackData,
          resolutionUrl,
          resolutionLogId: resolutionLog.id,
          customMessage: requestData.custom_message,
        });
        break;
        
      default:
        throw new Error(`Unsupported delivery method: ${requestData.delivery_method}`);
    }

    // Update resolution log with success status
    await supabase
      .from('feedback_resolutions')
      .update({
        resolution_status: 'sent',
        external_message_id: deliveryResult.messageId || null,
      })
      .eq('id', resolutionLog.id);

    console.log('Resolution message sent successfully:', deliveryResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Resolution message sent successfully via ${requestData.delivery_method}`,
        resolution_log_id: resolutionLog.id,
        resolution_url: resolutionUrl,
        external_message_id: deliveryResult.messageId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (deliveryError) {
    console.error('Delivery error:', deliveryError);
    
    // Update resolution log with failure status
    await supabase
      .from('feedback_resolutions')
      .update({
        resolution_status: 'failed',
        resolution_notes: deliveryError.message,
      })
      .eq('id', resolutionLog.id);

    return new Response(
      JSON.stringify({ 
        error: `Failed to send resolution message: ${deliveryError.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Monitor for new negative feedback and auto-trigger diversion
 */
async function monitorForNegativeFeedback(req: Request) {
  console.log('Monitoring for negative feedback...');

  try {
    // Get recent negative feedback responses that haven't been processed
    const { data: negativeFeedback, error } = await supabase
      .from('feedback_responses')
      .select(`
        id,
        user_id,
        project_id,
        customer_name,
        customer_email,
        customer_phone,
        rating,
        comments,
        submitted_at
      `)
      .lt('rating', 4)
      .gte('submitted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching negative feedback:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch negative feedback' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!negativeFeedback || negativeFeedback.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No negative feedback found in the last hour',
          count: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${negativeFeedback.length} negative feedback responses`);

    const processedResults = [];

    // Process each negative feedback
    for (const feedback of negativeFeedback) {
      // Check if already processed
      const { data: existingResolution } = await supabase
        .from('feedback_resolutions')
        .select('id')
        .eq('feedback_response_id', feedback.id)
        .single();

      if (existingResolution) {
        console.log(`Feedback ${feedback.id} already has resolution attempt`);
        continue;
      }

      // Auto-trigger resolution based on customer contact info
      const deliveryMethod = feedback.customer_email ? 'email' : 
                            feedback.customer_phone ? 'whatsapp' : null;

      if (!deliveryMethod) {
        console.log(`No contact method available for feedback ${feedback.id}`);
        continue;
      }

      try {
        // Process this negative feedback
        const processRequest = new Request(req.url.replace('/monitor', '/process'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedback_response_id: feedback.id,
            delivery_method: deliveryMethod,
          }),
        });

        const processResult = await processNegativeFeedback(processRequest);
        const resultData = await processResult.json();

        processedResults.push({
          feedback_id: feedback.id,
          project_id: feedback.project_id,
          rating: feedback.rating,
          delivery_method: deliveryMethod,
          success: processResult.ok,
          result: resultData,
        });

      } catch (error) {
        console.error(`Error processing feedback ${feedback.id}:`, error);
        processedResults.push({
          feedback_id: feedback.id,
          project_id: feedback.project_id,
          rating: feedback.rating,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedResults.length} negative feedback responses`,
        total_found: negativeFeedback.length,
        processed: processedResults,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Monitor error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Monitor error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Handle resolution form responses
 */
async function handleResolutionResponse(req: Request) {
  const { resolution_token, resolution_notes } = await req.json();

  if (!resolution_token) {
    return new Response(
      JSON.stringify({ error: 'Resolution token is required' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  // Update resolution with customer response
  const { data, error } = await supabase
    .from('feedback_resolutions')
    .update({
      resolution_status: 'resolved',
      resolution_notes: resolution_notes || 'Customer responded via resolution form',
      resolved_at: new Date().toISOString(),
    })
    .eq('resolution_token', resolution_token)
    .eq('resolution_status', 'sent')
    .select('*')
    .single();

  if (error || !data) {
    console.error('Resolution update error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update resolution or invalid token' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Resolution response recorded successfully',
      resolution_id: data.id,
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Send resolution message via email using Resend
 */
async function sendEmailResolution({
  customer_name,
  customer_email,
  project_id,
  rating,
  comments,
  resolutionUrl,
  customMessage,
}: any) {
  if (!customer_email) {
    throw new Error('Customer email is required for email delivery');
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>We Want to Make This Right</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
        .button { 
          display: inline-block; 
          background: #dc2626; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 20px 0; 
        }
        .feedback-box { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>We Want to Make This Right</h1>
          <p>We received your feedback and want to address your concerns immediately.</p>
        </div>
        
        <p>Dear ${customer_name},</p>
        
        <p>Thank you for taking the time to provide feedback on project <strong>${project_id}</strong>. 
        We noticed you gave us a ${rating}/5 rating, and we take this seriously.</p>
        
        ${comments ? `
        <div class="feedback-box">
          <strong>Your feedback:</strong><br>
          "${comments}"
        </div>
        ` : ''}
        
        <p>${customMessage || 'Your satisfaction is our top priority, and we want to make this right. Please let us know how we can resolve any issues and improve your experience.'}</p>
        
        <a href="${resolutionUrl}" class="button" target="_blank">Tell Us How to Fix This</a>
        
        <p>This secure form will allow you to:</p>
        <ul>
          <li>Explain what went wrong</li>
          <li>Tell us how we can improve</li>
          <li>Request specific actions</li>
          <li>Schedule a follow-up call if needed</li>
        </ul>
        
        <p>We're committed to earning back your trust and delivering the quality you deserve.</p>
        
        <p>Best regards,<br>The Construyo Team</p>
        
        <div class="footer">
          <p><strong>Privacy Notice:</strong> Your information is handled in accordance with GDPR regulations. 
          This link is secure and expires in 7 days.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await resend.emails.send({
    from: 'Construyo Support <support@resend.dev>',
    to: [customer_email],
    subject: `We Want to Make This Right - Project ${project_id}`,
    html: emailHtml,
  });

  if (result.error) {
    throw new Error(`Email sending failed: ${result.error.message}`);
  }

  return { messageId: result.data?.id };
}

/**
 * Send resolution message via WhatsApp using Respond.io
 */
async function sendWhatsAppResolution({
  customer_name,
  customer_phone,
  project_id,
  rating,
  resolutionUrl,
  customMessage,
}: any) {
  const respondIoApiKey = Deno.env.get('RESPOND_IO_API_KEY');
  
  if (!respondIoApiKey) {
    throw new Error('WhatsApp integration not configured');
  }

  if (!customer_phone) {
    throw new Error('Customer phone number is required for WhatsApp delivery');
  }

  const message = `Hi ${customer_name}! 👋

We received your ${rating}/5 feedback for project *${project_id}* and want to make this right immediately.

${customMessage || 'Your satisfaction is our top priority. We\'d like to understand what went wrong and how we can fix it.'}

Please take a moment to tell us how we can improve:
${resolutionUrl}

This secure form will help us:
✅ Understand the issues
✅ Take corrective action
✅ Prevent future problems
✅ Earn back your trust

We're committed to delivering the quality you deserve! 🔧

This link expires in 7 days for your security.`;

  const response = await fetch('https://api.respond.io/v2/contact/message', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${respondIoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        type: 'text',
        text: message,
      },
      channelId: 'whatsapp',
      contact: {
        phone: customer_phone,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp sending failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return { messageId: result.messageId };
}

/**
 * Example usage:
 * 
 * Process specific negative feedback for project "proj789":
 * 
 * POST /functions/v1/negative-feedback-diversion/process
 * {
 *   "feedback_response_id": "uuid-of-feedback-response",
 *   "delivery_method": "email",
 *   "custom_message": "We sincerely apologize for not meeting your expectations..."
 * }
 * 
 * Monitor for recent negative feedback:
 * 
 * GET /functions/v1/negative-feedback-diversion/monitor
 * 
 * This will:
 * 1. Find all feedback with ratings <4 from the last hour
 * 2. Check if they haven't been processed already
 * 3. Automatically send resolution messages
 * 4. Log all attempts and outcomes
 * 5. Handle API errors gracefully
 * 6. Ensure GDPR compliance throughout
 */