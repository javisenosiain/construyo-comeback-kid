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

interface CRMRecord {
  name: string;
  email: string;
  phone?: string;
  project_type?: string;
  source?: string;
  budget_range?: string;
  timeline?: string;
  description?: string;
  address?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

interface BatchCRMRequest {
  records: CRMRecord[];
  zapier_webhook?: string;
  external_crm_sync?: boolean;
}

interface SingleCRMRequest extends CRMRecord {
  zapier_webhook?: string;
  external_crm_sync?: boolean;
}

/**
 * Validates email format using regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format (basic validation)
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validates a single CRM record
 */
function validateCRMRecord(record: CRMRecord): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields validation
  if (!record.name || record.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!record.email || record.email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!isValidEmail(record.email)) {
    errors.push('Invalid email format');
  }

  // Optional phone validation
  if (record.phone && !isValidPhone(record.phone)) {
    errors.push('Invalid phone number format');
  }

  // Name length validation
  if (record.name && record.name.length > 255) {
    errors.push('Name must be less than 255 characters');
  }

  // Email length validation
  if (record.email && record.email.length > 320) {
    errors.push('Email must be less than 320 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Encrypts sensitive data for GDPR compliance
 * In production, use proper encryption libraries
 */
function encryptSensitiveData(data: string): string {
  // For demo purposes - in production use proper encryption
  return btoa(data); // Base64 encoding (NOT secure for production)
}

/**
 * Logs security events for GDPR compliance
 */
async function logSecurityEvent(
  eventType: string,
  recordId: string,
  sensitiveFields: string[],
  userId?: string
) {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      table_name: 'leads',
      record_id: recordId,
      sensitive_data_accessed: sensitiveFields,
      event_data: {
        timestamp: new Date().toISOString(),
        source: 'crm-manager'
      },
      risk_level: 'low'
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Creates a single CRM record in the database
 */
async function createCRMRecord(record: CRMRecord, userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🏗️ Creating CRM record for:', record.name);

    // Validate the record
    const validation = validateCRMRecord(record);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Prepare data for insertion
    const leadData = {
      customer_name: record.name.trim(),
      email: record.email.trim().toLowerCase(),
      phone: record.phone?.trim() || null,
      project_type: record.project_type?.trim() || null,
      source: record.source || 'crm',
      budget_range: record.budget_range?.trim() || null,
      timeline: record.timeline?.trim() || null,
      description: record.description?.trim() || null,
      address: record.address?.trim() || null,
      priority: record.priority || 'medium',
      notes: record.notes?.trim() || null,
      status: 'new',
      customer_id: userId || null
    };

    // Insert into leads table
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert failed:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    // Log security event for GDPR compliance
    await logSecurityEvent(
      'crm_record_created',
      data.id,
      ['email', 'phone'],
      userId
    );

    console.log('✅ CRM record created successfully:', data.id);
    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ Unexpected error creating CRM record:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Creates multiple CRM records in batch
 */
async function createBatchCRMRecords(records: CRMRecord[], userId?: string): Promise<{ success: boolean; results: any[]; errors: string[] }> {
  console.log('📦 Processing batch of', records.length, 'CRM records');
  
  const results: any[] = [];
  const errors: string[] = [];

  // Process records in parallel with a limit to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (record, index) => {
      const result = await createCRMRecord(record, userId);
      if (!result.success) {
        errors.push(`Record ${i + index + 1}: ${result.error}`);
      }
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Batch processing completed: ${successCount}/${records.length} successful`);

  return {
    success: errors.length === 0,
    results,
    errors
  };
}

/**
 * Syncs data to external CRM via Zapier webhook
 */
async function syncToExternalCRM(data: any, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Syncing to external CRM via Zapier');

    const payload = {
      timestamp: new Date().toISOString(),
      source: 'construyo-crm',
      data: data,
      type: Array.isArray(data) ? 'batch' : 'single'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ External CRM sync completed');
    return { success: true };

  } catch (error) {
    console.error('❌ External CRM sync failed:', error);
    return {
      success: false,
      error: `External sync failed: ${error.message}`
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    const body = await req.json();
    const { records, zapier_webhook, external_crm_sync, ...singleRecord } = body;

    let result: any;
    let crmData: any;

    // Determine if this is a batch or single record request
    if (records && Array.isArray(records)) {
      // Batch processing
      result = await createBatchCRMRecords(records, user?.id);
      crmData = result.results.filter(r => r.success).map(r => r.data);
    } else {
      // Single record processing
      result = await createCRMRecord(singleRecord as CRMRecord, user?.id);
      crmData = result.success ? result.data : null;
    }

    // Sync to external CRM if requested and webhook provided
    if (external_crm_sync && zapier_webhook && crmData) {
      const syncResult = await syncToExternalCRM(crmData, zapier_webhook);
      result.external_sync = syncResult;
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    );

  } catch (error) {
    console.error('❌ CRM Manager Error:', error);
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
 * Sample usage:
 * 
 * // Single record creation
 * const singleRecordPayload = {
 *   name: "John Doe",
 *   email: "john@example.com", 
 *   phone: "1234567890",
 *   project_type: "Kitchen",
 *   source: "website_form",
 *   budget_range: "£10,000 - £20,000",
 *   timeline: "3-6 months",
 *   description: "Looking to renovate kitchen with modern appliances",
 *   address: "123 Main St, London",
 *   priority: "medium",
 *   zapier_webhook: "https://hooks.zapier.com/hooks/catch/...",
 *   external_crm_sync: true
 * };
 * 
 * // Batch record creation
 * const batchPayload = {
 *   records: [
 *     {
 *       name: "John Doe",
 *       email: "john@example.com",
 *       phone: "1234567890", 
 *       project_type: "Kitchen",
 *       source: "form"
 *     },
 *     {
 *       name: "Jane Smith",
 *       email: "jane@example.com",
 *       project_type: "Bathroom",
 *       source: "referral"
 *     }
 *   ],
 *   zapier_webhook: "https://hooks.zapier.com/hooks/catch/...",
 *   external_crm_sync: true
 * };
 * 
 * // Call the function
 * await supabase.functions.invoke('crm-manager', {
 *   body: singleRecordPayload
 * });
 */