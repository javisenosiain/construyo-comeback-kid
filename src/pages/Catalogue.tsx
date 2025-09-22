import React, { useState } from 'react';
import { SimpleCatalogueDisplay } from '@/components/SimpleCatalogueDisplay';
import { ProductCatalogueDisplay } from '@/components/ProductCatalogueDisplay';
import { MicrositeProductCatalogue } from '@/components/MicrositeProductCatalogue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Package, Globe, Code, Settings } from 'lucide-react';

/**
 * Enhanced Catalogue Page with Product Catalogue Display
 * Includes demo for client ID "client789" with comprehensive features
 */

export const Catalogue = () => {
  const [activeDemo, setActiveDemo] = useState<'simple' | 'product' | 'microsite'>('product');

  // Sample configuration for client789 demonstration
  const client789Config = {
    clientId: "client789",
    micrositeId: "client789-microsite-uuid",
    calendlyUrl: "https://calendly.com/client789/consultation",
    zapierWebhook: "https://hooks.zapier.com/hooks/catch/12345/client789",
    micrositeConfig: {
      branding: {
        primaryColor: "#3B82F6",
        logo: "/placeholder.svg",
        companyName: "Client789 Construction Ltd"
      },
      analytics: {
        enabled: true,
        gtmId: "GTM-CLIENT789"
      },
      seo: {
        title: "Client789 Construction Services - Professional Building & Renovation",
        description: "Leading construction company offering kitchen renovations, extensions, and building services. Get your free quote today.",
        keywords: ["construction", "renovation", "kitchen", "extension", "building"]
      }
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Product Catalogue Management</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive product catalogue system for client microsites with CRM integration, 
          pricing models, quote requests, and analytics tracking.
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Smart Catalogue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Fixed & quote-based pricing</li>
              <li>• Category & tag filtering</li>
              <li>• Featured services highlight</li>
              <li>• Responsive design</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              CRM Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Construyo CRM sync</li>
              <li>• External CRM via Zapier</li>
              <li>• Lead capture forms</li>
              <li>• Quote request tracking</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Analytics & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Catalogue view tracking</li>
              <li>• Quote request analytics</li>
              <li>• Conversion optimization</li>
              <li>• Performance monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Demo Tabs */}
      <Tabs value={activeDemo} onValueChange={(value) => setActiveDemo(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Simple Display
          </TabsTrigger>
          <TabsTrigger value="product" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Catalogue
          </TabsTrigger>
          <TabsTrigger value="microsite" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Microsite Version
          </TabsTrigger>
        </TabsList>

        {/* Client789 Demo Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Code className="h-5 w-5" />
              Client789 Demo Implementation
            </CardTitle>
            <CardDescription>
              Live demonstration of the product catalogue system configured for client ID "client789" 
              with full CRM integration, Calendly booking, and Zapier webhook sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Configuration:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Client ID: client789</li>
                  <li>• Calendly: /client789/consultation</li>
                  <li>• Zapier: hooks/catch/12345/client789</li>
                  <li>• Analytics: Enabled</li>
                </ul>
              </div>
              <div>
                <strong>Features Demonstrated:</strong>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>• Real-time quote requests</li>
                  <li>• CRM lead creation</li>
                  <li>• External CRM sync</li>
                  <li>• Analytics tracking</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="simple" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Simple Catalogue Display</CardTitle>
              <CardDescription>
                Basic catalogue display with sample data for quick implementation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleCatalogueDisplay 
                userId="client789" 
                showQuoteForm={true}
                className="max-w-6xl mx-auto" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="product" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Product Catalogue</CardTitle>
              <CardDescription>
                Full-featured product catalogue with CRM integration, filtering, and analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductCatalogueDisplay
                clientId={client789Config.clientId}
                micrositeId={client789Config.micrositeId}
                calendlyUrl={client789Config.calendlyUrl}
                zapierWebhook={client789Config.zapierWebhook}
                enableAnalytics={true}
                showHeader={true}
                maxItems={12}
                className="max-w-7xl mx-auto"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="microsite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Microsite Product Catalogue</CardTitle>
              <CardDescription>
                Microsite-optimized version with branding, SEO optimization, and enhanced performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MicrositeProductCatalogue
                clientId={client789Config.clientId}
                micrositeId={client789Config.micrositeId}
                micrositeConfig={client789Config.micrositeConfig}
                displayOptions={{
                  showHeader: true,
                  maxItems: 16,
                  featuredOnly: false
                }}
                className="max-w-7xl mx-auto"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Implementation Code Sample */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Sample Implementation Code
          </CardTitle>
          <CardDescription>
            Example code for implementing the product catalogue for client ID "client789"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Sample implementation for client ID "client789"
import { ProductCatalogueDisplay } from '@/components/ProductCatalogueDisplay';

const Client789Catalogue = () => {
  return (
    <ProductCatalogueDisplay 
      clientId="client789"
      micrositeId="client789-microsite-uuid"
      calendlyUrl="https://calendly.com/client789/consultation"
      zapierWebhook="https://hooks.zapier.com/hooks/catch/12345/client789"
      enableAnalytics={true}
      showHeader={true}
      maxItems={20}
      className="container mx-auto px-4"
    />
  );
};

// Features included:
// ✅ Pull catalogue data from Construyo CRM
// ✅ Display services with tags (Kitchen, Extension) 
// ✅ Fixed and quote-based pricing
// ✅ Embedded quote request forms
// ✅ Calendly integration for bookings
// ✅ CRM sync (Construyo + Zapier)
// ✅ Analytics tracking (views & requests)
// ✅ Responsive design & fast loading`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};