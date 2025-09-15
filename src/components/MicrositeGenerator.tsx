import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Eye, BarChart, Database, Zap } from "lucide-react";

interface MicrositeData {
  id: string;
  client_name: string;
  domain_slug: string;
  microsite_data: any;
  form_id: string | null;
  is_active: boolean;
  created_at: string;
  analytics_data: any;
  performance_score?: number;
  seo_score?: number;
}

interface CRMClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  services?: string[];
}

interface LeadCaptureForm {
  id: string;
  form_name: string;
  form_title: string;
  is_active: boolean;
}

export const MicrositeGenerator = () => {
  const [microsites, setMicrosites] = useState<MicrositeData[]>([]);
  const [forms, setForms] = useState<LeadCaptureForm[]>([]);
  const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingCRM, setLoadingCRM] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    domainSlug: '',
    services: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    formId: '',
    zapierWebhook: '',
    primaryColor: '#2563eb',
    description: '',
    calendlyUrl: '',
    showPortfolio: false,
    portfolioMaxItems: 9,
    portfolioShowReviews: true,
    googleReviewUrl: '',
    trustpilotReviewUrl: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchMicrosites();
    fetchForms();
    fetchCRMClients();
  }, []);

  /**
   * Fetch CRM client data from Construyo CRM tables
   * Pulls client logos, services, and contact information
   */
  const fetchCRMClients = async () => {
    try {
      setLoadingCRM(true);
      // Fetch clients from leads table (primary source)
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('customer_name, email, phone, project_type')
        .not('customer_name', 'is', null);

      // Fetch business settings for additional client data
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('business_name, specialties');

      if (leadsError) {
        console.error('Error fetching CRM leads:', leadsError);
        return;
      }

      // Transform leads data into client format
      const uniqueClients = leadsData?.reduce((acc: CRMClient[], lead: any) => {
        const existingClient = acc.find(c => c.name.toLowerCase() === lead.customer_name?.toLowerCase());
        if (!existingClient && lead.customer_name) {
          acc.push({
            id: `lead-${lead.customer_name.replace(/\s+/g, '-').toLowerCase()}`,
            name: lead.customer_name,
            email: lead.email,
            phone: lead.phone,
            services: lead.project_type ? [lead.project_type] : undefined
          });
        }
        return acc;
      }, []) || [];

      setCrmClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching CRM clients:', error);
    } finally {
      setLoadingCRM(false);
    }
  };

  /**
   * Load client data from CRM selection
   */
  const loadClientFromCRM = (clientId: string) => {
    const client = crmClients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: client.name,
        domainSlug: client.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        contactEmail: client.email || '',
        contactPhone: client.phone || '',
        logoUrl: client.logo_url || '',
        services: client.services?.join(', ') || ''
      }));
      
      toast({
        title: "Client Data Loaded",
        description: `Loaded data for ${client.name} from CRM`,
      });
    }
  };

  const fetchMicrosites = async () => {
    try {
      const { data, error } = await supabase
        .from('microsites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMicrosites(data || []);
    } catch (error) {
      console.error('Error fetching microsites:', error);
      toast({
        title: "Error",
        description: "Failed to fetch microsites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_capture_forms')
        .select('id, form_name, form_title, is_active')
        .eq('is_active', true);

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const generateMicrosite = async () => {
    if (!formData.clientName || !formData.domainSlug) {
      toast({
        title: "Error",
        description: "Client name and domain slug are required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      console.log('🚀 Creating microsite for client:', formData.clientName);
      
      // Call the enhanced edge function to generate the microsite
      const { data, error } = await supabase.functions.invoke('microsite-generator', {
        body: {
          action: 'create',
          micrositeData: {
            clientName: formData.clientName,
            domainSlug: formData.domainSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
            contact: {
              email: formData.contactEmail,
              phone: formData.contactPhone
            },
            logoUrl: formData.logoUrl,
            formId: formData.formId || null,
            zapierWebhook: formData.zapierWebhook,
            styling: {
              primaryColor: formData.primaryColor
            },
            description: formData.description,
            calendlyUrl: formData.calendlyUrl || null,
            showPortfolio: formData.showPortfolio,
            portfolioSettings: {
              maxItems: formData.portfolioMaxItems,
              showReviews: formData.portfolioShowReviews,
              googleReviewUrl: formData.googleReviewUrl || null,
              trustpilotReviewUrl: formData.trustpilotReviewUrl || null
            },
            // Enhanced features
            enableAnalytics: true,
            enableSEO: true,
            responsive: true,
            fastLoading: true
          }
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Microsite Created Successfully!",
        description: `Professional microsite generated for ${formData.clientName} with analytics and CRM integration`,
      });

      // Log creation for analytics
      console.log('📊 Microsite created:', {
        client: formData.clientName,
        url: data?.url,
        timestamp: new Date().toISOString()
      });

      // Reset form and refresh list
      setFormData({
        clientName: '',
        domainSlug: '',
        services: '',
        contactEmail: '',
        contactPhone: '',
        logoUrl: '',
        formId: '',
        zapierWebhook: '',
        primaryColor: '#2563eb',
        description: '',
        calendlyUrl: '',
        showPortfolio: false,
        portfolioMaxItems: 9,
        portfolioShowReviews: true,
        googleReviewUrl: '',
        trustpilotReviewUrl: ''
      });

      fetchMicrosites();
    } catch (error) {
      console.error('❌ Error generating microsite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate microsite",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const viewMicrosite = (slug: string) => {
    const micrositeUrl = `${window.location.origin}/microsite/${slug}`;
    window.open(micrositeUrl, '_blank');
  };

  /**
   * Enhanced analytics viewer with detailed metrics
   */
  const viewAnalytics = async (micrositeId: string, clientName: string) => {
    try {
      // Fetch comprehensive analytics data
      const { data: analytics, error: analyticsError } = await supabase
        .from('microsite_analytics')
        .select('*')
        .eq('microsite_id', micrositeId)
        .order('created_at', { ascending: false });

      const { data: submissions, error: submissionsError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('microsite_id', micrositeId);

      if (analyticsError) throw analyticsError;

      const totalViews = analytics?.filter(a => a.event_type === 'page_view').length || 0;
      const totalSubmissions = submissions?.length || 0;
      const conversionRate = totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(2) : '0';

      toast({
        title: `📊 Analytics - ${clientName}`,
        description: `Views: ${totalViews} | Submissions: ${totalSubmissions} | Conversion: ${conversionRate}%`,
      });

      console.log('📈 Analytics Summary:', {
        microsite: clientName,
        totalViews,
        totalSubmissions,
        conversionRate: `${conversionRate}%`,
        recentEvents: analytics?.slice(0, 5)
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    }
  };

  /**
   * Sample function call for client ID "client789"
   * Demonstrates the complete microsite generation workflow
   */
  const createSampleMicrosite = () => {
    console.log('🔧 Loading sample microsite data for Client789...');
    
    setFormData({
      clientName: 'Client 789 Construction',
      domainSlug: 'client789-construction',
      services: 'Kitchen Renovations, Bathroom Remodeling, Home Extensions, Loft Conversions',
      contactEmail: 'contact@client789construction.com',
      contactPhone: '+44 7123 456 789',
      logoUrl: 'https://via.placeholder.com/150x60/059669/ffffff?text=Client789',
      formId: forms[0]?.id || '',
      zapierWebhook: 'https://hooks.zapier.com/hooks/catch/1234567/abcdefg',
      primaryColor: '#059669',
      description: 'Award-winning construction services with 15+ years of experience. Specializing in high-quality residential renovations and extensions across London.',
      calendlyUrl: 'https://calendly.com/client789/30min-consultation',
      showPortfolio: true,
      portfolioMaxItems: 8,
      portfolioShowReviews: true,
      googleReviewUrl: 'https://g.page/r/client789-construction/review',
      trustpilotReviewUrl: 'https://uk.trustpilot.com/review/client789construction.com'
    });

    toast({
      title: "📋 Sample Data Loaded",
      description: "Client789 sample microsite configuration loaded - ready to generate!",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Client Microsite Generator</h2>
          <p className="text-muted-foreground">
            Create responsive, fast-loading microsites with CRM integration and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCRMClients} variant="outline" disabled={loadingCRM}>
            {loadingCRM ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Sync CRM
          </Button>
          <Button onClick={createSampleMicrosite} variant="outline">
            Load Sample (Client789)
          </Button>
        </div>
      </div>

      {/* CRM Client Selector */}
      {crmClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Load from Construyo CRM
            </CardTitle>
            <CardDescription>
              Select a client from your CRM to auto-populate their information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={loadClientFromCRM}>
              <SelectTrigger>
                <SelectValue placeholder="Select a CRM client..." />
              </SelectTrigger>
              <SelectContent>
                {crmClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Microsite Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Microsite</CardTitle>
          <CardDescription>
            Create a professional microsite with client branding and lead capture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Acme Construction Ltd"
              />
            </div>
            <div>
              <Label htmlFor="domainSlug">Domain Slug *</Label>
              <Input
                id="domainSlug"
                value={formData.domainSlug}
                onChange={(e) => setFormData(prev => ({ ...prev, domainSlug: e.target.value }))}
                placeholder="acme-construction"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the business and services"
            />
          </div>

          <div>
            <Label htmlFor="services">Services (comma-separated)</Label>
            <Textarea
              id="services"
              value={formData.services}
              onChange={(e) => setFormData(prev => ({ ...prev, services: e.target.value }))}
              placeholder="Kitchen Renovations, Bathroom Remodeling, Home Extensions"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="contact@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+44 7123 456 789"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="formId">Lead Capture Form</Label>
              <Select
                value={formData.formId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, formId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.form_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="zapierWebhook">Zapier Webhook (Optional)</Label>
              <Input
                id="zapierWebhook"
                value={formData.zapierWebhook}
                onChange={(e) => setFormData(prev => ({ ...prev, zapierWebhook: e.target.value }))}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="calendlyUrl">Calendly Booking URL (Optional)</Label>
            <Input
              id="calendlyUrl"
              value={formData.calendlyUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, calendlyUrl: e.target.value }))}
              placeholder="https://calendly.com/your-username/consultation"
            />
          </div>

          {/* Portfolio Settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showPortfolio"
                checked={formData.showPortfolio}
                onChange={(e) => setFormData(prev => ({ ...prev, showPortfolio: e.target.checked }))}
                className="rounded border-border"
              />
              <Label htmlFor="showPortfolio">Include Portfolio/Previous Work</Label>
            </div>
            
            {formData.showPortfolio && (
              <div className="space-y-3 ml-6">
                <div>
                  <Label htmlFor="portfolioMaxItems">Maximum portfolio items</Label>
                  <Input
                    id="portfolioMaxItems"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.portfolioMaxItems}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolioMaxItems: parseInt(e.target.value) || 9 }))}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="portfolioShowReviews"
                    checked={formData.portfolioShowReviews}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolioShowReviews: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <Label htmlFor="portfolioShowReviews">Show client reviews</Label>
                </div>
                
                {formData.portfolioShowReviews && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="googleReviewUrl">Google Review URL</Label>
                      <Input
                        id="googleReviewUrl"
                        value={formData.googleReviewUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, googleReviewUrl: e.target.value }))}
                        placeholder="https://g.page/r/your-business/review"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="trustpilotReviewUrl">Trustpilot Review URL</Label>
                      <Input
                        id="trustpilotReviewUrl"
                        value={formData.trustpilotReviewUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, trustpilotReviewUrl: e.target.value }))}
                        placeholder="https://trustpilot.com/review/your-business.com"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button 
            onClick={generateMicrosite} 
            disabled={creating}
            className="w-full"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Microsite
          </Button>
        </CardContent>
      </Card>

      {/* Existing Microsites */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Generated Microsites</h3>
        {microsites.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No microsites generated yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {microsites.map((microsite) => (
              <Card key={microsite.id}>
                <CardHeader>
                  <CardTitle className="text-base">{microsite.client_name}</CardTitle>
                  <CardDescription>/{microsite.domain_slug}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewMicrosite(microsite.domain_slug)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewAnalytics(microsite.id, microsite.client_name)}
                    >
                      <BarChart className="h-4 w-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Created {new Date(microsite.created_at).toLocaleDateString()}</p>
                    {microsite.performance_score && (
                      <p>Performance: {microsite.performance_score}/100</p>
                    )}
                    {microsite.analytics_data && (
                      <p>Views: {microsite.analytics_data.totalViews || 0}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
