import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RATE_LIMIT_DELAY = 30000; // 30 seconds for Calendly rate limits

interface CalendlyBookingRequest {
  leadId: string;
  projectType: string;
  leadName?: string;
  leadEmail?: string;
  customMessage?: string;
}

interface CalendlyWebhookPayload {
  created_at: string;
  created_by: string;
  event: string;
  payload: {
    event_type: {
      slug: string;
      name: string;
    };
    invitee: {
      name: string;
      email: string;
      uri: string;
    };
    questions_and_answers: Array<{
      question: string;
      answer: string;
    }>;
    scheduled_event: {
      start_time: string;
      end_time: string;
      event_memberships: Array<{
        user_name: string;
        user_email: string;
      }>;
    };
    tracking: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    };
  };
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate project-specific Calendly booking link
 * Maps project types to specific Calendly event types
 */
function generateCalendlyLink(projectType: string, leadId: string, leadName?: string, leadEmail?: string): string {
  console.log(`🔗 Generating Calendly link for project type: ${projectType}`);
  
  // Map project types to Calendly event slugs
  const projectTypeMapping: Record<string, string> = {
    'Kitchen': 'kitchen-renovation-consultation',
    'Bathroom': 'bathroom-renovation-consultation', 
    'Extension': 'home-extension-consultation',
    'Loft Conversion': 'loft-conversion-consultation',
    'Full Renovation': 'full-home-renovation-consultation',
    'Garden': 'garden-landscaping-consultation',
    'Commercial': 'commercial-project-consultation',
    'Other': 'general-construction-consultation'
  };

  const eventSlug = projectTypeMapping[projectType] || projectTypeMapping['Other'];
  const baseUrl = 'https://calendly.com/construyo-consultations';
  
  // Build query parameters for pre-filling
  const params = new URLSearchParams();
  
  if (leadName) {
    params.append('name', leadName);
  }
  
  if (leadEmail) {
    params.append('email', leadEmail);
  }
  
  // Add tracking parameters
  params.append('utm_source', 'construyo-crm');
  params.append('utm_medium', 'auto-responder');
  params.append('utm_campaign', projectType.toLowerCase().replace(/\s+/g, '-'));
  params.append('lead_id', leadId);
  
  const fullUrl = `${baseUrl}/${eventSlug}?${params.toString()}`;
  console.log(`✅ Generated Calendly link: ${fullUrl}`);
  
  return fullUrl;
}

/**
 * Make Calendly API request with retry logic and rate limiting
 */
async function makeCalendlyAPIRequest(
  endpoint: string, 
  options: RequestInit = {}, 
  retryCount = 0
): Promise<Response> {
  const calendlyToken = Deno.env.get('CALENDLY_API_TOKEN');
  
  if (!calendlyToken) {
    throw new Error('CALENDLY_API_TOKEN is not configured');
  }

  const url = `https://api.calendly.com${endpoint}`;
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Authorization': `Bearer ${calendlyToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    console.log(`📡 Making Calendly API request to: ${endpoint} (attempt ${retryCount + 1})`);
    
    const response = await fetch(url, requestOptions);
    
    // Handle rate limiting
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        console.log(`⏱️ Rate limited, retrying in ${RATE_LIMIT_DELAY / 1000} seconds...`);
        await sleep(RATE_LIMIT_DELAY);
        return makeCalendlyAPIRequest(endpoint, options, retryCount + 1);
      } else {
        throw new Error('Maximum retries exceeded for rate limit');
      }
    }
    
    // Handle other errors with exponential backoff
    if (!response.ok && retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`❌ API request failed (${response.status}), retrying in ${delay}ms...`);
      await sleep(delay);
      return makeCalendlyAPIRequest(endpoint, options, retryCount + 1);
    }
    
    return response;
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`❌ Network error, retrying in ${delay}ms...`, error);
      await sleep(delay);
      return makeCalendlyAPIRequest(endpoint, options, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Get user's Calendly event types
 */
async function getUserEventTypes(userUri: string): Promise<any> {
  try {
    const response = await makeCalendlyAPIRequest(`/event_types?user=${encodeURIComponent(userUri)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event types: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.collection || [];
    
  } catch (error) {
    console.error('❌ Failed to fetch Calendly event types:', error);
    throw error;
  }
}

/**
 * Log booking analytics to Supabase
 */
async function logBookingAnalytics(
  supabase: any,
  eventType: string,
  leadId?: string,
  eventData: any = {}
): Promise<void> {
  try {
    console.log(`📊 Logging booking analytics: ${eventType}`);
    
    await supabase.from('booking_link_analytics').insert({
      user_id: eventData.user_id,
      lead_id: leadId,
      event_type: eventType,
      calendly_event_id: eventData.calendly_event_id,
      calendly_event_uri: eventData.calendly_event_uri,
      event_data: eventData,
      ip_address: eventData.ip_address,
      user_agent: eventData.user_agent,
      referrer: eventData.referrer
    });
    
    console.log('✅ Booking analytics logged successfully');
    
  } catch (error) {
    console.error('❌ Failed to log booking analytics:', error);
    // Don't throw - analytics failure shouldn't break the main flow
  }
}

/**
 * Sync appointment to Construyo CRM
 */
async function syncAppointmentToCRM(
  supabase: any,
  appointmentData: any,
  leadId?: string
): Promise<void> {
  try {
    console.log('💾 Syncing appointment to Construyo CRM');
    
    // Update lead status if lead exists
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          status: 'consultation_booked',
          notes: `Calendly consultation booked for ${appointmentData.start_time}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);
    }
    
    // Log the interaction
    await supabase.from('customer_interactions').insert({
      lead_id: leadId,
      interaction_type: 'calendly_booking',
      subject: `Consultation Booked - ${appointmentData.event_type_name}`,
      content: `Consultation scheduled for ${appointmentData.start_time}`,
      metadata: {
        calendly_event_uri: appointmentData.event_uri,
        invitee_name: appointmentData.invitee_name,
        invitee_email: appointmentData.invitee_email,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time
      }
    });
    
    console.log('✅ Appointment synced to CRM successfully');
    
  } catch (error) {
    console.error('❌ Failed to sync appointment to CRM:', error);
    throw error;
  }
}

/**
 * Sync to external systems via Zapier
 */
async function syncToZapier(webhookUrl: string, appointmentData: any): Promise<void> {
  try {
    console.log('🔄 Syncing appointment to Zapier webhook');
    
    const payload = {
      timestamp: new Date().toISOString(),
      source: 'construyo-calendly',
      event_type: 'appointment_booked',
      data: appointmentData
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ Appointment synced to Zapier successfully');
    
  } catch (error) {
    console.error('❌ Failed to sync to Zapier:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const url = new URL(req.url);
    const path = url.pathname;

    // Generate booking link endpoint
    if (path === '/generate-link' && req.method === 'POST') {
      const { leadId, projectType, leadName, leadEmail }: CalendlyBookingRequest = await req.json();
      
      console.log(`🎯 Generating Calendly link for lead ${leadId}, project: ${projectType}`);
      
      // Generate the booking link
      const bookingLink = generateCalendlyLink(projectType, leadId, leadName, leadEmail);
      
      // Log analytics
      await logBookingAnalytics(supabase, 'link_generated', leadId, {
        project_type: projectType,
        lead_name: leadName,
        lead_email: leadEmail,
        booking_link: bookingLink
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          booking_link: bookingLink,
          project_type: projectType
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Calendly webhook endpoint for appointment notifications
    if (path === '/webhook' && req.method === 'POST') {
      const webhookData: CalendlyWebhookPayload = await req.json();
      
      console.log(`📅 Received Calendly webhook: ${webhookData.event}`);
      
      // Extract lead ID from tracking data
      const leadId = webhookData.payload.tracking?.utm_campaign?.includes('lead_') 
        ? webhookData.payload.tracking.utm_campaign.split('lead_')[1] 
        : null;
      
      // Process different event types
      if (webhookData.event === 'invitee.created') {
        const appointmentData = {
          event_uri: webhookData.payload.invitee.uri,
          event_type_name: webhookData.payload.event_type.name,
          invitee_name: webhookData.payload.invitee.name,
          invitee_email: webhookData.payload.invitee.email,
          start_time: webhookData.payload.scheduled_event.start_time,
          end_time: webhookData.payload.scheduled_event.end_time,
          questions_and_answers: webhookData.payload.questions_and_answers
        };
        
        // Sync to CRM
        await syncAppointmentToCRM(supabase, appointmentData, leadId);
        
        // Log analytics
        await logBookingAnalytics(supabase, 'appointment_booked', leadId, {
          calendly_event_uri: appointmentData.event_uri,
          invitee_email: appointmentData.invitee_email
        });
        
        console.log('✅ Appointment booking processed successfully');
      }
      
      if (webhookData.event === 'invitee.canceled') {
        // Log cancellation
        await logBookingAnalytics(supabase, 'appointment_canceled', leadId, {
          calendly_event_uri: webhookData.payload.invitee.uri,
          canceled_at: webhookData.created_at
        });
        
        // Update lead status
        if (leadId) {
          await supabase
            .from('leads')
            .update({
              status: 'consultation_canceled',
              notes: `Calendly consultation was canceled on ${webhookData.created_at}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', leadId);
        }
        
        console.log('✅ Appointment cancellation processed successfully');
      }
      
      return new Response(
        JSON.stringify({ success: true, processed: webhookData.event }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get event types endpoint
    if (path === '/event-types' && req.method === 'GET') {
      const userUri = url.searchParams.get('user');
      
      if (!userUri) {
        return new Response(
          JSON.stringify({ error: 'User URI is required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
      
      try {
        const eventTypes = await getUserEventTypes(userUri);
        
        return new Response(
          JSON.stringify({
            success: true,
            event_types: eventTypes
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
        
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    );

  } catch (error) {
    console.error('❌ Calendly Integration Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/**
 * Sample Usage:
 * 
 * // Generate booking link for Extension project
 * const response = await supabase.functions.invoke('calendly-integration/generate-link', {
 *   body: {
 *     leadId: 'lead-uuid-here',
 *     projectType: 'Extension',
 *     leadName: 'John Doe',
 *     leadEmail: 'john@example.com'
 *   }
 * });
 * 
 * // Expected response:
 * {
 *   success: true,
 *   booking_link: 'https://calendly.com/construyo-consultations/home-extension-consultation?name=John+Doe&email=john@example.com&utm_source=construyo-crm&lead_id=lead-uuid-here',
 *   project_type: 'Extension'
 * }
 */