import { BaseIntegrationService } from './BaseIntegrationService';

export class AirtableService extends BaseIntegrationService {
  private baseUrl = 'https://api.airtable.com/v0';

  constructor(rateLimiter: any, retryHandler: any, logger: any) {
    super('airtable', rateLimiter, retryHandler, logger);
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'create_project':
        return await this.createProject(data);
      case 'update_project':
        return await this.updateProject(data.projectId, data.updates);
      case 'sync_crm_data':
        return await this.syncCRMData(data);
      case 'track_lead':
        return await this.trackLead(data);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async createProject(projectData: any): Promise<any> {
    const baseId = this.config?.baseId;
    const tableId = this.config?.projectTableId || 'Projects';

    if (!baseId) {
      throw new Error('Airtable base ID not configured');
    }

    const url = `${this.baseUrl}/${baseId}/${tableId}`;
    
    const payload = {
      fields: {
        'Project Name': projectData.name,
        'Client Name': projectData.clientName,
        'Status': projectData.status || 'Active',
        'Created Date': new Date().toISOString(),
        'Project Type': projectData.type,
        'Budget': projectData.budget,
        'Description': projectData.description,
        'Lead Source': projectData.leadSource,
        'CRM ID': projectData.crmId
      }
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify({ records: [payload] })
    });
  }

  async updateProject(projectId: string, updates: any): Promise<any> {
    const baseId = this.config?.baseId;
    const tableId = this.config?.projectTableId || 'Projects';

    const url = `${this.baseUrl}/${baseId}/${tableId}/${projectId}`;
    
    const payload = {
      fields: {
        ...updates,
        'Last Updated': new Date().toISOString()
      }
    };

    return await this.makeApiCall(url, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async syncCRMData(crmData: any): Promise<any> {
    // Sync data from Construyo CRM to Airtable
    const results = [];
    
    for (const record of crmData.records) {
      try {
        let result;
        if (record.airtableId) {
          result = await this.updateProject(record.airtableId, record);
        } else {
          result = await this.createProject(record);
        }
        results.push({ success: true, recordId: record.id, result });
      } catch (error) {
        results.push({ success: false, recordId: record.id, error: error.message });
      }
    }

    return { synced: results.filter(r => r.success).length, errors: results.filter(r => !r.success) };
  }

  async trackLead(leadData: any): Promise<any> {
    const baseId = this.config?.baseId;
    const tableId = this.config?.leadTableId || 'Leads';

    const url = `${this.baseUrl}/${baseId}/${tableId}`;
    
    const payload = {
      fields: {
        'Lead ID': leadData.id,
        'Customer Name': leadData.customerName,
        'Email': leadData.email,
        'Phone': leadData.phone,
        'Status': leadData.status,
        'Priority': leadData.priority,
        'Source': leadData.source,
        'Created Date': leadData.createdAt,
        'Value': leadData.estimatedValue,
        'Notes': leadData.notes
      }
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify({ records: [payload] })
    });
  }

  async getStatus(): Promise<any> {
    return {
      service: 'airtable',
      enabled: this.config?.enabled || false,
      configured: !!(this.config?.apiKey && this.config?.baseId),
      baseId: this.config?.baseId ? '***configured***' : null,
      lastActivity: await this.getLastActivity()
    };
  }
}