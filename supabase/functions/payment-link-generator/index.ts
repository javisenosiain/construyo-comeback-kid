import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentLinkRequest {
  invoiceId: string;
  deliveryMethod: 'email' | 'whatsapp';
  recipientContact: string;
  customMessage?: string;
}

// Enhanced logging with timestamp and context
const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [PAYMENT-LINK-GEN] ${step}${detailsStr}`);
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

// Generate Stripe payment link
const generateStripePaymentLink = async (invoiceData: any, apiKey: string) => {
  logStep("Creating Stripe payment link");
  
  const response = await fetch('https://api.stripe.com/v1/payment_links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'line_items[0][price_data][currency]': invoiceData.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': invoiceData.project_title,
      'line_items[0][price_data][unit_amount]': (invoiceData.amount * 100).toString(),
      'line_items[0][quantity]': '1',
      'metadata[invoice_id]': invoiceData.id,
      'metadata[customer_email]': invoiceData.customer_email,
      'after_completion[type]': 'redirect',
      'after_completion[redirect][url]': `${Deno.env.get("SUPABASE_URL")}/payment-success?invoice=${invoiceData.id}`,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe API error: ${error}`);
  }
  
  const paymentLink = await response.json();
  return paymentLink.url;
};

// Send via email using Resend
const sendEmailPaymentLink = async (
  recipientEmail: string,
  paymentLink: string,
  invoiceData: any,
  customMessage?: string
) => {
  logStep("Sending payment link via email");
  
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  
  const emailContent = `
    <h2>Payment Request - ${invoiceData.invoice_number}</h2>
    <p>Dear ${invoiceData.customer_name},</p>
    
    ${customMessage ? `<p>${customMessage}</p>` : ''}
    
    <p>Please find your invoice details below:</p>
    <ul>
      <li><strong>Invoice Number:</strong> ${invoiceData.invoice_number}</li>
      <li><strong>Project:</strong> ${invoiceData.project_title}</li>
      <li><strong>Amount:</strong> ${invoiceData.currency} ${invoiceData.amount}</li>
      <li><strong>Due Date:</strong> ${invoiceData.due_date}</li>
    </ul>
    
    <p>
      <a href="${paymentLink}" 
         style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Pay Now
      </a>
    </p>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    <p>Best regards,<br>Your Construction Team</p>
  `;
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'invoices@construyo.app',
      to: [recipientEmail],
      subject: `Payment Request - ${invoiceData.invoice_number}`,
      html: emailContent,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email API error: ${error}`);
  }
  
  const result = await response.json();
  return result.id;
};

// Send via WhatsApp using respond.io
const sendWhatsAppPaymentLink = async (
  recipientPhone: string,
  paymentLink: string,
  invoiceData: any,
  customMessage?: string
) => {
  logStep("Sending payment link via WhatsApp");
  
  const respondIoApiKey = Deno.env.get("RESPOND_IO_API_KEY");
  if (!respondIoApiKey) {
    throw new Error("RESPOND_IO_API_KEY not configured");
  }
  
  const message = `
💼 *Payment Request - ${invoiceData.invoice_number}*

Hello ${invoiceData.customer_name},

${customMessage || 'Please find your invoice payment link below:'}

📋 *Invoice Details:*
• Project: ${invoiceData.project_title}
• Amount: ${invoiceData.currency} ${invoiceData.amount}
• Due Date: ${invoiceData.due_date}

💳 *Pay Now:* ${paymentLink}

If you have any questions, please reply to this message.
  `.trim();
  
  const response = await fetch('https://api.respond.io/v2/contact/message', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${respondIoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channelId: "whatsapp",
      contact: {
        phone: recipientPhone
      },
      message: {
        type: "text",
        text: message
      }
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
  
  const result = await response.json();
  return result.messageId;
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

// Log message delivery
const logMessageDelivery = async (
  supabase: any,
  userId: string,
  invoiceId: string,
  messageType: string,
  recipient: string,
  messageContent: string,
  externalId?: string
) => {
  await supabase.from('message_delivery_logs').insert({
    user_id: userId,
    lead_id: null, // This is for invoice, not lead
    message_type: messageType,
    recipient_email: messageType === 'email' ? recipient : null,
    recipient_phone: messageType === 'whatsapp' ? recipient : null,
    message_content: messageContent,
    external_message_id: externalId,
    delivery_status: 'sent',
    sent_at: new Date().toISOString(),
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Payment link generation request started");

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
    const body: PaymentLinkRequest = await req.json();
    const { invoiceId, deliveryMethod, recipientContact, customMessage } = body;

    logStep("Request parsed", { invoiceId, deliveryMethod });

    // Fetch invoice data
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('construyo_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoiceData) {
      throw new Error(`Invoice not found: ${invoiceError?.message || 'Invalid invoice ID'}`);
    }

    logStep("Invoice data retrieved", { invoiceId: invoiceData.id, amount: invoiceData.amount });

    // Get payment provider settings (assuming Stripe for now)
    const { data: providerSettings } = await supabase
      .from('payment_provider_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_type', 'stripe')
      .eq('is_active', true)
      .single();

    if (!providerSettings?.encrypted_credentials) {
      throw new Error("Stripe payment provider not configured");
    }

    // Generate payment link with retry logic
    const paymentLink = await retryWithBackoff(async () => {
      // In production, decrypt the credentials properly
      const apiKey = atob(providerSettings.encrypted_credentials); // Simple decode for demo
      return await generateStripePaymentLink(invoiceData, apiKey);
    });

    logStep("Payment link generated", { paymentLink });

    // Send payment link based on delivery method with retry logic
    let deliveryResult: string | undefined;
    const messageContent = `Payment link for invoice ${invoiceData.invoice_number}: ${paymentLink}`;

    try {
      deliveryResult = await retryWithBackoff(async () => {
        if (deliveryMethod === 'email') {
          return await sendEmailPaymentLink(recipientContact, paymentLink, invoiceData, customMessage);
        } else {
          return await sendWhatsAppPaymentLink(recipientContact, paymentLink, invoiceData, customMessage);
        }
      });

      logStep("Payment link sent successfully", { deliveryMethod, deliveryResult });
    } catch (error) {
      logStep("Payment link delivery failed", { error: error.message });
      // Continue with logging even if delivery fails
    }

    // Log message delivery
    await logMessageDelivery(
      supabase,
      user.id,
      invoiceData.id,
      deliveryMethod,
      recipientContact,
      messageContent,
      deliveryResult
    );

    // Log analytics event
    await logAnalyticsEvent(
      supabase,
      user.id,
      invoiceData.id,
      'payment_link_shared',
      {
        delivery_method: deliveryMethod,
        recipient: recipientContact,
        payment_link: paymentLink,
        delivery_successful: !!deliveryResult,
      }
    );

    // Update invoice with payment link
    await supabase
      .from('construyo_invoices')
      .update({ 
        notes: invoiceData.notes 
          ? `${invoiceData.notes}\n\nPayment link shared via ${deliveryMethod}: ${paymentLink}`
          : `Payment link shared via ${deliveryMethod}: ${paymentLink}`
      })
      .eq('id', invoiceId);

    logStep("Payment link sharing completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink,
        deliveryResult,
        message: `Payment link generated and ${deliveryResult ? 'sent' : 'ready to send'} via ${deliveryMethod}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in payment link generation", { message: errorMessage });

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
SAMPLE CALL TO SHARE PAYMENT LINK:

const sharePaymentLink = async () => {
  try {
    const response = await supabase.functions.invoke('payment-link-generator', {
      body: {
        invoiceId: 'inv123',
        deliveryMethod: 'email',
        recipientContact: 'customer@example.com',
        customMessage: 'Thank you for choosing our services. Please complete your payment at your earliest convenience.'
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log('Payment link shared:', response.data);
  } catch (error) {
    console.error('Failed to share payment link:', error);
  }
};

// Call the function
sharePaymentLink();
*/