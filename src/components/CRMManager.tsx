import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Upload,
  Database,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  Zap
} from "lucide-react";

interface CRMRecord {
  name: string;
  email: string;
  phone?: string;
  project_type?: string;
  source?: string;
  budget_range?: string;
  timeline?: string;
  description?: string;
  address?: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

interface Lead {
  id: string;
  customer_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  source: string;
  status: string;
  created_at: string;
  budget_range?: string;
  priority?: string;
}

export default function CRMManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("single");
  
  // Single record form state
  const [singleRecord, setSingleRecord] = useState<CRMRecord>({
    name: '',
    email: '',
    phone: '',
    project_type: '',
    source: 'manual',
    budget_range: '',
    timeline: '',
    description: '',
    address: '',
    priority: 'medium',
    notes: ''
  });

  // Batch processing state
  const [batchData, setBatchData] = useState('');
  const [batchResults, setBatchResults] = useState<any[]>([]);

  // External CRM sync settings
  const [zapierWebhook, setZapierWebhook] = useState('');
  const [enableExternalSync, setEnableExternalSync] = useState(false);

  // Load leads on component mount
  useEffect(() => {
    fetchLeads();
  }, []);

  /**
   * Fetch existing leads from database
   */
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    }
  };

  /**
   * Create a single CRM record
   */
  const createSingleRecord = async () => {
    if (!singleRecord.name || !singleRecord.email) {
      toast.error('Name and email are required');
      return;
    }

    setLoading(true);
    try {
      console.log('🏗️ Creating single CRM record for:', singleRecord.name);

      const payload = {
        ...singleRecord,
        zapier_webhook: enableExternalSync ? zapierWebhook : undefined,
        external_crm_sync: enableExternalSync && zapierWebhook
      };

      const { data, error } = await supabase.functions.invoke('crm-manager', {
        body: payload
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`CRM record created for ${singleRecord.name}!`);
        
        // Show external sync result if applicable
        if (data.external_sync) {
          if (data.external_sync.success) {
            toast.success('Successfully synced to external CRM');
          } else {
            toast.error(`External sync failed: ${data.external_sync.error}`);
          }
        }

        // Reset form
        setSingleRecord({
          name: '',
          email: '',
          phone: '',
          project_type: '',
          source: 'manual',
          budget_range: '',
          timeline: '',
          description: '',
          address: '',
          priority: 'medium',
          notes: ''
        });

        // Refresh leads list
        fetchLeads();
      } else {
        toast.error(`Failed to create record: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating CRM record:', error);
      toast.error('Failed to create CRM record');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process batch CRM records
   */
  const processBatchRecords = async () => {
    if (!batchData.trim()) {
      toast.error('Please enter batch data');
      return;
    }

    setLoading(true);
    try {
      console.log('📦 Processing batch CRM records');

      // Parse CSV-like data (name,email,phone,project_type)
      const lines = batchData.trim().split('\n');
      const records: CRMRecord[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [name, email, phone, project_type, source] = line.split(',').map(s => s.trim());
        
        if (name && email) {
          records.push({
            name,
            email,
            phone: phone || '',
            project_type: project_type || '',
            source: source || 'batch_import',
            priority: 'medium'
          });
        }
      }

      if (records.length === 0) {
        toast.error('No valid records found in batch data');
        return;
      }

      const payload = {
        records,
        zapier_webhook: enableExternalSync ? zapierWebhook : undefined,
        external_crm_sync: enableExternalSync && zapierWebhook
      };

      const { data, error } = await supabase.functions.invoke('crm-manager', {
        body: payload
      });

      if (error) throw error;

      setBatchResults(data.results || []);

      if (data.success) {
        toast.success(`Successfully processed ${records.length} records!`);
      } else {
        const successCount = data.results?.filter((r: any) => r.success).length || 0;
        toast.error(`Processed ${successCount}/${records.length} records. Check results for details.`);
      }

      // Show external sync result if applicable
      if (data.external_sync) {
        if (data.external_sync.success) {
          toast.success('Successfully synced batch to external CRM');
        } else {
          toast.error(`External sync failed: ${data.external_sync.error}`);
        }
      }

      // Refresh leads list
      fetchLeads();
    } catch (error) {
      console.error('Error processing batch records:', error);
      toast.error('Failed to process batch records');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sample call to create a record for testing
   */
  const createSampleRecord = async () => {
    setLoading(true);
    try {
      console.log('🧪 Creating sample CRM record');

      const samplePayload = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        project_type: "Kitchen",
        source: "sample_data",
        budget_range: "£10,000 - £20,000",
        timeline: "3-6 months",
        description: "Looking to renovate kitchen with modern appliances and island",
        address: "123 Main Street, London, SW1A 1AA",
        priority: "medium",
        notes: "Customer prefers granite countertops and stainless steel appliances",
        zapier_webhook: enableExternalSync ? zapierWebhook : undefined,
        external_crm_sync: enableExternalSync && zapierWebhook
      };

      const { data, error } = await supabase.functions.invoke('crm-manager', {
        body: samplePayload
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Sample CRM record created successfully!');
        fetchLeads();
      } else {
        toast.error(`Failed to create sample record: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating sample record:', error);
      toast.error('Failed to create sample record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM Manager</h2>
          <p className="text-muted-foreground">
            Create and manage customer records with validation and external sync
          </p>
        </div>
        <Button
          onClick={createSampleRecord}
          disabled={loading}
          variant="outline"
          className="mt-4 sm:mt-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Sample Record
            </>
          )}
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">Single Record</TabsTrigger>
          <TabsTrigger value="batch">Batch Import</TabsTrigger>
          <TabsTrigger value="records">View Records</TabsTrigger>
          <TabsTrigger value="settings">External Sync</TabsTrigger>
        </TabsList>

        {/* Single Record Tab */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Create Single CRM Record</span>
              </CardTitle>
              <CardDescription>
                Add a new customer record with full validation and optional external sync
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={singleRecord.name}
                    onChange={(e) => setSingleRecord({...singleRecord, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={singleRecord.email}
                    onChange={(e) => setSingleRecord({...singleRecord, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="1234567890"
                    value={singleRecord.phone}
                    onChange={(e) => setSingleRecord({...singleRecord, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select 
                    value={singleRecord.project_type} 
                    onValueChange={(value) => setSingleRecord({...singleRecord, project_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kitchen">Kitchen</SelectItem>
                      <SelectItem value="Bathroom">Bathroom</SelectItem>
                      <SelectItem value="Extension">Extension</SelectItem>
                      <SelectItem value="Loft Conversion">Loft Conversion</SelectItem>
                      <SelectItem value="Full Renovation">Full Renovation</SelectItem>
                      <SelectItem value="Garden/Landscaping">Garden/Landscaping</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select 
                    value={singleRecord.source} 
                    onValueChange={(value) => setSingleRecord({...singleRecord, source: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                      <SelectItem value="website_form">Website Form</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="phone_call">Phone Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={singleRecord.priority} 
                    onValueChange={(value: 'low' | 'medium' | 'high') => setSingleRecord({...singleRecord, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="budget">Budget Range</Label>
                  <Input
                    id="budget"
                    placeholder="£10,000 - £20,000"
                    value={singleRecord.budget_range}
                    onChange={(e) => setSingleRecord({...singleRecord, budget_range: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input
                    id="timeline"
                    placeholder="3-6 months"
                    value={singleRecord.timeline}
                    onChange={(e) => setSingleRecord({...singleRecord, timeline: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, London"
                  value={singleRecord.address}
                  onChange={(e) => setSingleRecord({...singleRecord, address: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the project requirements..."
                  value={singleRecord.description}
                  onChange={(e) => setSingleRecord({...singleRecord, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about the customer..."
                  value={singleRecord.notes}
                  onChange={(e) => setSingleRecord({...singleRecord, notes: e.target.value})}
                  rows={2}
                />
              </div>

              <Button onClick={createSingleRecord} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Record...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Create CRM Record
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Import Tab */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Batch Import CRM Records</span>
              </CardTitle>
              <CardDescription>
                Import multiple records using CSV format: name,email,phone,project_type,source
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batchData">CSV Data</Label>
                <Textarea
                  id="batchData"
                  placeholder={`John Doe,john@example.com,1234567890,Kitchen,website_form
Jane Smith,jane@example.com,0987654321,Bathroom,referral
Bob Wilson,bob@example.com,,Extension,social_media`}
                  value={batchData}
                  onChange={(e) => setBatchData(e.target.value)}
                  rows={10}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: name,email,phone,project_type,source (one record per line)
                </p>
              </div>

              <Button onClick={processBatchRecords} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing Batch...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process Batch Records
                  </>
                )}
              </Button>

              {batchResults.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Batch Processing Results:</h4>
                  <div className="space-y-2">
                    {batchResults.map((result, index) => (
                      <Alert key={index} variant={result.success ? "default" : "destructive"}>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>
                          Record {index + 1}: {result.success ? 'Success' : result.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>CRM Records</span>
                <Badge variant="secondary">{leads.length}</Badge>
              </CardTitle>
              <CardDescription>
                Recent customer records with GDPR-compliant data handling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.map((lead) => (
                  <div key={lead.id} className="border rounded p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{lead.customer_name}</span>
                        <Badge variant={
                          lead.priority === 'high' ? 'destructive' :
                          lead.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {lead.priority || 'medium'}
                        </Badge>
                      </div>
                      <Badge variant="outline">{lead.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lead.email} • {lead.phone || 'No phone'} • {lead.project_type || 'No project type'}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mr-1" />
                      Source: {lead.source} • Created: {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No CRM records found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* External Sync Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>External CRM Integration</span>
              </CardTitle>
              <CardDescription>
                Configure Zapier webhooks for syncing with external CRMs (HubSpot, Pipedrive, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={enableExternalSync}
                  onCheckedChange={setEnableExternalSync}
                />
                <Label>Enable External CRM Sync</Label>
              </div>

              {enableExternalSync && (
                <div>
                  <Label htmlFor="webhook">Zapier Webhook URL</Label>
                  <Input
                    id="webhook"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={zapierWebhook}
                    onChange={(e) => setZapierWebhook(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a Zap with a webhook trigger and paste the URL here
                  </p>
                </div>
              )}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>GDPR Compliance:</strong> All customer data is encrypted and logged for audit purposes. 
                  External sync only occurs when explicitly enabled and configured.
                </AlertDescription>
              </Alert>

              <div className="p-4 border rounded bg-muted/50">
                <h4 className="font-medium mb-2">🔗 Supported External CRMs</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• HubSpot (via Zapier)</li>
                  <li>• Pipedrive (via Zapier)</li>
                  <li>• Zoho CRM (via Zapier)</li>
                  <li>• Google Sheets (via Zapier)</li>
                  <li>• Salesforce (via Zapier)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}