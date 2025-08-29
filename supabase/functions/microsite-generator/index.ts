import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Microsite Generator Edge Function
 * 
 * Creates responsive one-page microsites for clients with:
 * - Client branding (logo, colors, services)
 * - Embedded lead capture forms
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
 *       styling: { primaryColor: '#059669' }
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

  // Generate microsite HTML structure
  const micrositeHtml = generateMicrositeHTML(micrositeData);

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
  const html = microsite.microsite_data.html || generateMicrositeHTML(microsite.microsite_data);

  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300' // 5 minute cache
    }
  });
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

  // Update total views counter
  await supabase.rpc('increment', {
    table_name: 'microsites',
    row_id: micrositeId,
    column_name: 'analytics_data',
    increment_key: 'totalViews'
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
 * Generates responsive HTML for a microsite
 */
function generateMicrositeHTML(data: MicrositeData): string {
  const { clientName, services = [], contact, logoUrl, styling, description } = data;
  const primaryColor = styling.primaryColor || '#2563eb';

  return `
<!DOCTYPE html>
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
            background: color-mix(in srgb, var(--primary-color) 90%, black);
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
        
        .service-icon {
            width: 60px;
            height: 60px;
            background: color-mix(in srgb, var(--primary-color) 10%, white);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            font-size: 1.5rem;
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
            transition: background 0.3s ease;
        }
        
        .submit-button:hover {
            background: color-mix(in srgb, var(--primary-color) 90%, black);
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
                        <div class="service-icon">🔨</div>
                        <h3>${service}</h3>
                        <p>Professional ${service.toLowerCase()} services with attention to detail and quality craftsmanship.</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    
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
                const response = await fetch('/functions/v1/microsite-generator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'submit',
                        micrositeId: '${data.id || 'current-microsite-id'}',
                        formData: data
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    successMessage.style.display = 'block';
                    this.reset();
                    
                    // Track analytics
                    await fetch('/functions/v1/microsite-generator', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'track',
                            micrositeId: '${data.id || 'current-microsite-id'}',
                            eventType: 'form_submission',
                            eventData: { fields: Object.keys(data) }
                        })
                    });
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
        window.addEventListener('load', async function() {
            try {
                await fetch('/functions/v1/microsite-generator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'track',
                        micrositeId: '${data.id || 'current-microsite-id'}',
                        eventType: 'page_view',
                        eventData: { timestamp: new Date().toISOString() }
                    })
                });
            } catch (error) {
                console.error('Analytics tracking error:', error);
            }
        });
    </script>
</body>
</html>`;
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