import { BaseIntegrationService } from './BaseIntegrationService';

export class BufferCanvaService extends BaseIntegrationService {
  private provider: 'buffer' | 'canva';
  private baseUrl: string;

  constructor(rateLimiter: any, retryHandler: any, logger: any, provider: 'buffer' | 'canva') {
    super(provider, rateLimiter, retryHandler, logger);
    this.provider = provider;
    this.baseUrl = provider === 'buffer' 
      ? 'https://api.bufferapp.com/1' 
      : 'https://api.canva.com/rest/v1';
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    if (this.provider === 'buffer') {
      return await this.executeBufferAction(action, data, metadata);
    } else {
      return await this.executeCanvaAction(action, data, metadata);
    }
  }

  private async executeBufferAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'schedule_post':
        return await this.schedulePost(data);
      case 'get_profiles':
        return await this.getBufferProfiles();
      case 'get_scheduled_posts':
        return await this.getScheduledPosts(data);
      case 'delete_post':
        return await this.deletePost(data.postId);
      default:
        throw new Error(`Unknown Buffer action: ${action}`);
    }
  }

  private async executeCanvaAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'create_design':
        return await this.createDesign(data);
      case 'get_design':
        return await this.getDesign(data.designId);
      case 'export_design':
        return await this.exportDesign(data);
      case 'get_templates':
        return await this.getTemplates(data);
      default:
        throw new Error(`Unknown Canva action: ${action}`);
    }
  }

  // Buffer Methods
  async schedulePost(postData: any): Promise<any> {
    const url = `${this.baseUrl}/updates/create.json`;
    
    const payload = {
      text: postData.text,
      profile_ids: postData.profileIds,
      scheduled_at: postData.scheduledAt,
      ...(postData.media && { media: postData.media }),
      ...(postData.link && { link: postData.link })
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getBufferProfiles(): Promise<any> {
    const url = `${this.baseUrl}/profiles.json`;
    return await this.makeApiCall(url);
  }

  async getScheduledPosts(queryData: any): Promise<any> {
    const profileId = queryData.profileId;
    const url = `${this.baseUrl}/profiles/${profileId}/updates/pending.json`;
    return await this.makeApiCall(url);
  }

  async deletePost(postId: string): Promise<any> {
    const url = `${this.baseUrl}/updates/${postId}/destroy.json`;
    return await this.makeApiCall(url, { method: 'POST' });
  }

  // Canva Methods
  async createDesign(designData: any): Promise<any> {
    const url = `${this.baseUrl}/designs`;
    
    const payload = {
      design_type: designData.designType || 'Instagram Post',
      name: designData.name,
      ...(designData.templateId && { template_id: designData.templateId })
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getDesign(designId: string): Promise<any> {
    const url = `${this.baseUrl}/designs/${designId}`;
    return await this.makeApiCall(url);
  }

  async exportDesign(exportData: any): Promise<any> {
    const url = `${this.baseUrl}/designs/${exportData.designId}/export`;
    
    const payload = {
      format: exportData.format || 'png',
      quality: exportData.quality || 'standard'
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getTemplates(queryData: any): Promise<any> {
    const url = `${this.baseUrl}/design-templates`;
    const params = new URLSearchParams({
      ...(queryData.category && { category: queryData.category }),
      ...(queryData.query && { query: queryData.query }),
      ...(queryData.limit && { limit: queryData.limit.toString() })
    });

    return await this.makeApiCall(`${url}?${params}`);
  }

  // Combined workflow methods
  async createAndScheduleSocialPost(workflowData: any): Promise<any> {
    let mediaUrl = workflowData.mediaUrl;
    
    // If we need to create a design first
    if (workflowData.createDesign && this.provider === 'canva') {
      const design = await this.createDesign({
        designType: workflowData.designType || 'Instagram Post',
        name: workflowData.designName || 'Social Media Post',
        templateId: workflowData.templateId
      });

      // Export the design
      const exportResult = await this.exportDesign({
        designId: design.id,
        format: 'png',
        quality: 'standard'
      });

      mediaUrl = exportResult.url;
    }

    // Schedule the post if this is Buffer
    if (this.provider === 'buffer') {
      return await this.schedulePost({
        text: workflowData.text,
        profileIds: workflowData.profileIds,
        scheduledAt: workflowData.scheduledAt,
        media: mediaUrl ? { photo: mediaUrl } : undefined,
        link: workflowData.link
      });
    }

    return { designCreated: true, mediaUrl };
  }

  async getStatus(): Promise<any> {
    try {
      if (this.provider === 'buffer') {
        const profiles = await this.getBufferProfiles();
        return {
          service: 'buffer',
          enabled: this.config?.enabled || false,
          configured: !!this.config?.apiKey,
          connected: true,
          profileCount: profiles.length,
          lastActivity: await this.getLastActivity()
        };
      } else {
        // For Canva, we'll just check if the API key is configured
        return {
          service: 'canva',
          enabled: this.config?.enabled || false,
          configured: !!this.config?.apiKey,
          connected: !!this.config?.apiKey,
          lastActivity: await this.getLastActivity()
        };
      }
    } catch (error) {
      return {
        service: this.provider,
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: false,
        error: error.message,
        lastActivity: await this.getLastActivity()
      };
    }
  }
}