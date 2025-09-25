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
import { toast } from "sonner";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Calendar,
  Settings,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  TestTube,
  Loader2,
  CheckCircle
} from "lucide-react";

interface MessageTemplate {
  id: string;
  template_name: string;
  template_type: 'email' | 'whatsapp' | 'sms';
  subject_template?: string;
  message_template: string;
  calendly_link_template: string;
  is_active: boolean;
  trigger_conditions: any;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  status: string;
}

export default function AutoResponderSystem() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [testLead, setTestLead] = useState<Lead | null>(null);
  
  // Template form state
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    template_type: 'email' as 'email' | 'whatsapp' | 'sms',
    subject_template: '',
    message_template: '',
    calendly_link_template: 'https://calendly.com/your-company/consultation',
    is_active: true,
    trigger_conditions: {
      trigger_on: ['lead_created'],
      conditions: { status: 'new' }
    }
  });

  // Load data on component mount
  useEffect(() => {
    fetchTemplates();
    fetchLeads();
  }, []);

  /**
   * Fetch message templates from database
   */
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as MessageTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  /**
   * Fetch leads for testing
   */
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, project_type, status')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const leadsWithFullName = (data || []).map(lead => ({
        ...lead,
        customer_name: `${lead.first_name} ${lead.last_name}`
      }));
      setLeads(leadsWithFullName as any);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  /**
   * Save or update message template
   */
  const saveTemplate = async () => {
    if (!templateForm.template_name || !templateForm.message_template) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const templateData = {
        ...templateForm,
        user_id: user.id,
        trigger_conditions: templateForm.trigger_conditions
      };

      let result;
      if (selectedTemplate) {
        // Update existing template
        result = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
      } else {
        // Create new template
        result = await supabase
          .from('message_templates')
          .insert([templateData]);
      }

      if (result.error) throw result.error;

      toast.success(selectedTemplate ? 'Template updated!' : 'Template created!');
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete message template
   */
  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  /**
   * Send test message to selected lead
   */
  const sendTestMessage = async () => {
    if (!testLead || !selectedTemplate) {
      toast.error('Please select a lead and template');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Sending test auto-responder for lead:', testLead.id);
      
      const { data, error } = await supabase.functions.invoke('auto-responder', {
        body: {
          leadId: testLead.id,
          triggerType: 'manual',
          templateId: selectedTemplate.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Test ${data.messageType} sent to ${testLead.first_name} ${testLead.last_name}!`);
      } else {
        toast.error(`Failed to send test message: ${data.errorMessage}`);
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Failed to send test message');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trigger auto-responder for a specific lead
   * Sample call for lead ID "lead456"
   */
  const triggerAutoResponder = async (leadId: string, triggerType: string = 'manual') => {
    setLoading(true);
    try {
      console.log(`🚀 Triggering auto-responder for lead: ${leadId}`);
      
      const { data, error } = await supabase.functions.invoke('auto-responder', {
        body: {
          leadId,
          triggerType
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Auto-responder sent successfully via ${data.messageType}!`);
      } else {
        toast.error(`Auto-responder failed: ${data.errorMessage}`);
      }

      return data;
    } catch (error) {
      console.error('Error triggering auto-responder:', error);
      toast.error('Failed to trigger auto-responder');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset template form
   */
  const resetForm = () => {
    setTemplateForm({
      template_name: '',
      template_type: 'email',
      subject_template: '',
      message_template: '',
      calendly_link_template: 'https://calendly.com/your-company/consultation',
      is_active: true,
      trigger_conditions: {
        trigger_on: ['lead_created'],
        conditions: { status: 'new' }
      }
    });
    setSelectedTemplate(null);
  };

  /**
   * Edit existing template
   */
  const editTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      template_name: template.template_name,
      template_type: template.template_type,
      subject_template: template.subject_template || '',
      message_template: template.message_template,
      calendly_link_template: template.calendly_link_template,
      is_active: template.is_active,
      trigger_conditions: typeof template.trigger_conditions === 'string' 
        ? JSON.parse(template.trigger_conditions) 
        : template.trigger_conditions
    });
  };

  /**
   * Get message type icon
   */
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-row sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auto-Responder System</h2>
          <p className="text-muted-foreground">
            Automated customer engagement with quote booking links
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="test">Test & Send</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>{selectedTemplate ? 'Edit Template' : 'Create Template'}</span>
                </CardTitle>
                <CardDescription>
                  Create personalized auto-responder templates with dynamic fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    placeholder="e.g., Welcome & Quote Booking"
                    value={templateForm.template_name}
                    onChange={(e) => setTemplateForm({...templateForm, template_name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="messageType">Message Type</Label>
                  <Select 
                    value={templateForm.template_type} 
                    onValueChange={(value: 'email' | 'whatsapp' | 'sms') => 
                      setTemplateForm({...templateForm, template_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {templateForm.template_type === 'email' && (
                  <div>
                    <Label htmlFor="subject">Email Subject Template</Label>
                    <Input
                      id="subject"
                      placeholder="Your {ProjectType} Project Quote - Let's Schedule a Call!"
                      value={templateForm.subject_template}
                      onChange={(e) => setTemplateForm({...templateForm, subject_template: e.target.value})}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Message Template</Label>
                  <Textarea
                    id="message"
                    placeholder="Hi {FirstName}! Thanks for your interest in our {ProjectType} services..."
                    value={templateForm.message_template}
                    onChange={(e) => setTemplateForm({...templateForm, message_template: e.target.value})}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available fields: {"{FirstName}, {LastName}, {ProjectType}, {CalendlyLink}, {BudgetRange}"}
                  </p>
                </div>

                <div>
                  <Label htmlFor="calendlyLink">Calendly Booking Link</Label>
                  <Input
                    id="calendlyLink"
                    placeholder="https://calendly.com/your-company/consultation"
                    value={templateForm.calendly_link_template}
                    onChange={(e) => setTemplateForm({...templateForm, calendly_link_template: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={templateForm.is_active}
                    onCheckedChange={(checked) => setTemplateForm({...templateForm, is_active: checked})}
                  />
                  <Label>Active Template</Label>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={saveTemplate} disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {selectedTemplate ? 'Update' : 'Create'} Template
                      </>
                    )}
                  </Button>
                  {selectedTemplate && (
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Templates List */}
            <Card>
              <CardHeader>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>
                  Manage your auto-responder templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMessageIcon(template.template_type)}
                          <span className="font-medium">{template.template_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.message_template}
                      </p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {template.calendly_link_template}
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No templates created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test & Send Tab */}
        <TabsContent value="test" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Test Auto-Responder</span>
                </CardTitle>
                <CardDescription>
                  Test your templates with real lead data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Lead</Label>
                  <Select 
                    value={testLead?.id || ''} 
                    onValueChange={(value) => {
                      const lead = leads.find(l => l.id === value);
                      setTestLead(lead || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a lead to test with" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.first_name} {lead.last_name} - {lead.project_type || 'No project type'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Template</Label>
                  <Select 
                    value={selectedTemplate?.id || ''} 
                    onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name} ({template.template_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={sendTestMessage}
                  disabled={loading || !testLead || !selectedTemplate}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Test Message
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Manual Trigger */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Manual Trigger</span>
                </CardTitle>
                <CardDescription>
                  Manually trigger auto-responders for specific leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {lead.email} • {lead.project_type || 'No project type'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerAutoResponder(lead.id)}
                        disabled={loading}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No leads available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Auto-Responder Settings</span>
              </CardTitle>
              <CardDescription>
                Configure GDPR compliance and messaging preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded bg-muted/50">
                  <h4 className="font-medium mb-2">🔒 GDPR Compliance</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• All messages are encrypted and logged securely</li>
                    <li>• Lead data is processed only for legitimate business purposes</li>
                    <li>• Customers can opt-out via reply or unsubscribe links</li>
                    <li>• Data retention follows your configured policies</li>
                  </ul>
                </div>

                <div className="p-4 border rounded bg-muted/50">
                  <h4 className="font-medium mb-2">🔄 Sample API Call</h4>
                  <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
{`// Trigger auto-responder for lead ID "lead456"
const response = await supabase.functions.invoke('auto-responder', {
  body: {
    leadId: "lead456",
    triggerType: "lead_created"
  }
});`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}