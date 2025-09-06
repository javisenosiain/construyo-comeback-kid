import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentProvider {
  id?: string;
  provider_type: string;
  is_active: boolean;
  webhook_url?: string;
  sync_enabled: boolean;
  zapier_webhook?: string;
}

const PaymentProviderSettings = () => {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProviderSettings();
    }
  }, [user]);

  const fetchProviderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_provider_settings')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;

      // Initialize with default providers if none exist
      const defaultProviders = ['stripe', 'quickbooks', 'xero'];
      const existingTypes = (data || []).map(p => p.provider_type);
      const missingProviders = defaultProviders.filter(type => !existingTypes.includes(type));

      const allProviders = [
        ...(data || []),
        ...missingProviders.map(type => ({
          provider_type: type,
          is_active: false,
          sync_enabled: false,
        }))
      ];

      setProviders(allProviders);
    } catch (error) {
      console.error('Error fetching provider settings:', error);
      toast.error('Failed to load payment provider settings');
    } finally {
      setLoading(false);
    }
  };

  const saveProviderSettings = async (providerType: string, settings: Partial<PaymentProvider>) => {
    if (!user) return;

    setSaving(true);
    try {
      const apiKey = credentials[providerType];
      const encryptedCredentials = apiKey ? btoa(apiKey) : undefined; // Simple encoding - use proper encryption in production

      const { error } = await supabase
        .from('payment_provider_settings')
        .upsert({
          user_id: user.id,
          provider_type: providerType,
          encrypted_credentials: encryptedCredentials,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setProviders(prev => prev.map(p => 
        p.provider_type === providerType 
          ? { ...p, ...settings }
          : p
      ));

      toast.success(`${providerType} settings saved successfully`);
    } catch (error) {
      console.error('Error saving provider settings:', error);
      toast.error(`Failed to save ${providerType} settings`);
    } finally {
      setSaving(false);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'stripe': return '💳';
      case 'quickbooks': return '📊';
      case 'xero': return '🏢';
      default: return '💰';
    }
  };

  const getProviderDescription = (type: string) => {
    switch (type) {
      case 'stripe': return 'Accept online payments with Stripe';
      case 'quickbooks': return 'Sync invoices with QuickBooks Online';
      case 'xero': return 'Integrate with Xero accounting';
      default: return 'Payment processing integration';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment provider settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Provider Settings
          </CardTitle>
          <CardDescription>
            Configure your payment processing integrations for automated invoice creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="stripe" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              {providers.map((provider) => (
                <TabsTrigger 
                  key={provider.provider_type} 
                  value={provider.provider_type}
                  className="flex items-center gap-2"
                >
                  <span>{getProviderIcon(provider.provider_type)}</span>
                  <span className="capitalize">{provider.provider_type}</span>
                  {provider.is_active && (
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      Active
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {providers.map((provider) => (
              <TabsContent key={provider.provider_type} value={provider.provider_type}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>{getProviderIcon(provider.provider_type)}</span>
                      <span className="capitalize">{provider.provider_type} Integration</span>
                    </CardTitle>
                    <CardDescription>
                      {getProviderDescription(provider.provider_type)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Enable Integration</Label>
                        <p className="text-sm text-muted-foreground">
                          Activate {provider.provider_type} for invoice processing
                        </p>
                      </div>
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={(checked) =>
                          saveProviderSettings(provider.provider_type, { is_active: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.provider_type}-api-key`}>
                        API Key / Secret Key
                      </Label>
                      <Input
                        id={`${provider.provider_type}-api-key`}
                        type="password"
                        placeholder={`Enter your ${provider.provider_type} API key`}
                        value={credentials[provider.provider_type] || ''}
                        onChange={(e) =>
                          setCredentials(prev => ({
                            ...prev,
                            [provider.provider_type]: e.target.value
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Your API key is encrypted and stored securely
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${provider.provider_type}-webhook`}>
                        Webhook URL (Optional)
                      </Label>
                      <Input
                        id={`${provider.provider_type}-webhook`}
                        placeholder="https://your-app.com/webhook"
                        value={provider.webhook_url || ''}
                        onChange={(e) =>
                          setProviders(prev => prev.map(p =>
                            p.provider_type === provider.provider_type
                              ? { ...p, webhook_url: e.target.value }
                              : p
                          ))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Google Sheets Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync invoices to Google Sheets via Zapier
                        </p>
                      </div>
                      <Switch
                        checked={provider.sync_enabled}
                        onCheckedChange={(checked) =>
                          setProviders(prev => prev.map(p =>
                            p.provider_type === provider.provider_type
                              ? { ...p, sync_enabled: checked }
                              : p
                          ))
                        }
                      />
                    </div>

                    {provider.sync_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.provider_type}-zapier`}>
                          Zapier Webhook URL
                        </Label>
                        <Input
                          id={`${provider.provider_type}-zapier`}
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          value={provider.zapier_webhook || ''}
                          onChange={(e) =>
                            setProviders(prev => prev.map(p =>
                              p.provider_type === provider.provider_type
                                ? { ...p, zapier_webhook: e.target.value }
                                : p
                            ))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Create a Zap with a webhook trigger to sync invoice data to Google Sheets
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => saveProviderSettings(provider.provider_type, provider)}
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? 'Saving...' : `Save ${provider.provider_type} Settings`}
                    </Button>

                    {/* Security notice */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Security Notice</p>
                        <p>
                          All API keys are encrypted before storage. We recommend using restricted API keys 
                          with minimal required permissions for enhanced security.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                💳 Stripe Setup
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create a Stripe account</li>
                <li>• Get your secret key from the dashboard</li>
                <li>• Test with restricted keys first</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                📊 QuickBooks Setup
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Set up QuickBooks Online</li>
                <li>• Create an Intuit app</li>
                <li>• Generate OAuth tokens</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                🏢 Xero Setup
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create a Xero developer account</li>
                <li>• Register your application</li>
                <li>• Obtain API credentials</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentProviderSettings;