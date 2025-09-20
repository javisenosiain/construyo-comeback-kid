import { BaseIntegrationService } from './BaseIntegrationService';

export class WebflowTypedreamService extends BaseIntegrationService {
  private provider: 'webflow' | 'typedream';
  private baseUrl: string;

  constructor(rateLimiter: any, retryHandler: any, logger: any, provider: 'webflow' | 'typedream') {
    super(provider, rateLimiter, retryHandler, logger);
    this.provider = provider;
    this.baseUrl = provider === 'webflow' 
      ? 'https://api.webflow.com/v2' 
      : 'https://api.typedream.com/v1';
  }

  async executeAction(action: string, data: any, metadata?: any): Promise<any> {
    if (this.provider === 'webflow') {
      return await this.executeWebflowAction(action, data, metadata);
    } else {
      return await this.executeTypedreamAction(action, data, metadata);
    }
  }

  private async executeWebflowAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'deploy_microsite':
        return await this.deployWebflowMicrosite(data);
      case 'update_site':
        return await this.updateWebflowSite(data);
      case 'get_sites':
        return await this.getWebflowSites();
      case 'create_cms_item':
        return await this.createWebflowCMSItem(data);
      default:
        throw new Error(`Unknown Webflow action: ${action}`);
    }
  }

  private async executeTypedreamAction(action: string, data: any, metadata?: any): Promise<any> {
    switch (action) {
      case 'deploy_microsite':
        return await this.deployTypedreamMicrosite(data);
      case 'update_site':
        return await this.updateTypedreamSite(data);
      case 'get_sites':
        return await this.getTypedreamSites();
      case 'create_page':
        return await this.createTypedreamPage(data);
      default:
        throw new Error(`Unknown Typedream action: ${action}`);
    }
  }

  // Webflow Methods
  async deployWebflowMicrosite(micrositeData: any): Promise<any> {
    // First, create or update the site
    const site = await this.createOrUpdateWebflowSite(micrositeData);
    
    // Then publish the site
    const publishUrl = `${this.baseUrl}/sites/${site.id}/publish`;
    const publishResult = await this.makeApiCall(publishUrl, {
      method: 'POST',
      body: JSON.stringify({
        domains: micrositeData.domains || []
      })
    });

    return {
      siteId: site.id,
      published: true,
      url: site.defaultDomain,
      customDomains: micrositeData.domains,
      publishResult
    };
  }

  async createOrUpdateWebflowSite(siteData: any): Promise<any> {
    if (siteData.siteId) {
      return await this.updateWebflowSite(siteData);
    }

    const url = `${this.baseUrl}/sites`;
    
    const payload = {
      displayName: siteData.name,
      shortName: siteData.slug || siteData.name.toLowerCase().replace(/\s+/g, '-'),
      workspaceId: this.config?.workspaceId
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateWebflowSite(updateData: any): Promise<any> {
    const url = `${this.baseUrl}/sites/${updateData.siteId}`;
    
    const payload = {
      displayName: updateData.name,
      ...(updateData.customCode && { customCode: updateData.customCode })
    };

    return await this.makeApiCall(url, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async getWebflowSites(): Promise<any> {
    const url = `${this.baseUrl}/sites`;
    return await this.makeApiCall(url);
  }

  async createWebflowCMSItem(itemData: any): Promise<any> {
    const url = `${this.baseUrl}/collections/${itemData.collectionId}/items`;
    
    const payload = {
      isArchived: false,
      isDraft: false,
      fieldData: itemData.fields
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Typedream Methods
  async deployTypedreamMicrosite(micrositeData: any): Promise<any> {
    const site = await this.createOrUpdateTypedreamSite(micrositeData);
    
    // Typedream auto-publishes, so we just need to return the site info
    return {
      siteId: site.id,
      published: true,
      url: site.url,
      editUrl: site.editUrl
    };
  }

  async createOrUpdateTypedreamSite(siteData: any): Promise<any> {
    if (siteData.siteId) {
      return await this.updateTypedreamSite(siteData);
    }

    const url = `${this.baseUrl}/sites`;
    
    const payload = {
      title: siteData.name,
      slug: siteData.slug || siteData.name.toLowerCase().replace(/\s+/g, '-'),
      content: siteData.content || this.generateDefaultTypedreamContent(siteData),
      theme: siteData.theme || 'minimal',
      customDomain: siteData.customDomain
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateTypedreamSite(updateData: any): Promise<any> {
    const url = `${this.baseUrl}/sites/${updateData.siteId}`;
    
    const payload = {
      title: updateData.name,
      content: updateData.content,
      theme: updateData.theme,
      customDomain: updateData.customDomain
    };

    return await this.makeApiCall(url, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async getTypedreamSites(): Promise<any> {
    const url = `${this.baseUrl}/sites`;
    return await this.makeApiCall(url);
  }

  async createTypedreamPage(pageData: any): Promise<any> {
    const url = `${this.baseUrl}/sites/${pageData.siteId}/pages`;
    
    const payload = {
      title: pageData.title,
      slug: pageData.slug,
      content: pageData.content,
      isPublished: pageData.isPublished !== false
    };

    return await this.makeApiCall(url, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  private generateDefaultTypedreamContent(siteData: any): any {
    return {
      blocks: [
        {
          type: 'hero',
          content: {
            headline: siteData.headline || `Welcome to ${siteData.name}`,
            subheadline: siteData.description || 'Professional services you can trust',
            backgroundImage: siteData.heroImage,
            ctaText: siteData.ctaText || 'Get Started',
            ctaUrl: siteData.ctaUrl || '#contact'
          }
        },
        {
          type: 'about',
          content: {
            title: 'About Us',
            description: siteData.aboutText || 'We provide professional services with excellence and reliability.',
            features: siteData.features || [
              'Professional Service',
              'Quality Guaranteed',
              'Customer Focused'
            ]
          }
        },
        {
          type: 'contact',
          content: {
            title: 'Get In Touch',
            email: siteData.email,
            phone: siteData.phone,
            address: siteData.address
          }
        }
      ]
    };
  }

  // Combined workflow for microsite deployment
  async deployMicrositeFromCRM(crmData: any): Promise<any> {
    const micrositeData = {
      name: `${crmData.clientName} - Portfolio`,
      slug: crmData.slug || crmData.clientName.toLowerCase().replace(/\s+/g, '-'),
      headline: `${crmData.clientName} - Professional Services`,
      description: crmData.description || `Quality services by ${crmData.clientName}`,
      email: crmData.email,
      phone: crmData.phone,
      address: crmData.address,
      features: crmData.services || [],
      heroImage: crmData.heroImage,
      customDomain: crmData.customDomain,
      content: crmData.content
    };

    if (this.provider === 'webflow') {
      return await this.deployWebflowMicrosite(micrositeData);
    } else {
      return await this.deployTypedreamMicrosite(micrositeData);
    }
  }

  async getStatus(): Promise<any> {
    try {
      const sites = await (this.provider === 'webflow' ? this.getWebflowSites() : this.getTypedreamSites());
      
      return {
        service: this.provider,
        enabled: this.config?.enabled || false,
        configured: !!this.config?.apiKey,
        connected: true,
        siteCount: Array.isArray(sites) ? sites.length : sites.sites?.length || 0,
        lastActivity: await this.getLastActivity()
      };
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