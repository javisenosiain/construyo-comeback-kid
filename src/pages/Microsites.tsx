import React from 'react';
import { MicrositeGenerator } from '@/components/MicrositeGenerator';
import { WhatsAppReferralSystem } from '@/components/WhatsAppReferralSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Zap, BarChart, Smartphone, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Microsites = () => {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Client Microsites</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Generate professional one-page microsites for your clients with embedded lead capture forms, 
          responsive design, and real-time analytics.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="text-center">
            <Globe className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Custom Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Client logos, colors, and services pulled directly from your CRM data
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Smartphone className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Responsive Design</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Fast-loading, mobile-optimized microsites that look great on any device
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Zap className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">CRM Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Form submissions sync directly to Construyo CRM and external systems via Zapier
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">WhatsApp Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Send trackable referral links via WhatsApp with respond.io integration
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface for Microsites and Referrals */}
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generator">Microsite Generator</TabsTrigger>
          <TabsTrigger value="referrals">WhatsApp Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <MicrositeGenerator />
        </TabsContent>

        <TabsContent value="referrals">
          <WhatsAppReferralSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Microsites;