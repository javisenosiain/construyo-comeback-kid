import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SyncRequest {
  recordType: 'lead' | 'customer' | 'invoice';
  recordId: string;
  externalCrm: 'google_sheets' | 'hubspot' | 'pipedrive' | 'zoho';
  zapierWebhook?: string;
  fieldMappings?: Record<string, string>;
  retryCount?: number;
}

interface SyncLog {
  id?: string;
  user_id: string;
  record_type: string;
  record_id: string;
  external_crm: string;
  sync_status: 'pending' | 'success' | 'failed' | 'retrying';
  error_message?: string;
  retry_count: number;
  zapier_webhook: string;
  field_mappings: Record<string, string>;
  synced_at?: string;
  created_at?: string;
}

/**
 * Default field mappings for different CRM systems
 */
const getDefaultFieldMappings = (crmType: string, recordType: string): Record<string, string> => {
  const mappings: Record<string, Record<string, Record<string, string>>> = {
    hubspot: {
      lead: {
        'first_name': 'firstname',
        'last_name': 'lastname',
        'email': 'email',
        'phone': 'phone',
        'company_name': 'company',
        'project_type': 'lead_source',
        'status': 'lifecyclestage',
        'notes': 'notes'
      },
      customer: {
        'first_name': 'firstname',
        'last_name': 'lastname',
        'email': 'email',
        'phone': 'phone',
        'company_name': 'company'
      },
      invoice: {
        'amount': 'amount',
        'currency': 'currency',
        'status': 'deal_stage'
      }
    },
    google_sheets: {
      lead: {
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'email': 'Email',
        'phone': 'Phone',
        'company_name': 'Company',
        'project_type': 'Project Type',
        'status': 'Status',
        'created_at': 'Date Created'
      },
      customer: {
        'first_name': 'First Name',
        'last_name': 'Last Name',
        'email': 'Email',
        'phone': 'Phone',
        'company_name': 'Company'
      },
      invoice: {
        'amount': 'Amount',
        'currency': 'Currency',
        'status': 'Status',
        'created_at': 'Date'
      }
    },
    pipedrive: {
      lead: {
        'first_name': 'person_name',
        'last_name': 'person_name',
        'email': 'email',
        'phone': 'phone',
        'company_name': 'org_name',
        'project_type': 'source',
        'status': 'status'
      },
      customer: {
        'first_name': 'name',
        'last_name': 'name',
        'email': 'email',
        'phone': 'phone',
        'company_name': 'org_name'
      },
      invoice: {
        'amount': 'value',
        'currency': 'currency',
        'status': 'status'
      }
    },
    zoho: {
      lead: {
        'first_name': 'First_Name',
        'last_name': 'Last_Name',
        'email': 'Email',
        'phone': 'Phone',
        'company_name': 'Company',
        'project_type': 'Lead_Source',
        'status': 'Lead_Status'
      },
      customer: {
        'first_name': 'First_Name',
        'last_name': 'Last_Name',
        'email': 'Email',
        'phone': 'Phone',
        'company_name': 'Account_Name'
      },
      invoice: {
        'amount': 'Amount',
        'currency': 'Currency',
        'status': 'Status'
      }
    }
  };

  return mappings[crmType]?.[recordType] || {};
};

/**
 * Fetch record data from Supabase based on type and ID
 */
async function fetchRecordData(recordType: string, recordId: string): Promise<any> {
  let table: string;
  switch (recordType) {
    case 'lead':
      table = 'leads';
      break;
    case 'customer':
      table = 'customers';
      break;
    case 'invoice':
      table = 'invoices';
      break;
    default:
      throw new Error(`Invalid record type: ${recordType}`);
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .single();

  if (error) {
    console.error(`Error fetching ${recordType}:`, error);
    throw new Error(`Failed to fetch ${recordType}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`${recordType} not found with ID: ${recordId}`);
  }

  return data;
}

/**
 * Map Construyo fields to external CRM fields
 */
function mapFields(data: any, fieldMappings: Record<string, string>): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  Object.entries(fieldMappings).forEach(([construyoField, externalField]) => {
    if (data[construyoField] !== undefined && data[construyoField] !== null) {
      mappedData[externalField] = data[construyoField];
    }
  });

  // Add metadata
  mappedData['construyo_id'] = data.id;
  mappedData['sync_timestamp'] = new Date().toISOString();
  mappedData['source'] = 'Construyo CRM';

  return mappedData;
}

/**
 * Send data to Zapier webhook with retry logic
 */
async function sendToZapier(
  webhookUrl: string, 
  data: any, 
  retryCount: number = 0, 
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string }> {
  
  try {
    console.log(`Sending to Zapier (attempt ${retryCount + 1}):`, webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Handle rate limiting (429) with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendToZapier(webhookUrl, data, retryCount + 1, maxRetries);
      }

      // Handle server errors (5xx) with retry
      if (response.status >= 500 && retryCount < maxRetries) {
        const delay = (retryCount + 1) * 2000; // Linear backoff for server errors
        console.log(`Server error ${response.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendToZapier(webhookUrl, data, retryCount + 1, maxRetries);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('Zapier response:', responseText);
    
    return { success: true };
  } catch (error) {
    console.error(`Zapier sync error (attempt ${retryCount + 1}):`, error);
    
    // Retry on network errors
    if (retryCount < maxRetries && (
      error.message.includes('fetch') || 
      error.message.includes('network') ||
      error.message.includes('timeout')
    )) {
      const delay = (retryCount + 1) * 1000;
      console.log(`Network error. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendToZapier(webhookUrl, data, retryCount + 1, maxRetries);
    }

    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}

/**
 * Log sync operation to database
 */
async function logSyncOperation(logData: SyncLog): Promise<void> {
  try {
    const { error } = await supabase
      .from('external_crm_sync_logs')
      .insert([{
        user_id: logData.user_id,
        record_type: logData.record_type,
        record_id: logData.record_id,
        external_crm: logData.external_crm,
        sync_status: logData.sync_status,
        error_message: logData.error_message,
        retry_count: logData.retry_count,
        zapier_webhook: logData.zapier_webhook,
        field_mappings: logData.field_mappings,
        synced_at: logData.synced_at
      }]);

    if (error) {
      console.error('Error logging sync operation:', error);
    }
  } catch (error) {
    console.error('Failed to log sync operation:', error);
  }
}

/**
 * Get user's CRM settings
 */
async function getUserCrmSettings(userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('external_crm_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found error
    console.error('Error fetching CRM settings:', error);
    throw new Error('Failed to fetch CRM settings');
  }

  return data;
}

/**
 * Main sync function
 * Sample call: syncToCRM("lead", "lead123", "hubspot", userId)
 */
async function syncToCRM(
  recordType: string, 
  recordId: string, 
  externalCrm: string, 
  userId: string,
  customWebhook?: string,
  customMappings?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  
  console.log(`Starting sync: ${recordType} ${recordId} to ${externalCrm}`);
  
  try {
    // Get user's CRM settings
    const crmSettings = await getUserCrmSettings(userId);
    
    // Use custom webhook or fall back to user settings
    const zapierWebhook = customWebhook || crmSettings?.zapier_webhook;
    if (!zapierWebhook) {
      throw new Error('No Zapier webhook configured');
    }

    // Get field mappings (custom or default)
    const fieldMappings = customMappings || 
      crmSettings?.field_mappings?.[recordType] || 
      getDefaultFieldMappings(externalCrm, recordType);

    // Fetch record data
    const recordData = await fetchRecordData(recordType, recordId);
    
    // Map fields for external CRM
    const mappedData = mapFields(recordData, fieldMappings);
    
    // Add CRM-specific metadata
    mappedData.record_type = recordType;
    mappedData.external_crm = externalCrm;

    // Send to Zapier
    const result = await sendToZapier(zapierWebhook, mappedData);
    
    // Log the operation
    await logSyncOperation({
      user_id: userId,
      record_type: recordType,
      record_id: recordId,
      external_crm: externalCrm,
      sync_status: result.success ? 'success' : 'failed',
      error_message: result.error,
      retry_count: 0,
      zapier_webhook: zapierWebhook,
      field_mappings: fieldMappings,
      synced_at: result.success ? new Date().toISOString() : undefined
    });

    return result;
    
  } catch (error) {
    console.error('Sync error:', error);
    
    // Log the failed operation
    await logSyncOperation({
      user_id: userId,
      record_type: recordType,
      record_id: recordId,
      external_crm: externalCrm,
      sync_status: 'failed',
      error_message: error.message,
      retry_count: 0,
      zapier_webhook: customWebhook || '',
      field_mappings: customMappings || {}
    });

    return { success: false, error: error.message };
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { 
      recordType, 
      recordId, 
      externalCrm, 
      zapierWebhook, 
      fieldMappings,
      retryCount = 0 
    }: SyncRequest = await req.json();

    // Validate required fields
    if (!recordType || !recordId || !externalCrm) {
      throw new Error('Missing required fields: recordType, recordId, externalCrm');
    }

    // Example call to sync lead123 to HubSpot:
    // syncToCRM("lead", "lead123", "hubspot", user.id)
    const result = await syncToCRM(
      recordType,
      recordId,
      externalCrm,
      user.id,
      zapierWebhook,
      fieldMappings
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('External CRM sync error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});