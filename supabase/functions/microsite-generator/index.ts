import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Microsite Generator Edge Function with Portfolio Support
 * 
 * Creates responsive one-page microsites for clients with:
 * - Client branding (logo, colors, services)
 * - Embedded lead capture forms
 * - Portfolio/previous work showcase with filtering
 * - Client reviews and review links (Google/Trustpilot)
 * - Analytics tracking
 * - Zapier integration for CRM sync
 * 
 * Usage:
 * 1. Create microsite: POST with action: 'create'
 * 2. Serve microsite: GET /:slug
 * 3. Handle form submissions: POST with action: 'submit'
 * 
 * Sample call for client "client789":
 * ```
 * supabase.functions.invoke('microsite-generator', {
 *   body: {
 *     action: 'create',
 *     micrositeData: {
 *       clientName: 'Client 789 Construction',
 *       domainSlug: 'client789-construction',
 *       services: ['Kitchen Renovations', 'Bathroom Remodeling'],
 *       contact: { email: 'contact@client789.com', phone: '+44 7123 456 789' },
 *       logoUrl: 'https://example.com/logo.png',
 *       formId: 'form-uuid-here',
 *       zapierWebhook: 'https://hooks.zapier.com/hooks/catch/...',
 *       styling: { primaryColor: '#059669' },
 *       showPortfolio: true,
 *       portfolioSettings: {
 *         maxItems: 6,
 *         showReviews: true,
 *         googleReviewUrl: 'https://g.page/r/client789/review',
 *         trustpilotReviewUrl: 'https://trustpilot.com/review/client789.com'
 *       }
 *     }
 *   }
 * })
 * ```
 */

interface MicrositeData {
  clientName: string;
  domainSlug: string;
  services: string[];
  contact: {
    email: string;
    phone: string;
  };
  logoUrl?: string;
  formId?: string;
  zapierWebhook?: string;
  styling: {
    primaryColor: string;
  };
  description?: string;
  calendlyUrl?: string;
  showPortfolio?: boolean;
  portfolioSettings?: {
    maxItems: number;
    showReviews: boolean;
    googleReviewUrl?: string;
    trustpilotReviewUrl?: string;
  };
}

interface FormSubmission {
  micrositeId: string;
  formData: Record<string, any>;
  zapierWebhook?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Serve existing microsite (GET /:slug)
    if (req.method === 'GET' && pathParts.length === 1) {
      const slug = pathParts[0];
      return await serveMicrosite(supabase, slug);
    }

    // Handle POST requests (create, submit, analytics)
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action;

      switch (action) {
        case 'create':
          return await createMicrosite(supabase, body.micrositeData, req);
        case 'submit':
          return await handleFormSubmission(supabase, body, req);
        case 'track':
          return await trackAnalytics(supabase, body, req);
        default:
          throw new Error('Invalid action');
      }
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('Microsite Generator Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Creates a new microsite entry in the database
 */
async function createMicrosite(supabase: any, micrositeData: MicrositeData, req: Request) {
  console.log('Creating microsite:', micrositeData.clientName);

  // Get user from auth token
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Authorization required');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user) {
    throw new Error('Invalid authorization');
  }

  // Validate required fields
  if (!micrositeData.clientName || !micrositeData.domainSlug) {
    throw new Error('Client name and domain slug are required');
  }

  // Check if slug already exists
  const { data: existing } = await supabase
    .from('microsites')
    .select('id')
    .eq('domain_slug', micrositeData.domainSlug)
    .single();

  if (existing) {
    throw new Error('Domain slug already exists');
  }

  // Generate microsite HTML with portfolio
  const micrositeHtml = await generateMicrositeHTML({
    ...micrositeData,
    userId: user.id
  }, supabase);

  // Create microsite record
  const { data: microsite, error: insertError } = await supabase
    .from('microsites')
    .insert({
      user_id: user.id,
      client_name: micrositeData.clientName,
      domain_slug: micrositeData.domainSlug,
      microsite_data: {
        ...micrositeData,
        html: micrositeHtml,
        generatedAt: new Date().toISOString()
      },
      form_id: micrositeData.formId || null,
      analytics_data: {
        totalViews: 0,
        totalSubmissions: 0
      }
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  // Log creation event
  await supabase
    .from('audit_logs')
    .insert({
      user_id: user.id,
      table_name: 'microsites',
      action: 'CREATE',
      record_id: microsite.id,
      sensitive_fields: ['contact']
    });

  console.log('Microsite created successfully:', microsite.id);

  return new Response(
    JSON.stringify({ 
      success: true, 
      microsite,
      url: `${new URL(req.url).origin}/microsite/${micrositeData.domainSlug}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Serves a microsite HTML page by slug
 */
async function serveMicrosite(supabase: any, slug: string) {
  console.log('Serving microsite:', slug);

  // Get microsite data
  const { data: microsite, error } = await supabase
    .from('microsites')
    .select('*')
    .eq('domain_slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !microsite) {
    return new Response('Microsite not found', { 
      status: 404, 
      headers: corsHeaders 
    });
  }

  // Track page view
  await trackPageView(supabase, microsite.id);

  // Generate or retrieve cached HTML
  const html = microsite.microsite_data.html || await generateMicrositeHTML(microsite.microsite_data, supabase);

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300' // 5 minute cache
    }
  });
}

/**
 * Generate the complete HTML for a microsite with portfolio support
 */
async function generateMicrositeHTML(data: any, supabase: any): Promise<string> {
  const { clientName, services = [], contact, logoUrl, styling, description, showPortfolio, portfolioSettings } = data;
  const primaryColor = styling.primaryColor || '#2563eb';
  
  // Fetch portfolio data if portfolio is enabled
  let portfolioHTML = '';
  if (showPortfolio && data.userId) {
    try {
      // Get portfolio items
      const { data: portfolioItems, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', data.userId)
        .order('completion_date', { ascending: false })
        .limit(portfolioSettings?.maxItems || 9);

      // Get reviews if enabled
      let reviews = [];
      if (portfolioSettings?.showReviews) {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('external_reviews')
          .select('*')
          .eq('user_id', data.userId)
          .eq('verified', true)
          .order('review_date', { ascending: false })
          .limit(3);

        if (!reviewsError && reviewsData) {
          reviews = reviewsData;
        }
      }

      if (!portfolioError && portfolioItems && portfolioItems.length > 0) {
        portfolioHTML = generatePortfolioHTML(portfolioItems, reviews, data);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${clientName} - Professional Construction Services</title>
    <meta name="description" content="${description || `Professional construction services by ${clientName}. ${services.join(', ')}.`}">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${clientName}">
    <meta property="og:description" content="${description || 'Professional construction services'}">
    <meta property="og:type" content="website">
    
    <!-- Performance & SEO -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --primary-color: ${primaryColor};
            --primary-rgb: ${hexToRgb(primaryColor)};
            --text-dark: #1f2937;
            --text-light: #6b7280;
            --bg-light: #f9fafb;
            --border-light: #e5e7eb;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            background: white;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        
        /* Header */
        .header {
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
        }
        
        .nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 0;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-color);
        }
        
        .logo img {
            height: 40px;
            width: auto;
        }
        
        .cta-button {
            background: var(--primary-color);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.3s ease;
        }
        
        .cta-button:hover {
            opacity: 0.9;
        }
        
        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--primary-color) 0%, color-mix(in srgb, var(--primary-color) 80%, black) 100%);
            color: white;
            padding: 8rem 0 4rem;
            text-align: center;
            margin-top: 70px;
        }
        
        .hero h1 {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
            line-height: 1.2;
        }
        
        .hero p {
            font-size: 1.25rem;
            opacity: 0.9;
            margin-bottom: 2rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Services Section */
        .services {
            padding: 4rem 0;
            background: var(--bg-light);
        }
        
        .section-title {
            text-align: center;
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 3rem;
            color: var(--text-dark);
        }
        
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        .service-card {
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.15);
        }
        
        /* Portfolio Styles */
        .portfolio {
            padding: 4rem 0;
            background: white;
        }
        
        .portfolio-filters {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .portfolio-filter {
            margin: 0.25rem;
            padding: 0.5rem 1rem;
            border: 2px solid var(--primary-color);
            background: white;
            color: var(--primary-color);
            border-radius: 1.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .portfolio-filter.active,
        .portfolio-filter:hover {
            background: var(--primary-color);
            color: white;
        }
        
        .portfolio-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
        }
        
        .portfolio-item {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .portfolio-item:hover {
            transform: translateY(-5px);
        }
        
        .portfolio-image {
            position: relative;
            aspect-ratio: 16/10;
            overflow: hidden;
            cursor: pointer;
        }
        
        .portfolio-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .portfolio-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(transparent 60%, rgba(0,0,0,0.7));
            display: flex;
            align-items: end;
            padding: 1.5rem;
        }
        
        .portfolio-content {
            padding: 1.5rem;
        }
        
        .portfolio-tags {
            margin-bottom: 1rem;
        }
        
        .portfolio-tag {
            display: inline-block;
            background: rgba(var(--primary-rgb), 0.1);
            color: var(--primary-color);
            padding: 0.25rem 0.5rem;
            border-radius: 0.75rem;
            font-size: 0.75rem;
            margin-right: 0.5rem;
            margin-bottom: 0.25rem;
        }
        
        /* Reviews Section */
        .reviews {
            background: white;
            border-radius: 1rem;
            padding: 2.5rem;
            margin-bottom: 3rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .reviews-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .review-card {
            background: var(--bg-light);
            border-radius: 0.5rem;
            padding: 1.5rem;
            text-align: center;
        }
        
        .review-stars {
            display: flex;
            justify-content: center;
            margin-bottom: 0.75rem;
        }
        
        .review-text {
            color: var(--text-light);
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
            font-style: italic;
        }
        
        .review-author {
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--text-dark);
        }
        
        .review-platform {
            font-size: 0.75rem;
            color: var(--text-light);
        }
        
        .review-buttons {
            display: flex;
            justify-content: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .review-button {
            background: white;
            color: var(--primary-color);
            border: 2px solid var(--primary-color);
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
        }
        
        .review-button:hover {
            background: var(--primary-color);
            color: white;
        }
        
        /* Contact Section */
        .contact {
            padding: 4rem 0;
            background: white;
        }
        
        .contact-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: start;
        }
        
        .contact-info h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: var(--primary-color);
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        
        .contact-item span {
            margin-right: 0.75rem;
            color: var(--primary-color);
        }
        
        /* Form Styles */
        .form {
            background: var(--bg-light);
            padding: 2rem;
            border-radius: 1rem;
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-dark);
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--border-light);
            border-radius: 0.5rem;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        .submit-button {
            background: var(--primary-color);
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.3s ease;
        }
        
        .submit-button:hover {
            opacity: 0.9;
        }
        
        .submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        /* Footer */
        .footer {
            background: var(--text-dark);
            color: white;
            text-align: center;
            padding: 2rem 0;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .hero p { font-size: 1rem; }
            .contact-content { grid-template-columns: 1fr; gap: 2rem; }
            .nav { flex-direction: column; gap: 1rem; }
            .portfolio-grid { grid-template-columns: 1fr; }
            .reviews-grid { grid-template-columns: 1fr; }
        }
        
        /* Modal styles */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .modal-content {
            max-width: 90vw;
            max-height: 90vh;
            position: relative;
        }
        
        .modal-close {
            position: absolute;
            top: -40px;
            right: 0;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        
        .modal-image {
            max-width: 100%;
            max-height: 100%;
            border-radius: 8px;
        }
        
        /* Loading States */
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .success-message {
            background: #10b981;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            display: none;
        }
        
        .error-message {
            background: #ef4444;
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            display: none;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <nav class="nav container">
            <div class="logo">
                ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" loading="lazy">` : clientName}
            </div>
            <a href="#contact" class="cta-button">Get Free Quote</a>
        </nav>
    </header>
    
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>Professional Construction Services</h1>
            <p>${description || `Quality craftsmanship and reliable service by ${clientName}. Get your project completed on time and within budget.`}</p>
            <a href="#contact" class="cta-button">Start Your Project</a>
        </div>
    </section>
    
    <!-- Services Section -->
    <section class="services">
        <div class="container">
            <h2 class="section-title">Our Services</h2>
            <div class="services-grid">
                ${services.map((service, index) => `
                    <div class="service-card">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔨</div>
                        <h3>${service}</h3>
                        <p>Professional ${service.toLowerCase()} services with attention to detail and quality craftsmanship.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    ${portfolioHTML}
    
    <!-- Contact Section -->
    <section id="contact" class="contact">
        <div class="container">
            <h2 class="section-title">Get Your Free Quote</h2>
            <div class="contact-content">
                <div class="contact-info">
                    <h3>Contact Information</h3>
                    ${contact.phone ? `
                        <div class="contact-item">
                            <span>📞</span>
                            <a href="tel:${contact.phone}">${contact.phone}</a>
                        </div>
                    ` : ''}
                    ${contact.email ? `
                        <div class="contact-item">
                            <span>✉️</span>
                            <a href="mailto:${contact.email}">${contact.email}</a>
                        </div>
                    ` : ''}
                    <div class="contact-item">
                        <span>⏰</span>
                        Available Monday - Friday, 8AM - 6PM
                    </div>
                </div>
                
                <div class="form">
                    <div class="success-message" id="successMessage">
                        Thank you! Your inquiry has been submitted successfully. We'll be in touch soon.
                    </div>
                    <div class="error-message" id="errorMessage">
                        Sorry, there was an error submitting your form. Please try again.
                    </div>
                    
                    <form id="contactForm">
                        <div class="form-group">
                            <label for="name">Full Name *</label>
                            <input type="text" id="name" name="name" required>
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
                            <label for="projectType">Project Type</label>
                            <select id="projectType" name="projectType">
                                <option value="">Select a service...</option>
                                ${services.map(service => `<option value="${service}">${service}</option>`).join('')}
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="budget">Estimated Budget</label>
                            <select id="budget" name="budget">
                                <option value="">Select budget range...</option>
                                <option value="Under £5,000">Under £5,000</option>
                                <option value="£5,000 - £15,000">£5,000 - £15,000</option>
                                <option value="£15,000 - £35,000">£15,000 - £35,000</option>
                                <option value="£35,000 - £75,000">£35,000 - £75,000</option>
                                <option value="Over £75,000">Over £75,000</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="message">Project Description *</label>
                            <textarea id="message" name="message" rows="4" placeholder="Please describe your project requirements..." required></textarea>
                        </div>
                        
                        <button type="submit" class="submit-button" id="submitButton">
                            Get Free Quote
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${clientName}. Professional construction services.</p>
        </div>
    </footer>
    
    <script>
        // Portfolio filtering functionality
        function filterPortfolio(tag) {
            const items = document.querySelectorAll('.portfolio-item');
            const filters = document.querySelectorAll('.portfolio-filter');
            
            // Update filter button styles
            filters.forEach(filter => {
                filter.classList.remove('active');
            });
            
            const activeFilter = document.getElementById('filter-' + tag);
            if (activeFilter) {
                activeFilter.classList.add('active');
            }
            
            // Filter portfolio items
            items.forEach(item => {
                const itemTags = item.getAttribute('data-tags') || '';
                if (tag === 'all' || itemTags.includes(tag)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Track portfolio filter analytics
            trackAnalytics('portfolio_filter', {
                filter_tag: tag,
                timestamp: new Date().toISOString()
            });
        }

        // Portfolio image modal
        function openPortfolioModal(itemId, imageUrl, title) {
            // Track portfolio item view
            trackAnalytics('portfolio_item_view', {
                item_id: itemId,
                item_title: title,
                timestamp: new Date().toISOString()
            });
            
            // Create and show modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = \`
                <div class="modal-content">
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    <img src="\${imageUrl}" alt="\${title}" class="modal-image" />
                </div>
            \`;
            
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
            
            document.body.appendChild(modal);
        }

        // Review link tracking
        function trackReviewClick(platform, url) {
            trackAnalytics('review_link_click', {
                platform: platform,
                url: url,
                timestamp: new Date().toISOString()
            });
        }

        // Analytics tracking helper
        function trackAnalytics(eventType, eventData) {
            try {
                fetch(window.location.origin + '/functions/v1/microsite-generator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'track',
                        micrositeId: '${data.micrositeId || 'current-microsite-id'}',
                        eventType: eventType,
                        eventData: eventData
                    })
                });
            } catch (error) {
                console.error('Analytics tracking error:', error);
            }
        }

        // Form submission handling
        document.getElementById('contactForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = document.getElementById('submitButton');
            const successMessage = document.getElementById('successMessage');
            const errorMessage = document.getElementById('errorMessage');
            
            // Hide previous messages
            successMessage.style.display = 'none';
            errorMessage.style.display = 'none';
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            
            // Collect form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // Submit to microsite generator function
                const response = await fetch(window.location.origin + '/functions/v1/microsite-generator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'submit',
                        micrositeId: '${data.micrositeId || 'current-microsite-id'}',
                        formData: data
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successMessage.style.display = 'block';
                    this.reset();
                    
                    // Track analytics
                    trackAnalytics('form_submission', { fields: Object.keys(data) });
                } else {
                    throw new Error(result.error || 'Submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                errorMessage.style.display = 'block';
                errorMessage.textContent = error.message || 'Please try again later.';
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Get Free Quote';
            }
        });
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // Track page view on load
        window.addEventListener('load', function() {
            trackAnalytics('page_view', { timestamp: new Date().toISOString() });
        });
    </script>
</body>
</html>`;
}

// Generate portfolio HTML section
function generatePortfolioHTML(items: any[], reviews: any[], data: any): string {
  if (!items || items.length === 0) return '';
  
  const primaryColor = data.styling?.primaryColor || '#2563eb';
  const portfolioSettings = data.portfolioSettings || {};
  
  // Generate tags for each item
  const itemsWithTags = items.map(item => ({
    ...item,
    tags: generateTagsFromProject(item.project_type, item.title, item.description)
  }));
  
  // Get all unique tags for filtering
  const allTags = Array.from(
    new Set(itemsWithTags.flatMap(item => item.tags || []))
  ).sort();
  
  return `
    <!-- Portfolio Section -->
    <section class="portfolio">
      <div class="container">
        <h2 class="section-title">Our Recent Work</h2>
        <p style="text-align: center; color: var(--text-light); font-size: 1.1rem; max-width: 600px; margin: 0 auto 3rem;">
          Take a look at some of our completed projects and see the quality craftsmanship we deliver
        </p>

        ${reviews.length > 0 && portfolioSettings.showReviews ? `
          <!-- Reviews Section -->
          <div class="reviews">
            <h3 style="text-align: center; font-size: 1.5rem; margin-bottom: 2rem; color: var(--text-dark);">What Our Clients Say</h3>
            <div class="reviews-grid">
              ${reviews.map(review => `
                <div class="review-card">
                  <div class="review-stars">
                    ${Array.from({length: 5}, (_, i) => 
                      `<span style="color: ${i < review.rating ? '#fbbf24' : '#d1d5db'}; font-size: 1.2rem;">★</span>`
                    ).join('')}
                  </div>
                  <p class="review-text">
                    "${review.review_text.substring(0, 120)}${review.review_text.length > 120 ? '...' : ''}"
                  </p>
                  <p class="review-author">${review.reviewer_name}</p>
                  <p class="review-platform">${review.platform}</p>
                </div>
              `).join('')}
            </div>
            
            <div style="text-align: center;">
              <p style="color: var(--text-light); margin-bottom: 1.5rem;">Had a great experience? We'd love your feedback!</p>
              <div class="review-buttons">
                ${portfolioSettings.googleReviewUrl ? `
                  <a 
                    href="${portfolioSettings.googleReviewUrl}" 
                    target="_blank"
                    onclick="trackReviewClick('Google', '${portfolioSettings.googleReviewUrl}')"
                    class="review-button"
                  >
                    ⭐ Review on Google
                  </a>
                ` : ''}
                ${portfolioSettings.trustpilotReviewUrl ? `
                  <a 
                    href="${portfolioSettings.trustpilotReviewUrl}" 
                    target="_blank"
                    onclick="trackReviewClick('Trustpilot', '${portfolioSettings.trustpilotReviewUrl}')"
                    class="review-button"
                  >
                    ⭐ Review on Trustpilot
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}

        ${allTags.length > 0 ? `
          <!-- Portfolio Filter Tags -->
          <div class="portfolio-filters">
            <button 
              onclick="filterPortfolio('all')" 
              id="filter-all"
              class="portfolio-filter active"
            >
              All Projects
            </button>
            ${allTags.map(tag => `
              <button 
                onclick="filterPortfolio('${tag}')" 
                id="filter-${tag}"
                class="portfolio-filter"
              >
                ${tag}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Portfolio Grid -->
        <div class="portfolio-grid">
          ${itemsWithTags.map(item => `
            <div class="portfolio-item" data-tags="${(item.tags || []).join(',')}">
              <div class="portfolio-image">
                ${item.image_url ? `
                  <img 
                    src="${item.image_url}" 
                    alt="${item.title}"
                    onclick="openPortfolioModal('${item.id}', '${item.image_url}', '${item.title}')"
                  />
                ` : `
                  <div style="width: 100%; height: 100%; background: var(--bg-light); display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 3rem;">🏗️</span>
                  </div>
                `}
                <div class="portfolio-overlay">
                  <div>
                    <h4 style="color: white; font-size: 1.2rem; margin-bottom: 0.25rem;">${item.title}</h4>
                    ${item.completion_date ? `
                      <p style="color: rgba(255,255,255,0.8); font-size: 0.85rem;">
                        Completed: ${new Date(item.completion_date).toLocaleDateString()}
                      </p>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              <div class="portfolio-content">
                <p style="color: var(--text-light); margin-bottom: 1rem; line-height: 1.5;">
                  ${item.description.substring(0, 120)}${item.description.length > 120 ? '...' : ''}
                </p>
                
                ${item.tags && item.tags.length > 0 ? `
                  <div class="portfolio-tags">
                    ${item.tags.map(tag => 
                      `<span class="portfolio-tag">${tag}</span>`
                    ).join('')}
                  </div>
                ` : ''}
                
                ${item.budget_range ? `
                  <p style="color: var(--text-light); font-size: 0.85rem;">Budget: ${item.budget_range}</p>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// Helper function to generate tags from project data
function generateTagsFromProject(projectType: string, title: string, description: string): string[] {
  const tags = new Set<string>();
  
  // Add project type as primary tag
  if (projectType) tags.add(projectType);
  
  // Extract common construction keywords
  const keywords = [
    'kitchen', 'bathroom', 'extension', 'renovation', 'remodel', 
    'plumbing', 'electrical', 'flooring', 'roofing', 'painting',
    'garden', 'landscaping', 'conservatory', 'loft', 'basement'
  ];
  
  const text = `${title} ${description}`.toLowerCase();
  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      tags.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  });
  
  return Array.from(tags).slice(0, 4); // Limit to 4 tags
}

/**
 * Handles lead capture form submissions
 */
async function handleFormSubmission(supabase: any, submissionData: FormSubmission, req: Request) {
  console.log('Processing form submission for microsite:', submissionData.micrositeId);

  // Get microsite details
  const { data: microsite } = await supabase
    .from('microsites')
    .select('*')
    .eq('id', submissionData.micrositeId)
    .single();

  if (!microsite) {
    throw new Error('Microsite not found');
  }

  // Create lead in CRM
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      customer_name: submissionData.formData.name || submissionData.formData.fullName,
      email: submissionData.formData.email,
      phone: submissionData.formData.phone,
      project_type: submissionData.formData.projectType || 'Microsite Inquiry',
      description: submissionData.formData.message || submissionData.formData.description,
      source: `Microsite: ${microsite.client_name}`,
      form_id: microsite.form_id,
      budget_range: submissionData.formData.budget,
      customer_id: microsite.user_id // Associate with business owner
    })
    .select()
    .single();

  if (leadError) {
    console.error('Error creating lead:', leadError);
    throw new Error('Failed to save lead');
  }

  // Track form submission
  await trackFormSubmission(supabase, microsite.id, submissionData.formData);

  // Send to Zapier webhook if configured
  if (submissionData.zapierWebhook || microsite.microsite_data.zapierWebhook) {
    try {
      await sendToZapier(
        submissionData.zapierWebhook || microsite.microsite_data.zapierWebhook,
        {
          ...submissionData.formData,
          micrositeName: microsite.client_name,
          leadId: lead.id,
          submittedAt: new Date().toISOString()
        }
      );
    } catch (zapierError) {
      console.error('Zapier webhook failed:', zapierError);
      // Don't fail the submission if Zapier fails
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      leadId: lead.id,
      message: 'Thank you! Your inquiry has been submitted successfully.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Tracks analytics events
 */
async function trackAnalytics(supabase: any, analyticsData: any, req: Request) {
  const { micrositeId, eventType, eventData } = analyticsData;

  await supabase
    .from('microsite_analytics')
    .insert({
      microsite_id: micrositeId,
      event_type: eventType,
      event_data: eventData || {},
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent')
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Tracks page views
 */
async function trackPageView(supabase: any, micrositeId: string) {
  await supabase
    .from('microsite_analytics')
    .insert({
      microsite_id: micrositeId,
      event_type: 'view',
      event_data: { timestamp: new Date().toISOString() }
    });
}

/**
 * Tracks form submissions
 */
async function trackFormSubmission(supabase: any, micrositeId: string, formData: any) {
  await supabase
    .from('microsite_analytics')
    .insert({
      microsite_id: micrositeId,
      event_type: 'form_submission',
      event_data: { 
        fields: Object.keys(formData),
        timestamp: new Date().toISOString()
      }
    });
}

/**
 * Sends data to Zapier webhook
 */
async function sendToZapier(webhookUrl: string, data: any) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Zapier webhook failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '37, 99, 235'; // Default blue
  
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ].join(', ');
}