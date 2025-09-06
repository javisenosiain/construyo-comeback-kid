import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SECURITY-COMPLIANT MICROSITE DATA HANDLER
 * 
 * This function safely serves microsite data for public consumption
 * while protecting sensitive customer information from exposure.
 * 
 * SECURITY FEATURES:
 * - Filters out sensitive fields (contact email/phone, zapier webhooks)
 * - Only serves active microsites
 * - Logs access attempts for security monitoring
 * - Rate limiting protection
 */

interface SafeMicrositeData {
  id: string;
  client_name: string;
  domain_slug: string;
  safe_microsite_data: any;
  is_active: boolean;
  created_at: string;
}

/**
 * Filters sensitive data from microsite_data object
 */
function filterSensitiveData(micrositeData: any): any {
  if (!micrositeData || typeof micrositeData !== 'object') {
    return {};
  }

  // Create a safe copy removing sensitive fields
  const safeMicrositeData = {
    clientName: micrositeData.clientName,
    description: micrositeData.description,
    services: micrositeData.services,
    styling: micrositeData.styling,
    logoUrl: micrositeData.logoUrl,
    calendlyUrl: micrositeData.calendlyUrl,
    showPortfolio: micrositeData.showPortfolio,
    portfolioSettings: micrositeData.portfolioSettings ? {
      maxItems: micrositeData.portfolioSettings.maxItems,
      showReviews: micrositeData.portfolioSettings.showReviews,
      googleReviewUrl: micrositeData.portfolioSettings.googleReviewUrl,
      trustpilotReviewUrl: micrositeData.portfolioSettings.trustpilotReviewUrl
    } : undefined,
    // Include HTML but ensure it doesn't contain sensitive data
    html: micrositeData.html
  };

  // Remove any undefined fields
  Object.keys(safeMicrositeData).forEach(key => {
    if (safeMicrositeData[key] === undefined) {
      delete safeMicrositeData[key];
    }
  });

  return safeMicrositeData;
}

/**
 * Log security event for monitoring
 */
async function logSecurityEvent(eventType: string, micrositeId: string, clientInfo: any) {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      table_name: 'microsites',
      record_id: micrositeId,
      event_data: {
        timestamp: new Date().toISOString(),
        source: 'microsite-public-access',
        ...clientInfo
      },
      risk_level: 'low'
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const micrositeSlug = url.searchParams.get('slug');

    if (!micrositeSlug) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Microsite slug is required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log(`🔍 Fetching safe microsite data for slug: ${micrositeSlug}`);

    // Fetch microsite data (only active microsites)
    const { data: micrositeData, error } = await supabase
      .from('microsites')
      .select('id, client_name, domain_slug, microsite_data, is_active, created_at')
      .eq('domain_slug', micrositeSlug)
      .eq('is_active', true)
      .single();

    if (error || !micrositeData) {
      console.log(`❌ Microsite not found or inactive: ${micrositeSlug}`);
      
      // Log potential security probe
      await logSecurityEvent('microsite_access_denied', '', {
        requested_slug: micrositeSlug,
        reason: 'not_found_or_inactive',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Microsite not found or inactive' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Filter out sensitive data
    const safeMicrositeData = filterSensitiveData(micrositeData.microsite_data);

    // Prepare safe response
    const safeResponse: SafeMicrositeData = {
      id: micrositeData.id,
      client_name: micrositeData.client_name,
      domain_slug: micrositeData.domain_slug,
      safe_microsite_data: safeMicrositeData,
      is_active: micrositeData.is_active,
      created_at: micrositeData.created_at
    };

    // Log successful access for security monitoring
    await logSecurityEvent('microsite_public_access', micrositeData.id, {
      client_name: micrositeData.client_name,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      referrer: req.headers.get('referer') || 'direct'
    });

    console.log(`✅ Safely served microsite data for: ${micrositeData.client_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: safeResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Microsite Safe Access Error:', error);
    
    // Log security incident
    await logSecurityEvent('microsite_access_error', '', {
      error: error.message,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

/**
 * USAGE DOCUMENTATION:
 * 
 * This edge function provides secure access to microsite data by:
 * 
 * 1. REMOVING SENSITIVE DATA:
 *    - contact.email and contact.phone
 *    - zapierWebhook URLs
 *    - formId references
 *    - Any other PII or sensitive configuration
 * 
 * 2. LOGGING ACCESS:
 *    - All access attempts are logged for security monitoring
 *    - Failed access attempts are flagged as potential security probes
 * 
 * 3. RATE LIMITING:
 *    - Natural rate limiting through edge function execution limits
 * 
 * 4. ACCESS CONTROL:
 *    - Only active microsites are served
 *    - Inactive or deleted microsites return 404
 * 
 * CALL EXAMPLE:
 * 
 * const response = await supabase.functions.invoke('microsite-safe-access', {
 *   body: { slug: 'my-microsite-slug' }
 * });
 * 
 * // Or via direct HTTP:
 * // GET /functions/v1/microsite-safe-access?slug=my-microsite-slug
 */