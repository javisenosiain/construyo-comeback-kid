import { BaseIntegrationService } from './BaseIntegrationService';

export class ZapierService extends BaseIntegrationService {
  constructor(rateLimiter: any, retryHandler: any, logger: any) {
    super('zapier', rateLimiter, retryHandler, logger);
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    const webhookUrl = this.config?.webhookUrl;
    
    if (!webhookUrl) {
      throw new Error('Zapier webhook URL not configured');
    }

    const payload = {
      action,
      data,
      metadata,
      timestamp: new Date().toISOString(),
      source: 'construyo_integration_manager'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Construyo-Integration/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status} ${response.statusText}`);
    }

    return await response.json().catch(() => ({ status: 'triggered' }));
  }

  async getStatus(): Promise<any> {
    return {
      service: 'zapier',
      enabled: this.config?.enabled || false,
      configured: !!this.config?.webhookUrl,
      webhookUrl: this.config?.webhookUrl ? '***configured***' : null,
      lastActivity: await this.getLastActivity()
    };
  }

  // Specific method for lead sync workflow
  async triggerLeadSync(leadId: string, leadData: any): Promise<any> {
    return await this.executeAction('lead_sync', {
      leadId,
      lead: leadData,
      workflow: 'lead_to_crm_sync'
    }, { leadId });
  }

  // Method for invoice creation workflow
  async triggerInvoiceCreation(invoiceId: string, invoiceData: any): Promise<any> {
    return await this.executeAction('invoice_creation', {
      invoiceId,
      invoice: invoiceData,
      workflow: 'invoice_processing'
    }, { invoiceId });
  }

  // Method for social media post workflow
  async triggerSocialPost(postData: any): Promise<any> {
    return await this.executeAction('social_post', {
      post: postData,
      workflow: 'social_media_automation'
    });
  }
}