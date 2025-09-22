/**
 * Comprehensive Microsite Service for generating one-page client microsites
 * Integrates with Webflow/Typedream, Construyo CRM, and analytics tracking
 */

import { supabase } from "@/integrations/supabase/client";
import { WebflowTypedreamService } from "../integrations/services/WebflowTypedreamService";
import { RateLimiter } from "../integrations/utils/RateLimiter";
import { RetryHandler } from "../integrations/utils/RetryHandler";
import { IntegrationLogger } from "../integrations/utils/IntegrationLogger";

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  logo_url?: string;
  services: string[];
  address?: string;
  city?: string;
  postal_code?: string;
  website?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface MicrositeConfig {
  clientId: string;
  template: 'modern' | 'classic' | 'minimal';
  provider: 'webflow' | 'typedream';
  customDomain?: string;
  leadCaptureFormId?: string;
  includePortfolio: boolean;
  includeTestimonials: boolean;
  analyticsEnabled: boolean;
}

export interface MicrositeResult {
  micrositeId: string;
  url: string;
  previewUrl: string;
  formEmbedCode: string;
  analyticsCode: string;
  deploymentStatus: 'pending' | 'deployed' | 'failed';
  error?: string;
}

export class MicrositeService {
  private webflowService: WebflowTypedreamService;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private logger: IntegrationLogger;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.retryHandler = new RetryHandler();
    this.logger = new IntegrationLogger();
    
    // Initialize with Webflow by default, can be switched to Typedream
    this.webflowService = new WebflowTypedreamService(
      this.rateLimiter,
      this.retryHandler,
      this.logger,
      'webflow'
    );
  }

  /**
   * Generate a complete one-page microsite for a client
   * @param config Microsite configuration
   * @returns Promise<MicrositeResult>
   */
  async generateMicrosite(config: MicrositeConfig): Promise<MicrositeResult> {
    try {
      // Step 1: Fetch client data from Construyo CRM
      const clientData = await this.fetchClientData(config.clientId);
      
      // Step 2: Generate lead capture form if not provided
      const formId = config.leadCaptureFormId || await this.createLeadCaptureForm(clientData);
      
      // Step 3: Generate microsite HTML template
      const micrositeHTML = await this.generateMicrositeHTML(clientData, config, formId);
      
      // Step 4: Deploy to chosen platform (Webflow/Typedream)
      const deploymentResult = await this.deployMicrosite(micrositeHTML, clientData, config);
      
      // Step 5: Store microsite record in database
      const micrositeRecord = await this.storeMicrositeRecord({
        clientData,
        config,
        deploymentResult,
        formId
      });
      
      // Step 6: Setup analytics tracking
      const analyticsCode = await this.setupAnalytics(micrositeRecord.id);
      
      // Step 7: Log microsite creation for analytics
      await this.logMicrositeCreation(micrositeRecord.id, clientData, config);

      return {
        micrositeId: micrositeRecord.id,
        url: deploymentResult.url,
        previewUrl: deploymentResult.previewUrl || deploymentResult.url,
        formEmbedCode: await this.generateFormEmbedCode(formId),
        analyticsCode,
        deploymentStatus: 'deployed'
      };

    } catch (error) {
      console.error('Microsite generation failed:', error);
      
      // Log the error for analytics
      await this.logMicrositeError(config.clientId, error as Error);
      
      throw new Error(`Failed to generate microsite: ${error}`);
    }
  }

  /**
   * Fetch client data from Construyo CRM tables
   */
  private async fetchClientData(clientId: string): Promise<ClientData> {
    // First try to get from leads table
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        address,
        city,
        postal_code,
        project_type,
        tags
      `)
      .eq('id', clientId)
      .single();

    if (leadData && !leadError) {
      // Get business settings for branding
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .single();

      return {
        id: leadData.id,
        name: `${leadData.first_name} ${leadData.last_name}`.trim(),
        email: leadData.email || '',
        phone: leadData.phone,
        company_name: leadData.company_name,
        services: leadData.tags || [leadData.project_type].filter(Boolean),
        address: leadData.address,
        city: leadData.city,
        postal_code: leadData.postal_code,
        logo_url: businessSettings?.business_name ? `/api/placeholder/150/50?text=${encodeURIComponent(businessSettings.business_name)}` : undefined,
        primary_color: '#3B82F6', // Default blue
        secondary_color: '#1E40AF'
      };
    }

    // Try business_settings table as fallback
    const { data: businessData, error: businessError } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', clientId)
      .single();

    if (businessData && !businessError) {
      return {
        id: clientId,
        name: businessData.business_name || 'Business',
        email: '', // Will need to get from profiles
        services: businessData.specialties || [],
        logo_url: `/api/placeholder/150/50?text=${encodeURIComponent(businessData.business_name || 'Business')}`,
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF'
      };
    }

    throw new Error(`Client not found: ${clientId}`);
  }

  /**
   * Create a lead capture form for the microsite
   */
  private async createLeadCaptureForm(clientData: ClientData): Promise<string> {
    const { data, error } = await supabase
      .from('lead_capture_forms')
      .insert({
        user_id: clientData.id,
        form_name: `${clientData.name} Microsite Form`,
        form_title: 'Get a Free Quote',
        form_description: `Contact ${clientData.name} for your project needs`,
        fields: [
          { name: 'customer_name', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
          { name: 'project_description', label: 'Project Description', type: 'textarea', required: true },
          { name: 'estimated_budget', label: 'Estimated Budget', type: 'select', 
            options: ['Under £5,000', '£5,000 - £15,000', '£15,000 - £50,000', '£50,000+'], required: false }
        ],
        thank_you_message: `Thank you! ${clientData.name} will be in touch soon.`,
        is_active: true
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create form: ${error.message}`);
    return data.id;
  }

  /**
   * Generate responsive HTML template for the microsite
   */
  private async generateMicrositeHTML(
    clientData: ClientData, 
    config: MicrositeConfig, 
    formId: string
  ): Promise<string> {
    const primaryColor = clientData.primary_color || '#3B82F6';
    const secondaryColor = clientData.secondary_color || '#1E40AF';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${clientData.name} - Professional Services</title>
    <meta name="description" content="Contact ${clientData.name} for professional ${clientData.services.join(', ')} services. Get your free quote today.">
    
    <!-- Optimized CSS for fast loading -->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .hero {
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            color: white;
            padding: 80px 0;
            text-align: center;
        }
        
        .hero h1 {
            font-size: clamp(2rem, 5vw, 3.5rem);
            margin-bottom: 1rem;
            font-weight: 700;
        }
        
        .hero p {
            font-size: clamp(1.1rem, 2.5vw, 1.3rem);
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        
        .cta-button {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 15px 30px;
            border: 2px solid white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
        }
        
        .cta-button:hover {
            background: white;
            color: ${primaryColor};
        }
        
        .services {
            padding: 80px 0;
            background: #f8fafc;
        }
        
        .services h2 {
            text-align: center;
            margin-bottom: 3rem;
            font-size: 2.5rem;
            color: #1e293b;
        }
        
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        .service-card {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .service-card:hover {
            transform: translateY(-5px);
        }
        
        .contact-form {
            padding: 80px 0;
            background: white;
        }
        
        .form-container {
            max-width: 600px;
            margin: 0 auto;
            background: #f8fafc;
            padding: 3rem;
            border-radius: 12px;
        }
        
        .form-container h2 {
            text-align: center;
            margin-bottom: 2rem;
            color: #1e293b;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: ${primaryColor};
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .submit-btn {
            background: ${primaryColor};
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background-color 0.3s ease;
        }
        
        .submit-btn:hover {
            background: ${secondaryColor};
        }
        
        .footer {
            background: #1e293b;
            color: white;
            padding: 2rem 0;
            text-align: center;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .hero { padding: 60px 0; }
            .services, .contact-form { padding: 60px 0; }
            .form-container { padding: 2rem; margin: 0 20px; }
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            ${clientData.logo_url ? `<img src="${clientData.logo_url}" alt="${clientData.name} Logo" style="max-height: 60px; margin-bottom: 2rem;">` : ''}
            <h1>${clientData.name}</h1>
            <p>Professional ${clientData.services.join(' • ')} Services</p>
            <a href="#contact" class="cta-button">Get Your Free Quote</a>
        </div>
    </section>

    <!-- Services Section -->
    <section class="services">
        <div class="container">
            <h2>Our Services</h2>
            <div class="services-grid">
                ${clientData.services.map(service => `
                    <div class="service-card">
                        <h3 style="margin-bottom: 1rem; color: ${primaryColor};">${service}</h3>
                        <p>Professional ${service.toLowerCase()} services with quality guarantee and competitive pricing.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Contact Form Section -->
    <section class="contact-form" id="contact">
        <div class="container">
            <div class="form-container">
                <h2>Get Your Free Quote</h2>
                <form id="contactForm" data-form-id="${formId}">
                    <div class="form-group">
                        <label for="customer_name">Full Name *</label>
                        <input type="text" id="customer_name" name="customer_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address *</label>
                        <input type="email" id="email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone">
                    </div>
                    
                    <div class="form-group">
                        <label for="project_description">Project Description *</label>
                        <textarea id="project_description" name="project_description" rows="4" required 
                                  placeholder="Tell us about your project..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="estimated_budget">Estimated Budget</label>
                        <select id="estimated_budget" name="estimated_budget">
                            <option value="">Select budget range</option>
                            <option value="Under £5,000">Under £5,000</option>
                            <option value="£5,000 - £15,000">£5,000 - £15,000</option>
                            <option value="£15,000 - £50,000">£15,000 - £50,000</option>
                            <option value="£50,000+">£50,000+</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="submit-btn">Send My Request</button>
                </form>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ${clientData.name}. All rights reserved.</p>
            ${clientData.phone ? `<p>Call us: ${clientData.phone}</p>` : ''}
            ${clientData.email ? `<p>Email: ${clientData.email}</p>` : ''}
        </div>
    </footer>

    <!-- Form submission script -->
    <script>
        document.getElementById('contactForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/form-submission', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        formId: '${formId}',
                        micrositeId: window.micrositeId,
                        formData: data
                    })
                });
                
                if (response.ok) {
                    alert('Thank you! ${clientData.name} will be in touch soon.');
                    this.reset();
                } else {
                    throw new Error('Submission failed');
                }
            } catch (error) {
                alert('There was an error sending your request. Please try again.');
            }
        });
        
        // Analytics tracking
        if (window.micrositeId) {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    micrositeId: window.micrositeId,
                    event: 'page_view',
                    data: { page: 'home' }
                })
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Deploy microsite to Webflow or Typedream
   */
  private async deployMicrosite(
    html: string, 
    clientData: ClientData, 
    config: MicrositeConfig
  ): Promise<{ url: string; previewUrl?: string; platformId: string }> {
    // Switch service provider based on config
    if (config.provider === 'typedream') {
      this.webflowService = new WebflowTypedreamService(
        this.rateLimiter,
        this.retryHandler,
        this.logger,
        'typedream'
      );
    }

    const deploymentData = {
      siteName: `${clientData.name} Microsite`,
      customDomain: config.customDomain,
      html: html,
      clientData: clientData,
      template: config.template
    };

    const result = await this.webflowService.executeAction('deploy_microsite', deploymentData);
    
    return {
      url: result.url || `https://${clientData.name.toLowerCase().replace(/\s+/g, '-')}.${config.provider === 'webflow' ? 'webflow.io' : 'typedream.com'}`,
      previewUrl: result.previewUrl,
      platformId: result.id
    };
  }

  /**
   * Store microsite record in database
   */
  private async storeMicrositeRecord(params: {
    clientData: ClientData;
    config: MicrositeConfig;
    deploymentResult: { url: string; previewUrl?: string; platformId: string };
    formId: string;
  }): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('microsites')
      .insert({
        user_id: params.clientData.id,
        client_name: params.clientData.name,
        domain_slug: params.deploymentResult.url.split('/').pop() || params.clientData.name.toLowerCase().replace(/\s+/g, '-'),
        microsite_data: {
          clientName: params.clientData.name,
          services: params.clientData.services,
          logoUrl: params.clientData.logo_url,
          primaryColor: params.clientData.primary_color,
          template: params.config.template,
          provider: params.config.provider,
          platformId: params.deploymentResult.platformId,
          formId: params.formId
        },
        form_id: params.formId,
        microsite_url: params.deploymentResult.url,
        is_active: true
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to store microsite: ${error.message}`);
    return { id: data.id };
  }

  /**
   * Setup analytics tracking
   */
  private async setupAnalytics(micrositeId: string): Promise<string> {
    return `
<script>
  window.micrositeId = '${micrositeId}';
  
  // Track page views
  fetch('https://oolfnlkrwythebmlocaj.supabase.co/functions/v1/microsite-generator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'track_analytics',
      micrositeId: '${micrositeId}',
      eventType: 'page_view',
      eventData: { timestamp: new Date().toISOString() }
    })
  });
</script>`;
  }

  /**
   * Generate embeddable form code
   */
  private async generateFormEmbedCode(formId: string): Promise<string> {
    return `<iframe src="https://oolfnlkrwythebmlocaj.supabase.co/functions/v1/form-submission?embed=true&formId=${formId}" 
                    width="100%" height="500" frameborder="0"></iframe>`;
  }

  /**
   * Log microsite creation for analytics
   */
  private async logMicrositeCreation(
    micrositeId: string, 
    clientData: ClientData, 
    config: MicrositeConfig
  ): Promise<void> {
    // Use existing catalogue_analytics table structure
    await supabase.from('catalogue_analytics').insert({
      user_id: clientData.id,
      microsite_id: micrositeId,
      event_type: 'microsite_created',
      event_data: {
        client_name: clientData.name,
        services: clientData.services,
        provider: config.provider,
        template: config.template,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log microsite errors for debugging
   */
  private async logMicrositeError(clientId: string, error: Error): Promise<void> {
    // Use existing catalogue_analytics table structure
    await supabase.from('catalogue_analytics').insert({
      user_id: clientId,
      event_type: 'microsite_error',
      event_data: {
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * SAMPLE USAGE: Create a microsite for client ID "client789"
 */
export async function createMicrositeForClient789(): Promise<MicrositeResult> {
  try {
    const micrositeService = new MicrositeService();
    
    const config: MicrositeConfig = {
      clientId: 'client789',
      template: 'modern',
      provider: 'webflow', // or 'typedream'
      includePortfolio: true,
      includeTestimonials: true,
      analyticsEnabled: true,
      customDomain: 'client789.example.com' // optional
    };

    console.log('Creating microsite for client789...');
    
    const result = await micrositeService.generateMicrosite(config);
    
    console.log('✅ Microsite created successfully!');
    console.log('📝 Microsite ID:', result.micrositeId);
    console.log('🌐 Live URL:', result.url);
    console.log('👁️ Preview URL:', result.previewUrl);
    console.log('📋 Form Embed Code:', result.formEmbedCode);
    console.log('📊 Analytics Code:', result.analyticsCode);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to create microsite for client789:', error);
    throw error;
  }
}