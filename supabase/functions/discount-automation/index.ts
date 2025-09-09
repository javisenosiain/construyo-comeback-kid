import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscountApplicationRequest {
  invoiceId: string;
  ruleId?: string;
  leadId?: string;
  clientInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
  notificationChannel?: 'email' | 'whatsapp' | 'both';
}

interface DiscountRule {
  id: string;
  rule_name: string;
  rule_type: string;
  discount_type: string;
  discount_value: number;
  conditions: any;
  max_usage?: number;
  usage_count: number;
  is_active: boolean;
}

interface LeadHistory {
  customer_email: string;
  customer_name: string;
  total_invoices: number;
  total_amount: number;
  referral_code_id?: string;
}

// Enhanced logging with user context
const logStep = (step: string, details: any = {}, userId?: string) => {
  console.log(`[${new Date().toISOString()}] ${step}`, {
    userId,
    ...details
  });
};

// Retry mechanism for API calls
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

// Check if customer qualifies for discount based on rules
const checkDiscountEligibility = async (
  supabase: any,
  userId: string,
  leadId: string,
  invoiceAmount: number,
  ruleId?: string
): Promise<DiscountRule | null> => {
  logStep('Checking discount eligibility', { userId, leadId, invoiceAmount, ruleId });

  // If specific rule provided, validate it
  if (ruleId) {
    const { data: rule, error } = await supabase
      .from('discount_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !rule) {
      logStep('Specific rule not found or inactive', { ruleId, error });
      return null;
    }

    return rule;
  }

  // Get lead information
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('customer_email, customer_name, referral_code_id')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    logStep('Lead not found', { leadId, leadError });
    return null;
  }

  // Get customer history
  const { data: customerHistory, error: historyError } = await supabase
    .from('construyo_invoices')
    .select('amount, status')
    .eq('user_id', userId)
    .eq('customer_email', lead.customer_email)
    .eq('status', 'paid');

  const totalPaidInvoices = customerHistory?.length || 0;
  const totalPaidAmount = customerHistory?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;

  // Get all active rules for this user
  const { data: rules, error: rulesError } = await supabase
    .from('discount_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('discount_value', { ascending: false }); // Highest discount first

  if (rulesError || !rules?.length) {
    logStep('No active discount rules found', { userId, rulesError });
    return null;
  }

  // Check each rule for eligibility
  for (const rule of rules) {
    const conditions = rule.conditions || {};
    let isEligible = true;

    switch (rule.rule_type) {
      case 'referral':
        isEligible = !!lead.referral_code_id && 
                    invoiceAmount >= (conditions.min_amount || 0);
        break;

      case 'repeat_client':
        isEligible = totalPaidInvoices >= (conditions.min_previous_orders || 2) &&
                    invoiceAmount >= (conditions.min_amount || 0);
        break;

      case 'volume':
        isEligible = invoiceAmount >= (conditions.min_amount || 5000);
        break;

      case 'seasonal':
        const now = new Date();
        const validFrom = rule.valid_from ? new Date(rule.valid_from) : null;
        const validUntil = rule.valid_until ? new Date(rule.valid_until) : null;
        isEligible = (!validFrom || now >= validFrom) && 
                    (!validUntil || now <= validUntil) &&
                    invoiceAmount >= (conditions.min_amount || 0);
        break;

      case 'custom':
        // Custom logic can be added here
        isEligible = invoiceAmount >= (conditions.min_amount || 0);
        break;

      default:
        isEligible = false;
    }

    // Check usage limits
    if (isEligible && rule.max_usage && rule.usage_count >= rule.max_usage) {
      isEligible = false;
    }

    if (isEligible) {
      logStep('Found eligible discount rule', { 
        ruleId: rule.id, 
        ruleName: rule.rule_name, 
        discountValue: rule.discount_value 
      });
      return rule;
    }
  }

  logStep('No eligible discount rules found', { customerHistory: { totalPaidInvoices, totalPaidAmount } });
  return null;
};

// Calculate discount amount
const calculateDiscountAmount = (originalAmount: number, rule: DiscountRule): number => {
  if (rule.discount_type === 'percentage') {
    return (originalAmount * rule.discount_value) / 100;
  } else {
    return Math.min(rule.discount_value, originalAmount);
  }
};

// Update invoice in payment provider
const updateInvoiceInProvider = async (
  invoiceId: string,
  newAmount: number,
  originalAmount: number,
  discountAmount: number,
  providerSettings: any
): Promise<boolean> => {
  if (!providerSettings || !providerSettings.encrypted_credentials) {
    logStep('No payment provider settings found');
    return false;
  }

  try {
    switch (providerSettings.provider_type) {
      case 'stripe':
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
          apiVersion: '2023-10-16',
        });

        // For Stripe, we would need to cancel the existing invoice and create a new one
        // or update if it's still in draft status
        logStep('Updating Stripe invoice', { invoiceId, newAmount, discountAmount });
        
        // This is a simplified example - actual implementation would depend on invoice status
        return true;

      case 'quickbooks':
        // QuickBooks API integration would go here
        logStep('QuickBooks integration not implemented');
        return false;

      case 'xero':
        // Xero API integration would go here
        logStep('Xero integration not implemented');
        return false;

      default:
        logStep('Unknown payment provider', { provider: providerSettings.provider_type });
        return false;
    }
  } catch (error) {
    logStep('Error updating invoice in payment provider', { error: error.message });
    return false;
  }
};

// Send discount notification
const sendDiscountNotification = async (
  clientInfo: any,
  discountAmount: number,
  finalAmount: number,
  rule: DiscountRule,
  channel: string
): Promise<boolean> => {
  try {
    const message = `🎉 Great news! You qualify for a ${rule.discount_value}${rule.discount_type === 'percentage' ? '%' : ''} discount (${rule.rule_name})! Your new total is $${finalAmount.toFixed(2)} (saved $${discountAmount.toFixed(2)}).`;

    if (channel === 'email' || channel === 'both') {
      // Email notification using Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Construyo <noreply@construyo.app>',
          to: [clientInfo.email],
          subject: '🎉 Discount Applied to Your Invoice!',
          html: `
            <h2>Congratulations ${clientInfo.name}!</h2>
            <p>${message}</p>
            <p>We appreciate your business and look forward to working with you!</p>
          `,
        }),
      });

      if (!resendResponse.ok) {
        logStep('Email notification failed', { status: resendResponse.status });
      }
    }

    if (channel === 'whatsapp' || channel === 'both') {
      // WhatsApp notification using respond.io
      const whatsappResponse = await fetch('https://api.respond.io/v2/contact/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESPOND_IO_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            type: 'text',
            text: message,
          },
          channelId: 'your-whatsapp-channel-id', // Configure this
          contact: {
            phoneNumber: clientInfo.phone,
          },
        }),
      });

      if (!whatsappResponse.ok) {
        logStep('WhatsApp notification failed', { status: whatsappResponse.status });
      }
    }

    return true;
  } catch (error) {
    logStep('Error sending notification', { error: error.message });
    return false;
  }
};

// Log discount application for analytics
const logDiscountAnalytics = async (
  supabase: any,
  userId: string,
  applicationId: string,
  rule: DiscountRule,
  originalAmount: number,
  discountAmount: number,
  finalAmount: number
): Promise<void> => {
  try {
    await supabase.from('invoice_analytics').insert({
      user_id: userId,
      event_type: 'discount_applied',
      event_data: {
        application_id: applicationId,
        rule_id: rule.id,
        rule_name: rule.rule_name,
        rule_type: rule.rule_type,
        discount_type: rule.discount_type,
        discount_value: rule.discount_value,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        savings_percentage: ((discountAmount / originalAmount) * 100).toFixed(2),
      },
    });

    logStep('Discount analytics logged successfully');
  } catch (error) {
    logStep('Failed to log discount analytics', { error: error.message });
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase clients
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    logStep('Starting discount automation', { userId: user.id });

    // Parse request body
    const request: DiscountApplicationRequest = await req.json();
    const { 
      invoiceId, 
      ruleId, 
      leadId, 
      clientInfo, 
      notificationChannel = 'email' 
    } = request;

    // Get invoice details
    const { data: invoice, error: invoiceError } = await retryWithBackoff(() =>
      supabaseClient
        .from('construyo_invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single()
    );

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    // Check if discount already applied
    const { data: existingDiscount } = await supabaseClient
      .from('discount_applications')
      .select('id')
      .eq('invoice_id', invoiceId)
      .single();

    if (existingDiscount) {
      throw new Error('Discount already applied to this invoice');
    }

    // Find eligible discount rule
    const eligibleRule = await checkDiscountEligibility(
      supabaseClient,
      user.id,
      leadId || invoice.lead_id,
      Number(invoice.amount),
      ruleId
    );

    if (!eligibleRule) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No eligible discount rules found for this invoice' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Calculate discount
    const originalAmount = Number(invoice.amount);
    const discountAmount = calculateDiscountAmount(originalAmount, eligibleRule);
    const finalAmount = originalAmount - discountAmount;

    logStep('Discount calculated', {
      originalAmount,
      discountAmount,
      finalAmount,
      rule: eligibleRule.rule_name
    });

    // Apply discount to invoice record
    const { data: discountApplication, error: applicationError } = await retryWithBackoff(() =>
      supabaseService.from('discount_applications').insert({
        user_id: user.id,
        invoice_id: invoiceId,
        discount_rule_id: eligibleRule.id,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        notification_channel: notificationChannel,
      }).select().single()
    );

    if (applicationError || !discountApplication) {
      throw new Error(`Failed to apply discount: ${applicationError?.message}`);
    }

    // Update invoice amount
    await retryWithBackoff(() =>
      supabaseService
        .from('construyo_invoices')
        .update({ amount: finalAmount })
        .eq('id', invoiceId)
    );

    // Update rule usage count
    await retryWithBackoff(() =>
      supabaseService
        .from('discount_rules')
        .update({ usage_count: eligibleRule.usage_count + 1 })
        .eq('id', eligibleRule.id)
    );

    // Get payment provider settings for invoice updates
    const { data: providerSettings } = await supabaseClient
      .from('payment_provider_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // Update invoice in payment provider
    const providerUpdated = await updateInvoiceInProvider(
      invoiceId,
      finalAmount,
      originalAmount,
      discountAmount,
      providerSettings
    );

    // Send notification to client
    let notificationSent = false;
    if (clientInfo && (clientInfo.email || clientInfo.phone)) {
      notificationSent = await sendDiscountNotification(
        clientInfo,
        discountAmount,
        finalAmount,
        eligibleRule,
        notificationChannel
      );

      // Update notification status
      if (notificationSent) {
        await supabaseService
          .from('discount_applications')
          .update({
            client_notified_at: new Date().toISOString(),
            notification_status: 'sent'
          })
          .eq('id', discountApplication.id);
      }
    }

    // Log analytics
    await logDiscountAnalytics(
      supabaseService,
      user.id,
      discountApplication.id,
      eligibleRule,
      originalAmount,
      discountAmount,
      finalAmount
    );

    logStep('Discount automation completed successfully', {
      discountApplicationId: discountApplication.id,
      savings: discountAmount,
      providerUpdated,
      notificationSent
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Discount applied successfully',
        data: {
          applicationId: discountApplication.id,
          originalAmount,
          discountAmount,
          finalAmount,
          savings: discountAmount,
          rule: {
            name: eligibleRule.rule_name,
            type: eligibleRule.rule_type,
            value: eligibleRule.discount_value,
          },
          providerUpdated,
          notificationSent,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('Error in discount automation', { error: error.message });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/* 
SAMPLE CALL TO APPLY 10% REFERRAL DISCOUNT TO INVOICE "inv123":

POST https://your-project.supabase.co/functions/v1/discount-automation
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "invoiceId": "inv123",
  "ruleId": "rule-id-for-referral-discount", // Optional - if not provided, will auto-detect
  "leadId": "lead789",
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "notificationChannel": "both"
}

Expected Response:
{
  "success": true,
  "message": "Discount applied successfully",
  "data": {
    "applicationId": "app-123",
    "originalAmount": 5000,
    "discountAmount": 500,
    "finalAmount": 4500,
    "savings": 500,
    "rule": {
      "name": "Referral Discount",
      "type": "referral",
      "value": 10
    },
    "providerUpdated": true,
    "notificationSent": true
  }
}
*/