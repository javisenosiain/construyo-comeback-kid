import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, CheckCircle, Zap, Globe, BarChart } from "lucide-react";

/**
 * Demo component showing enhanced microsite generation with Client789 example
 * Demonstrates all the improved features including CRM integration and analytics
 */
export const MicrositeDemo = () => {
  const [creating, setCreating] = useState(false);
  const [createdMicrosite, setCreatedMicrosite] = useState<any>(null);
  const { toast } = useToast();

  /**
   * Sample call to create a microsite for client ID "client789"
   * This demonstrates the complete workflow with all enhanced features
   */
  const createClient789Microsite = async () => {
    setCreating(true);
    
    try {
      console.log('🚀 Creating enhanced microsite for Client789...');
      
      // Enhanced microsite configuration for Client789
      const micrositeConfig = {
        action: 'create',
        micrositeData: {
          // Client Information (pulled from CRM)
          clientName: 'Client 789 Construction',
          domainSlug: 'client789-construction',
          description: 'Award-winning construction services with 15+ years of experience. Specializing in high-quality residential renovations and extensions across London.',
          
          // Services (from CRM specialties)
          services: [
            'Kitchen Renovations',
            'Bathroom Remodeling', 
            'Home Extensions',
            'Loft Conversions',
            'Garden Landscaping'
          ],
          
          // Contact Information (CRM integrated)
          contact: {
            email: 'contact@client789construction.com',
            phone: '+44 7123 456 789'
          },
          
          // Branding & Design
          logoUrl: 'https://via.placeholder.com/150x60/059669/ffffff?text=Client789',
          styling: {
            primaryColor: '#059669' // Professional green
          },
          
          // Lead Capture Form Integration
          formId: null, // Will use default embedded form
          zapierWebhook: 'https://hooks.zapier.com/hooks/catch/1234567/abcdefg',
          
          // Booking Integration
          calendlyUrl: 'https://calendly.com/client789/30min-consultation',
          
          // Portfolio Settings
          showPortfolio: true,
          portfolioSettings: {
            maxItems: 8,
            showReviews: true,
            googleReviewUrl: 'https://g.page/r/client789-construction/review',
            trustpilotReviewUrl: 'https://uk.trustpilot.com/review/client789construction.com'
          },
          
          // Enhanced Features
          enableAnalytics: true,    // Comprehensive tracking
          enableSEO: true,         // Search engine optimization
          responsive: true,        // Mobile-first design
          fastLoading: true        // Performance optimization
        }
      };

      // Call the enhanced microsite generator
      const { data, error } = await supabase.functions.invoke('microsite-generator', {
        body: micrositeConfig
      });

      if (error) throw error;

      setCreatedMicrosite(data);
      
      toast({
        title: "🎉 Client789 Microsite Created!",
        description: "Professional microsite with CRM integration, analytics, and fast loading",
      });

      console.log('✅ Enhanced microsite created:', {
        url: data.url,
        performance: data.performance,
        analytics: data.analytics,
        features: [
          'CRM Integration',
          'Lead Capture Forms', 
          'Portfolio Showcase',
          'Review Integration',
          'Analytics Tracking',
          'Zapier CRM Sync',
          'SEO Optimized',
          'Mobile Responsive',
          'Fast Loading'
        ]
      });

    } catch (error) {
      console.error('❌ Error creating Client789 microsite:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create microsite",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Enhanced Microsite Demo - Client789
          </CardTitle>
          <CardDescription>
            Demonstration of the complete microsite generation workflow with all enhanced features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Features Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              CRM Integration
            </Badge>
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Lead Capture
            </Badge>
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Portfolio Showcase
            </Badge>
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Analytics Tracking
            </Badge>
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              Zapier CRM Sync
            </Badge>
            <Badge variant="secondary" className="justify-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              SEO Optimized
            </Badge>
          </div>

          {/* Sample Configuration Display */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Sample Configuration for Client789:</h4>
            <div className="text-sm space-y-1 text-muted-foreground font-mono">
              <div>• Client: Client 789 Construction</div>
              <div>• Domain: client789-construction</div>
              <div>• Services: Kitchen, Bathroom, Extensions, Loft, Garden</div>
              <div>• Features: Portfolio, Reviews, Analytics, CRM Sync</div>
              <div>• Performance: Optimized loading, Mobile responsive</div>
            </div>
          </div>

          {/* Action Button */}
          <Button 
            onClick={createClient789Microsite} 
            disabled={creating}
            className="w-full"
            size="lg"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Enhanced Microsite...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Client789 Microsite
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Success Display */}
      {createdMicrosite && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Microsite Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                <strong>URL:</strong> 
                <a 
                  href={createdMicrosite.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {createdMicrosite.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              
              {createdMicrosite.performance && (
                <p className="text-sm">
                  <strong>Performance Score:</strong> {createdMicrosite.performance.score}/100
                </p>
              )}
              
              <p className="text-sm">
                <strong>Features Enabled:</strong> Analytics, CRM Sync, SEO, Mobile Responsive
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(createdMicrosite.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Microsite
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('Microsite details:', createdMicrosite);
                  toast({
                    title: "Details logged",
                    description: "Check browser console for full microsite details",
                  });
                }}
              >
                <BarChart className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Example */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Code Example</CardTitle>
          <CardDescription>
            Sample code showing how to create a microsite programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
            <code>{`// Enhanced Microsite Creation for Client789
const response = await supabase.functions.invoke('microsite-generator', {
  body: {
    action: 'create',
    micrositeData: {
      clientName: 'Client 789 Construction',
      domainSlug: 'client789-construction',
      services: ['Kitchen Renovations', 'Bathroom Remodeling'],
      contact: { 
        email: 'contact@client789construction.com',
        phone: '+44 7123 456 789' 
      },
      logoUrl: 'https://example.com/logo.png',
      zapierWebhook: 'https://hooks.zapier.com/...',
      styling: { primaryColor: '#059669' },
      showPortfolio: true,
      enableAnalytics: true,
      enableSEO: true,
      responsive: true,
      fastLoading: true
    }
  }
});

console.log('Microsite created:', response.data.url);`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};