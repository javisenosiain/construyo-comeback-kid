import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, Settings, Zap } from 'lucide-react';

interface CRMSettings {
  id?: string;
  user_id: string;
  external_crm: string;
  is_active: boolean;
  zapier_webhook: string;
  field_mappings: Record<string, Record<string, string>>;
  sync_enabled: boolean;
  auto_sync: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FieldMappingProps {
  recordType: 'lead' | 'customer' | 'invoice';
  mappings: Record<string, string>;
  onMappingsChange: (mappings: Record<string, string>) => void;
  crmType: string;
}

const FieldMappingEditor: React.FC<FieldMappingProps> = ({ 
  recordType, 
  mappings, 
  onMappingsChange,
  crmType 
}) => {
  const construyoFields = {
    lead: ['first_name', 'last_name', 'email', 'phone', 'company_name', 'project_type', 'status', 'notes', 'created_at'],
    customer: ['first_name', 'last_name', 'email', 'phone', 'company_name', 'service_address', 'city', 'country'],
    invoice: ['amount', 'currency', 'status', 'created_at']
  };

  const handleMappingChange = (construyoField: string, externalField: string) => {
    const newMappings = { ...mappings };
    if (externalField) {
      newMappings[construyoField] = externalField;
    } else {
      delete newMappings[construyoField];
    }
    onMappingsChange(newMappings);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 font-medium">
        <div>Construyo Field</div>
        <div>{crmType} Field</div>
      </div>
      {construyoFields[recordType].map((field) => (
        <div key={field} className="grid grid-cols-2 gap-4 items-center">
          <Label className="text-sm font-medium">{field}</Label>
          <Input
            value={mappings[field] || ''}
            onChange={(e) => handleMappingChange(field, e.target.value)}
            placeholder={`${crmType} field name`}
            className="text-sm"
          />
        </div>
      ))}
    </div>
  );
};

export const ExternalCRMSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CRMSettings>({
    user_id: user?.id || '',
    external_crm: '',
    is_active: false,
    zapier_webhook: '',
    field_mappings: {
      lead: {},
      customer: {},
      invoice: {}
    },
    sync_enabled: false,
    auto_sync: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const crmOptions = [
    { value: 'hubspot', label: 'HubSpot', description: 'Sync with HubSpot CRM' },
    { value: 'pipedrive', label: 'Pipedrive', description: 'Sync with Pipedrive CRM' },
    { value: 'zoho', label: 'Zoho CRM', description: 'Sync with Zoho CRM' },
    { value: 'google_sheets', label: 'Google Sheets', description: 'Sync with Google Sheets' }
  ];

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      // Use direct query to get settings
      const { data, error } = await supabase
        .from('external_crm_settings' as any)
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching CRM settings:', error);
        return;
      }

      if (data) {
        setSettings(data as unknown as CRMSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load CRM settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const settingsData = {
        user_id: user.id,
        external_crm: settings.external_crm,
        is_active: settings.is_active,
        zapier_webhook: settings.zapier_webhook,
        field_mappings: settings.field_mappings,
        sync_enabled: settings.sync_enabled,
        auto_sync: settings.auto_sync,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('external_crm_settings' as any)
        .upsert([settingsData], { onConflict: 'user_id' });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "CRM settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save CRM settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!settings.zapier_webhook) {
      toast({
        title: "Error",
        description: "Please enter a Zapier webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setTestingWebhook(true);
    try {
      const response = await fetch(settings.zapier_webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          message: 'Test webhook from Construyo CRM',
          timestamp: new Date().toISOString(),
          source: 'Construyo CRM Settings'
        }),
      });

      toast({
        title: "Webhook Test",
        description: "Test request sent to Zapier. Check your Zap history to confirm it was received.",
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Error",
        description: "Failed to test webhook. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const updateFieldMappings = (recordType: 'lead' | 'customer' | 'invoice', mappings: Record<string, string>) => {
    setSettings(prev => ({
      ...prev,
      field_mappings: {
        ...prev.field_mappings,
        [recordType]: mappings
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            External CRM Integration
          </CardTitle>
          <CardDescription>
            Connect your Construyo CRM with external CRM systems using Zapier webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crm-select">External CRM</Label>
              <Select 
                value={settings.external_crm} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, external_crm: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a CRM" />
                </SelectTrigger>
                <SelectContent>
                  {crmOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_active: checked }))}
                />
                <Badge variant={settings.is_active ? "default" : "secondary"}>
                  {settings.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                value={settings.zapier_webhook}
                onChange={(e) => setSettings(prev => ({ ...prev, zapier_webhook: e.target.value }))}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="flex-1"
              />
              <Button 
                onClick={testWebhook} 
                disabled={testingWebhook || !settings.zapier_webhook}
                variant="outline"
              >
                {testingWebhook ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Test
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Create a Zap in Zapier with a "Catch Hook" trigger and paste the webhook URL here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.sync_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sync_enabled: checked }))}
              />
              <Label>Enable Manual Sync</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.auto_sync}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_sync: checked }))}
              />
              <Label>Enable Auto Sync</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {settings.external_crm && (
        <Card>
          <CardHeader>
            <CardTitle>Field Mappings</CardTitle>
            <CardDescription>
              Map Construyo CRM fields to your {crmOptions.find(c => c.value === settings.external_crm)?.label} fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="lead">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lead">Leads</TabsTrigger>
                <TabsTrigger value="customer">Customers</TabsTrigger>
                <TabsTrigger value="invoice">Invoices</TabsTrigger>
              </TabsList>
              
              <TabsContent value="lead" className="mt-4">
                <FieldMappingEditor
                  recordType="lead"
                  mappings={settings.field_mappings.lead || {}}
                  onMappingsChange={(mappings) => updateFieldMappings('lead', mappings)}
                  crmType={settings.external_crm}
                />
              </TabsContent>
              
              <TabsContent value="customer" className="mt-4">
                <FieldMappingEditor
                  recordType="customer"
                  mappings={settings.field_mappings.customer || {}}
                  onMappingsChange={(mappings) => updateFieldMappings('customer', mappings)}
                  crmType={settings.external_crm}
                />
              </TabsContent>
              
              <TabsContent value="invoice" className="mt-4">
                <FieldMappingEditor
                  recordType="invoice"
                  mappings={settings.field_mappings.invoice || {}}
                  onMappingsChange={(mappings) => updateFieldMappings('invoice', mappings)}
                  crmType={settings.external_crm}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Create a Zapier Account</h4>
            <p className="text-sm text-muted-foreground">
              Sign up for a Zapier account if you don't have one already.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Create a New Zap</h4>
            <p className="text-sm text-muted-foreground">
              Create a new Zap with "Webhooks by Zapier" as the trigger app and "Catch Hook" as the trigger event.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Get Your Webhook URL</h4>
            <p className="text-sm text-muted-foreground">
              Copy the webhook URL from your Zap and paste it in the field above.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">4. Configure Your CRM Action</h4>
            <p className="text-sm text-muted-foreground">
              Add your external CRM as the action app and map the webhook data to your CRM fields.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">5. Test and Activate</h4>
            <p className="text-sm text-muted-foreground">
              Test your webhook using the "Test" button above, then activate your Zap.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};