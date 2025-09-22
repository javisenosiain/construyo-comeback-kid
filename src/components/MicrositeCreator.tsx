/**
 * React component for creating client microsites with real-time preview
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, ExternalLink, Copy, Eye, Code } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { MicrositeService, type MicrositeConfig, type MicrositeResult, createMicrositeForClient789 } from '@/lib/services/MicrositeService';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  services: string[];
}

export const MicrositeCreator: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [config, setConfig] = useState<Partial<MicrositeConfig>>({
    template: 'modern',
    provider: 'webflow',
    includePortfolio: true,
    includeTestimonials: true,
    analyticsEnabled: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<MicrositeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sample client data (in real app, this would come from CRM)
  const sampleClients: ClientData[] = [
    {
      id: 'client789',
      name: 'ABC Construction Ltd',
      email: 'info@abcconstruction.com',
      phone: '+44 20 7123 4567',
      company_name: 'ABC Construction Ltd',
      services: ['Kitchen Renovation', 'Bathroom Installation', 'Home Extensions']
    },
    {
      id: 'client456',
      name: 'XYZ Plumbing Services',
      email: 'contact@xyzplumbing.co.uk',
      phone: '+44 161 234 5678',
      company_name: 'XYZ Plumbing Services',
      services: ['Emergency Plumbing', 'Boiler Installation', 'Pipe Repairs']
    }
  ];

  const handleGenerateMicrosite = async () => {
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const micrositeService = new MicrositeService();
      
      const fullConfig: MicrositeConfig = {
        clientId: selectedClient,
        template: config.template || 'modern',
        provider: config.provider || 'webflow',
        includePortfolio: config.includePortfolio || false,
        includeTestimonials: config.includeTestimonials || false,
        analyticsEnabled: config.analyticsEnabled || true,
        customDomain: config.customDomain
      };

      const micrositeResult = await micrositeService.generateMicrosite(fullConfig);
      
      setResult(micrositeResult);
      
      toast({
        title: "Success!",
        description: "Microsite created successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDemoClient789 = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const demoResult = await createMicrositeForClient789();
      setResult(demoResult);
      setSelectedClient('client789');
      
      toast({
        title: "Demo Success!",
        description: "Demo microsite for client789 created successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Demo failed';
      setError(errorMessage);
      
      toast({
        title: "Demo Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  };

  const selectedClientData = sampleClients.find(c => c.id === selectedClient);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Microsite Creator</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Generate professional one-page microsites for your clients with integrated lead capture forms and analytics tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Microsite Configuration</CardTitle>
            <CardDescription>
              Set up your client's microsite with custom branding and features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client-select">Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client from CRM" />
                </SelectTrigger>
                <SelectContent>
                  {sampleClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClientData && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedClientData.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedClientData.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedClientData.services.map(service => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select 
                value={config.template} 
                onValueChange={(value: 'modern' | 'classic' | 'minimal') => 
                  setConfig(prev => ({ ...prev, template: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Hosting Platform</Label>
              <Select 
                value={config.provider} 
                onValueChange={(value: 'webflow' | 'typedream') => 
                  setConfig(prev => ({ ...prev, provider: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webflow">Webflow</SelectItem>
                  <SelectItem value="typedream">Typedream</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">Custom Domain (Optional)</Label>
              <Input
                id="domain"
                placeholder="e.g., client.yourdomain.com"
                value={config.customDomain || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, customDomain: e.target.value }))}
              />
            </div>

            {/* Feature Toggles */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Features</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="portfolio">Include Portfolio</Label>
                  <p className="text-sm text-muted-foreground">
                    Show previous work examples
                  </p>
                </div>
                <Switch
                  id="portfolio"
                  checked={config.includePortfolio}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, includePortfolio: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="testimonials">Include Testimonials</Label>
                  <p className="text-sm text-muted-foreground">
                    Display customer reviews
                  </p>
                </div>
                <Switch
                  id="testimonials"
                  checked={config.includeTestimonials}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, includeTestimonials: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Analytics Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track visits and form submissions
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={config.analyticsEnabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({ ...prev, analyticsEnabled: checked }))
                  }
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleGenerateMicrosite} 
                disabled={isGenerating || !selectedClient}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Microsite'}
              </Button>
              
              <Button 
                onClick={handleDemoClient789} 
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? 'Creating Demo...' : 'Create Demo for Client789'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Results</CardTitle>
            <CardDescription>
              View and manage your generated microsite
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Microsite created successfully! Status: {result.deploymentStatus}
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="embed">Embed</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Microsite ID</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-sm bg-muted p-2 rounded">
                            {result.micrositeId}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(result.micrositeId, "Microsite ID")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Live URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-sm bg-muted p-2 rounded">
                            {result.url}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(result.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(result.url, "Live URL")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {result.previewUrl && (
                        <div>
                          <Label className="text-sm font-medium">Preview URL</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-sm bg-muted p-2 rounded">
                              {result.previewUrl}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(result.previewUrl!, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="embed" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Form Embed Code</Label>
                      <Textarea
                        className="mt-2 font-mono text-sm"
                        rows={4}
                        readOnly
                        value={result.formEmbedCode}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => copyToClipboard(result.formEmbedCode, "Form embed code")}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Embed Code
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Analytics Tracking Code</Label>
                      <Textarea
                        className="mt-2 font-mono text-sm"
                        rows={6}
                        readOnly
                        value={result.analyticsCode}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => copyToClipboard(result.analyticsCode, "Analytics code")}
                      >
                        <Code className="h-4 w-4 mr-2" />
                        Copy Analytics Code
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {!result && !error && !isGenerating && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Configure your microsite settings and click "Generate Microsite" to begin.</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating your microsite...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};