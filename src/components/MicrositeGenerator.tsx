import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Eye, BarChart } from "lucide-react";

interface MicrositeData {
  id: string;
  client_name: string;
  domain_slug: string;
  microsite_data: any;
  form_id: string | null;
  is_active: boolean;
  created_at: string;
  analytics_data: any;
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
  }, []);

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
      // Call the edge function to generate the microsite
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
            }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Microsite generated for ${formData.clientName}`,
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
      console.error('Error generating microsite:', error);
      toast({
        title: "Error",
        description: "Failed to generate microsite",
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

  const viewAnalytics = async (micrositeId: string) => {
    try {
      const { data, error } = await supabase
        .from('microsite_analytics')
        .select('*')
        .eq('microsite_id', micrositeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      toast({
        title: "Analytics",
        description: `Total events: ${data?.length || 0}`,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Sample function call for client ID "client789"
  const createSampleMicrosite = () => {
    setFormData({
      clientName: 'Client 789 Construction',
      domainSlug: 'client789-construction',
      services: 'Kitchen Renovations, Bathroom Remodeling, Home Extensions',
      contactEmail: 'contact@client789construction.com',
      contactPhone: '+44 7123 456 789',
      logoUrl: 'https://via.placeholder.com/150x60/2563eb/ffffff?text=Client789',
      formId: forms[0]?.id || '',
      zapierWebhook: 'https://hooks.zapier.com/hooks/catch/example/webhook',
      primaryColor: '#059669',
      description: 'Professional construction services with 15+ years of experience',
      calendlyUrl: 'https://calendly.com/client789/consultation',
      showPortfolio: true,
      portfolioMaxItems: 6,
      portfolioShowReviews: true,
      googleReviewUrl: 'https://g.page/r/client789-construction/review',
      trustpilotReviewUrl: 'https://trustpilot.com/review/client789construction.com'
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
          <h2 className="text-2xl font-bold">Microsite Generator</h2>
          <p className="text-muted-foreground">
            Create responsive one-page microsites for your clients
          </p>
        </div>
        <Button onClick={createSampleMicrosite} variant="outline">
          Load Sample (Client789)
        </Button>
      </div>

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
                      onClick={() => viewAnalytics(microsite.id)}
                    >
                      <BarChart className="h-4 w-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(microsite.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
