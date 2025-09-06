import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceGenerationRequest {
  leadId: string;
  projectType?: string;
  amount?: number;
  customFields?: {
    client_name?: string;
    project_details?: string;
    due_date?: string;
  };
  paymentProvider?: 'stripe' | 'quickbooks' | 'xero';
  syncToSheets?: boolean;
}

interface PricingRule {
  id: string;
  project_type: string;
  base_price: number;
  price_per_unit: number;
  unit_type: string;
  currency: string;
}

interface Lead {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  project_type: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
}

// Enhanced logging with timestamp and context
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [INVOICE-GEN] ${step}${detailsStr}`);
};

// Retry mechanism with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logStep(`Attempt ${attempt} failed`, { error: error.message });
      
      if (attempt === maxRetries) break;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logStep(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Encrypt sensitive data (simple implementation - use proper encryption in production)
const encryptData = (data: string): string => {
  // In production, use proper encryption like AES-256
  return btoa(data);
};

// Decrypt sensitive data
const decryptData = (encryptedData: string): string => {
  try {
    return atob(encryptedData);
  } catch {
    throw new Error('Failed to decrypt data');
  }
};

// Calculate invoice amount based on pricing rules
const calculateInvoiceAmount = (lead: Lead, pricingRules: PricingRule[]): number => {
  const rule = pricingRules.find(r => r.project_type.toLowerCase() === lead.project_type.toLowerCase());
  
  if (!rule) {
    // Fallback to lead budget or default pricing
    return lead.budget_max || lead.budget_min || 5000;
  }
  
  // Simple calculation - in production, consider project size, complexity, etc.
  let amount = rule.base_price;
  
  // Add per-unit pricing if applicable (you'd need project size data)
  if (rule.price_per_unit) {
    // Default to 100 units if no specific size data
    amount += rule.price_per_unit * 100;
  }
  
  return amount;
};

// Stripe integration
const createStripeInvoice = async (invoiceData: any, credentials: string) => {
  logStep("Creating Stripe invoice");
  
  const apiKey = decryptData(credentials);
  
  const response = await fetch('https://api.stripe.com/v1/invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'customer[email]': invoiceData.customer_email,
      'customer[name]': invoiceData.customer_name,
      'description': invoiceData.project_title,
      'amount_due': (invoiceData.amount * 100).toString(), // Stripe uses cents
      'currency': invoiceData.currency.toLowerCase(),
      'due_date': Math.floor(new Date(invoiceData.due_date).getTime() / 1000).toString(),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe API error: ${error}`);
  }
  
  const stripeInvoice = await response.json();
  return {
    external_id: stripeInvoice.id,
    payment_url: stripeInvoice.hosted_invoice_url,
    status: 'draft',
  };
};

// QuickBooks integration (simplified)
const createQuickBooksInvoice = async (invoiceData: any, credentials: string) => {
  logStep("Creating QuickBooks invoice");
  
  // QuickBooks requires OAuth setup - this is a simplified example
  const authToken = decryptData(credentials);
  
  const qbInvoiceData = {
    Line: [{
      Amount: invoiceData.amount,
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: {
          value: "1", // Default service item
        }
      }
    }],
    CustomerRef: {
      name: invoiceData.customer_name,
    },
    BillEmail: {
      Address: invoiceData.customer_email,
    },
    DueDate: invoiceData.due_date,
  };
  
  // This would be the actual QuickBooks API call
  // const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/invoice`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${authToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(qbInvoiceData),
  // });
  
  // Simulated response for now
  return {
    external_id: `QB-${Date.now()}`,
    payment_url: `https://quickbooks.com/invoice/${Date.now()}`,
    status: 'draft',
  };
};

// Xero integration (simplified)
const createXeroInvoice = async (invoiceData: any, credentials: string) => {
  logStep("Creating Xero invoice");
  
  const authToken = decryptData(credentials);
  
  const xeroInvoiceData = {
    Type: "ACCREC",
    Contact: {
      Name: invoiceData.customer_name,
      EmailAddress: invoiceData.customer_email,
    },
    LineItems: [{
      Description: invoiceData.project_title,
      Quantity: 1,
      UnitAmount: invoiceData.amount,
    }],
    DueDate: invoiceData.due_date,
    Status: "DRAFT",
  };
  
  // This would be the actual Xero API call
  // const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${authToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ Invoices: [xeroInvoiceData] }),
  // });
  
  // Simulated response for now
  return {
    external_id: `XR-${Date.now()}`,
    payment_url: `https://xero.com/invoice/${Date.now()}`,
    status: 'draft',
  };
};

// Sync to Google Sheets via Zapier
const syncToGoogleSheets = async (invoiceData: any, zapierWebhook: string) => {
  logStep("Syncing to Google Sheets via Zapier");
  
  const payload = {
    invoice_number: invoiceData.invoice_number,
    customer_name: invoiceData.customer_name,
    customer_email: invoiceData.customer_email,
    project_title: invoiceData.project_title,
    amount: invoiceData.amount,
    currency: invoiceData.currency,
    due_date: invoiceData.due_date,
    status: invoiceData.status,
    created_at: new Date().toISOString(),
  };
  
  const response = await fetch(zapierWebhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`Zapier webhook failed: ${response.statusText}`);
  }
  
  logStep("Successfully synced to Google Sheets");
};

// Log analytics event
const logAnalyticsEvent = async (
  supabase: any,
  userId: string,
  invoiceId: string,
  eventType: string,
  eventData: any = {},
  paymentProvider?: string
) => {
  await supabase.from('invoice_analytics').insert({
    user_id: userId,
    invoice_id: invoiceId,
    event_type: eventType,
    event_data: eventData,
    payment_provider: paymentProvider,
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Invoice generation request started");

    // Initialize Supabase client with service role key for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const body: InvoiceGenerationRequest = await req.json();
    const { leadId, projectType, amount, customFields, paymentProvider = 'stripe', syncToSheets = false } = body;

    logStep("Request parsed", { leadId, projectType, paymentProvider });

    // Fetch lead data
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('customer_id', user.id)
      .single();

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message || 'Invalid lead ID'}`);
    }

    const lead = leadData as Lead;
    logStep("Lead data retrieved", { leadId: lead.id, projectType: lead.project_type });

    // Fetch pricing rules if amount not provided
    let calculatedAmount = amount;
    if (!calculatedAmount) {
      const { data: pricingRules } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      calculatedAmount = calculateInvoiceAmount(lead, pricingRules || []);
      logStep("Amount calculated using pricing rules", { amount: calculatedAmount });
    }

    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');

    // Prepare invoice data
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

    const invoiceData = {
      user_id: user.id,
      lead_id: leadId,
      invoice_number: invoiceNumber,
      customer_name: customFields?.client_name || lead.customer_name,
      customer_email: lead.email,
      project_title: customFields?.project_details || `${lead.project_type} - ${lead.description}`,
      amount: calculatedAmount,
      currency: 'GBP',
      due_date: customFields?.due_date || dueDate.toISOString().split('T')[0],
      status: 'draft',
    };

    logStep("Invoice data prepared", { invoiceNumber, amount: calculatedAmount });

    // Get payment provider settings
    const { data: providerSettings } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_type', paymentProvider)
      .eq('is_active', true)
      .single();

    let externalInvoiceData = null;

    // Create invoice in external payment provider with retry logic
    if (providerSettings?.encrypted_credentials) {
      try {
        externalInvoiceData = await retryWithBackoff(async () => {
          switch (paymentProvider) {
            case 'stripe':
              return await createStripeInvoice(invoiceData, providerSettings.encrypted_credentials);
            case 'quickbooks':
              return await createQuickBooksInvoice(invoiceData, providerSettings.encrypted_credentials);
            case 'xero':
              return await createXeroInvoice(invoiceData, providerSettings.encrypted_credentials);
            default:
              throw new Error(`Unsupported payment provider: ${paymentProvider}`);
          }
        });

        logStep("External invoice created", { provider: paymentProvider, externalId: externalInvoiceData.external_id });
      } catch (error) {
        logStep("External invoice creation failed", { error: error.message });
        // Continue with local invoice creation even if external fails
      }
    }

    // Create invoice in Construyo CRM
    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('construyo_invoices')
      .insert({
        ...invoiceData,
        stripe_payment_intent_id: externalInvoiceData?.external_id,
        notes: externalInvoiceData?.payment_url ? `Payment URL: ${externalInvoiceData.payment_url}` : undefined,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    logStep("Invoice created in CRM", { invoiceId: createdInvoice.id });

    // Log analytics event
    await logAnalyticsEvent(
      supabase,
      user.id,
      createdInvoice.id,
      'invoice_created',
      {
        payment_provider: paymentProvider,
        amount: calculatedAmount,
        external_id: externalInvoiceData?.external_id,
        auto_generated: true,
      },
      paymentProvider
    );

    // Sync to Google Sheets if enabled
    if (syncToSheets && providerSettings?.zapier_webhook) {
      try {
        await retryWithBackoff(() => 
          syncToGoogleSheets(createdInvoice, providerSettings.zapier_webhook)
        );
        
        await logAnalyticsEvent(
          supabase,
          user.id,
          createdInvoice.id,
          'synced_to_sheets'
        );
      } catch (error) {
        logStep("Google Sheets sync failed", { error: error.message });
        // Don't fail the whole operation for sync errors
      }
    }

    // Update lead status to indicate invoice created
    await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', leadId);

    logStep("Invoice generation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: createdInvoice.id,
          invoice_number: createdInvoice.invoice_number,
          amount: createdInvoice.amount,
          currency: createdInvoice.currency,
          due_date: createdInvoice.due_date,
          payment_url: externalInvoiceData?.payment_url,
          external_id: externalInvoiceData?.external_id,
        },
        message: "Invoice generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in invoice generation", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/* 
SAMPLE CALL TO GENERATE INVOICE:

const generateInvoice = async () => {
  try {
    const response = await supabase.functions.invoke('invoice-generator', {
      body: {
        leadId: 'lead789',
        projectType: 'Kitchen',
        amount: 5000,
        customFields: {
          client_name: 'John Smith',
          project_details: 'Kitchen Renovation - Modern Design',
          due_date: '2024-03-15'
        },
        paymentProvider: 'stripe',
        syncToSheets: true
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log('Invoice generated:', response.data);
  } catch (error) {
    console.error('Failed to generate invoice:', error);
  }
};

// Call the function
generateInvoice();
*/