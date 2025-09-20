import { BaseIntegrationService } from './BaseIntegrationService';

export class StripeService extends BaseIntegrationService {
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(rateLimiter: any, retryHandler: any, logger: any) {
    super('stripe', rateLimiter, retryHandler, logger);
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'create_payment_link':
        return await this.createPaymentLink(data);
      case 'create_invoice':
        return await this.createInvoice(data);
      case 'process_payment':
        return await this.processPayment(data);
      case 'create_customer':
        return await this.createCustomer(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async createPaymentLink(linkData: any): Promise<any> {
    const url = `${this.baseUrl}/payment_links`;
    
    const payload = {
      line_items: [{
        price_data: {
          currency: linkData.currency || 'usd',
          product_data: {
            name: linkData.productName,
            description: linkData.description
          },
          unit_amount: Math.round(linkData.amount * 100) // Convert to cents
        },
        quantity: linkData.quantity || 1
      }],
      metadata: {
        ...linkData.metadata,
        source: 'construyo_crm'
      }
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: this.createFormData(payload)
    });
  }

  async createInvoice(invoiceData: any): Promise<any> {
    // First create or get customer
    let customerId = invoiceData.customerId;
    if (!customerId) {
      const customer = await this.createCustomer({
        email: invoiceData.customerEmail,
        name: invoiceData.customerName
      });
      customerId = customer.id;
    }

    // Create invoice
    const url = `${this.baseUrl}/invoices`;
    
    const payload = {
      customer: customerId,
      metadata: {
        crm_invoice_id: invoiceData.crmInvoiceId,
        source: 'construyo_crm'
      }
    };

    const invoice = await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: this.createFormData(payload)
    });

    // Add line items
    for (const item of invoiceData.lineItems) {
      await this.addInvoiceItem(invoice.id, item);
    }

    // Finalize invoice
    const finalizeUrl = `${this.baseUrl}/invoices/${invoice.id}/finalize`;
    return await this.makeApiCall(finalizeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  async addInvoiceItem(invoiceId: string, item: any): Promise<any> {
    const url = `${this.baseUrl}/invoiceitems`;
    
    const payload = {
      customer: item.customerId,
      invoice: invoiceId,
      amount: Math.round(item.amount * 100),
      currency: item.currency || 'usd',
      description: item.description
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: this.createFormData(payload)
    });
  }

  async processPayment(paymentData: any): Promise<any> {
    const url = `${this.baseUrl}/payment_intents`;
    
    const payload = {
      amount: Math.round(paymentData.amount * 100),
      currency: paymentData.currency || 'usd',
      customer: paymentData.customerId,
      metadata: {
        ...paymentData.metadata,
        source: 'construyo_crm'
      }
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: this.createFormData(payload)
    });
  }

  async createCustomer(customerData: any): Promise<any> {
    const url = `${this.baseUrl}/customers`;
    
    const payload = {
      email: customerData.email,
      name: customerData.name,
      metadata: {
        crm_customer_id: customerData.crmCustomerId,
        source: 'construyo_crm'
      }
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config?.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: this.createFormData(payload)
    });
  }

  private createFormData(data: any): string {
    const formData = new URLSearchParams();
    
    const addToFormData = (obj: any, prefix = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const formKey = prefix ? `${prefix}[${key}]` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            addToFormData(value, formKey);
          } else {
            formData.append(formKey, value);
          }
        }
      }
    };
    
    addToFormData(data);
    return formData.toString();
  }

  async getStatus(): Promise<any> {
    return {
      service: 'stripe',
      enabled: this.config?.enabled || false,
      configured: !!this.config?.secretKey,
      testMode: this.config?.secretKey?.startsWith('sk_test_'),
      lastActivity: await this.getLastActivity()
    };
  }
}