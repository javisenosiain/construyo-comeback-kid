import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database,
  CreditCard,
  Calendar,
  Share2,
  Palette,
  Globe,
  Brain,
  Video,
  AlertCircle,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { integrationManager } from '@/lib/integrations/IntegrationManager';
import { useToast } from '@/hooks/use-toast';

interface ServiceStatus {
  service: string;
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  lastActivity?: any;
  error?: string;
}

const serviceIcons = {
  zapier: Zap,
  airtable: Database,
  stripe: CreditCard,
  calendly: Calendar,
  xero: CreditCard,
  quickbooks: CreditCard,
  buffer: Share2,
  canva: Palette,
  webflow: Globe,
  typedream: Globe,
  openai: Brain,
  runwayml: Video
};

const serviceNames = {
  zapier: 'Zapier',
  airtable: 'Airtable',
  stripe: 'Stripe',
  calendly: 'Calendly',
  xero: 'Xero',
  quickbooks: 'QuickBooks',
  buffer: 'Buffer',
  canva: 'Canva',
  webflow: 'Webflow',
  typedream: 'Typedream',
  openai: 'OpenAI',
  runwayml: 'RunwayML'
};

export const IntegrationDashboard: React.FC = () => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadIntegrationData();
  }, []);

  const loadIntegrationData = async () => {
    try {
      setLoading(true);
      
      // Get status for all services
      const statusData = await integrationManager.getIntegrationStatus();
      setServices(statusData);

      // Get analytics for the last 7 days
      const analyticsData = await integrationManager.getAnalytics(undefined, {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      });
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Failed to load integration data:', error);
      toast({
        title: "Error",
        description: "Failed to load integration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadIntegrationData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Integration data updated",
    });
  };

  const getStatusBadge = (service: ServiceStatus) => {
    if (!service.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (!service.configured) {
      return <Badge variant="outline">Not Configured</Badge>;
    }
    if (!service.connected) {
      return <Badge variant="destructive">Disconnected</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Connected</Badge>;
  };

  const getStatusIcon = (service: ServiceStatus) => {
    if (!service.enabled) {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
    if (!service.configured || !service.connected) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  // Sample function to trigger Zapier workflow for lead123
  const triggerZapierForLead123 = async () => {
    try {
      const result = await integrationManager.triggerZapierForNewLead('lead123', {
        customerName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        status: 'new',
        priority: 'high',
        source: 'website',
        estimatedValue: 5000,
        notes: 'Interested in kitchen renovation',
        created_by: 'user123'
      });

      if (result.success) {
        toast({
          title: "Zapier Workflow Triggered",
          description: "Lead123 sync workflow has been triggered successfully",
        });
      } else {
        toast({
          title: "Workflow Failed",
          description: result.error || "Failed to trigger Zapier workflow",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger Zapier workflow",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tools & Integrations</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tools & Integrations</h2>
          <p className="text-muted-foreground">
            Manage workflow automation and third-party integrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={triggerZapierForLead123} variant="default">
            <Zap className="w-4 h-4 mr-2" />
            Test Zapier (Lead123)
          </Button>
        </div>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.successRate}%</div>
              <Progress value={analytics.successRate} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics.averageResponseTime)}ms</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{analytics.errorRate}%</div>
              <Progress value={analytics.errorRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(services).map(([serviceName, service]) => {
              const IconComponent = serviceIcons[serviceName as keyof typeof serviceIcons] || Settings;
              
              return (
                <Card key={serviceName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5" />
                        <CardTitle className="text-lg">
                          {serviceNames[serviceName as keyof typeof serviceNames] || serviceName}
                        </CardTitle>
                      </div>
                      {getStatusIcon(service)}
                    </div>
                    <CardDescription>
                      {getStatusBadge(service)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {service.error && (
                      <Alert className="mb-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {service.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Enabled:</span>
                        <span>{service.enabled ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Configured:</span>
                        <span>{service.configured ? 'Yes' : 'No'}</span>
                      </div>
                      {service.lastActivity && (
                        <div className="flex justify-between">
                          <span>Last Activity:</span>
                          <span>{new Date(service.lastActivity.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Requests by Service</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.requestsByService).map(([service, count]) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {serviceNames[service as keyof typeof serviceNames] || service}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ 
                                  width: `${(count as number / analytics.totalRequests) * 100}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Common Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.commonErrors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between items-center">
                            <span className="truncate mr-2">{error.error}</span>
                            <Badge variant="outline">{error.count}</Badge>
                          </div>
                        </div>
                      ))}
                      {analytics.commonErrors.length === 0 && (
                        <p className="text-sm text-muted-foreground">No errors in the selected period</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sample Workflows</CardTitle>
                <CardDescription>
                  Pre-configured workflow examples for common automation tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-1">Lead Sync to CRM</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Automatically sync new leads to external CRM systems via Zapier
                  </p>
                  <Button size="sm" onClick={triggerZapierForLead123}>
                    <Zap className="w-4 h-4 mr-2" />
                    Trigger for Lead123
                  </Button>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-1">Invoice Processing</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Generate invoices in Stripe and sync to QuickBooks/Xero
                  </p>
                  <Button size="sm" variant="outline" disabled>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>

                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-1">Social Media Automation</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Create designs in Canva and schedule posts via Buffer
                  </p>
                  <Button size="sm" variant="outline" disabled>
                    <Share2 className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Configuration</CardTitle>
                <CardDescription>
                  Set up authentication and rate limits for your integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Integration configuration requires API keys and webhook URLs. 
                    Please ensure you have the necessary credentials from each service provider.
                  </AlertDescription>
                </Alert>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Required Setup:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• API keys for each service</li>
                    <li>• Webhook URLs (Zapier, external systems)</li>
                    <li>• Rate limit configurations</li>
                    <li>• Error handling preferences</li>
                    <li>• Activity logging settings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};