import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentStatusRequest {
  invoiceId?: string;
  stripePaymentIntentId?: string;
  checkAll?: boolean;
}

// Enhanced logging with timestamp and context
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [PAYMENT-STATUS-TRACKER] ${step}${detailsStr}`);
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

// Check Stripe payment status
const checkStripePaymentStatus = async (paymentIntentId: string, apiKey: string) => {
  logStep("Checking Stripe payment status", { paymentIntentId });
  
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe API error: ${error}`);
  }
  
  const paymentIntent = await response.json();
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency.toUpperCase(),
    created: new Date(paymentIntent.created * 1000).toISOString(),
    metadata: paymentIntent.metadata,
  };
};

// Log analytics event
const logAnalyticsEvent = async (
  supabase: any,
  userId: string,
  invoiceId: string,
  eventType: string,
  eventData: any = {}
) => {
  await supabase.from('invoice_analytics').insert({
    user_id: userId,
    invoice_id: invoiceId,
    event_type: eventType,
    event_data: eventData,
  });
};

// Update invoice status based on payment status
const updateInvoiceStatus = async (
  supabase: any,
  invoiceId: string,
  paymentStatus: string,
  paymentData: any
) => {
  let invoiceStatus = 'draft';
  let paidDate = null;
  
  switch (paymentStatus) {
    case 'succeeded':
      invoiceStatus = 'paid';
      paidDate = new Date().toISOString();
      break;
    case 'processing':
      invoiceStatus = 'processing';
      break;
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      invoiceStatus = 'pending';
      break;
    case 'canceled':
      invoiceStatus = 'cancelled';
      break;
    default:
      invoiceStatus = 'pending';
  }
  
  const updateData: any = { status: invoiceStatus };
  if (paidDate) {
    updateData.paid_date = paidDate;
  }
  
  await supabase
    .from('construyo_invoices')
    .update(updateData)
    .eq('id', invoiceId);
  
  return invoiceStatus;
};

// Handle GDPR-compliant logging (only log necessary business data)
const logPaymentEvent = async (
  supabase: any,
  userId: string,
  invoiceId: string,
  eventType: string,
  paymentData: any
) => {
  // Only log business-relevant data, not personal information
  const gdprCompliantData = {
    amount: paymentData.amount,
    currency: paymentData.currency,
    payment_status: paymentData.status,
    timestamp: paymentData.created || new Date().toISOString(),
  };
  
  await logAnalyticsEvent(
    supabase,
    userId,
    invoiceId,
    eventType,
    gdprCompliantData
  );
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment status tracking request started");

    // Initialize Supabase client with service role key for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    const body: PaymentStatusRequest = await req.json();
    const { invoiceId, stripePaymentIntentId, checkAll = false } = body;

    logStep("Request parsed", { invoiceId, stripePaymentIntentId, checkAll });

    let invoicesToCheck = [];

    if (checkAll) {
      // Check all pending invoices for the authenticated user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("No authorization header provided for bulk check");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }

      const { data: pendingInvoices } = await supabase
        .from('construyo_invoices')
        .select('*')
        .eq('user_id', userData.user.id)
        .in('status', ['pending', 'processing'])
        .not('stripe_payment_intent_id', 'is', null);

      invoicesToCheck = pendingInvoices || [];
    } else if (invoiceId) {
      // Check specific invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('construyo_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoiceData) {
        throw new Error(`Invoice not found: ${invoiceError?.message || 'Invalid invoice ID'}`);
      }

      invoicesToCheck = [invoiceData];
    } else {
      throw new Error("Either invoiceId or checkAll must be provided");
    }

    logStep("Invoices to check", { count: invoicesToCheck.length });

    // Get Stripe API key (assuming Stripe for now)
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const results = [];

    for (const invoice of invoicesToCheck) {
      try {
        const paymentIntentId = stripePaymentIntentId || invoice.stripe_payment_intent_id;
        
        if (!paymentIntentId) {
          logStep("Skipping invoice without payment intent", { invoiceId: invoice.id });
          continue;
        }

        // Check payment status with retry logic
        const paymentData = await retryWithBackoff(async () => {
          return await checkStripePaymentStatus(paymentIntentId, stripeSecretKey);
        });

        logStep("Payment status checked", { 
          invoiceId: invoice.id, 
          status: paymentData.status 
        });

        // Update invoice status
        const newStatus = await updateInvoiceStatus(
          supabase,
          invoice.id,
          paymentData.status,
          paymentData
        );

        // Log payment event (GDPR-compliant)
        await logPaymentEvent(
          supabase,
          invoice.user_id,
          invoice.id,
          `payment_${paymentData.status}`,
          paymentData
        );

        // Log analytics for status change if status actually changed
        if (newStatus !== invoice.status) {
          await logAnalyticsEvent(
            supabase,
            invoice.user_id,
            invoice.id,
            'invoice_status_updated',
            {
              old_status: invoice.status,
              new_status: newStatus,
              payment_amount: paymentData.amount,
              payment_currency: paymentData.currency,
            }
          );
        }

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          oldStatus: invoice.status,
          newStatus,
          paymentStatus: paymentData.status,
          amount: paymentData.amount,
          currency: paymentData.currency,
        });

      } catch (error) {
        logStep("Error checking payment for invoice", { 
          invoiceId: invoice.id, 
          error: error.message 
        });
        
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          error: error.message,
        });
      }
    }

    logStep("Payment status tracking completed", { processedCount: results.length });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        processedCount: results.length,
        message: "Payment status tracking completed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in payment status tracking", { message: errorMessage });

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
SAMPLE CALLS:

// Check specific invoice payment status
const checkInvoicePayment = async () => {
  try {
    const response = await supabase.functions.invoke('payment-status-tracker', {
      body: {
        invoiceId: 'inv123'
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log('Payment status checked:', response.data);
  } catch (error) {
    console.error('Failed to check payment status:', error);
  }
};

// Check all pending payments for authenticated user
const checkAllPendingPayments = async () => {
  try {
    const response = await supabase.functions.invoke('payment-status-tracker', {
      body: {
        checkAll: true
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log('All payments checked:', response.data);
  } catch (error) {
    console.error('Failed to check all payments:', error);
  }
};
*/