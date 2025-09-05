import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Calendar, ExternalLink, Send, Users, BarChart3, Settings } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "../integrations/supabase/client";

interface CalendlyStats {
  totalLinksGenerated: number;
  appointmentsBooked: number;
  conversionRate: number;
  topProjectTypes: Array<{ type: string; count: number }>;
}

interface Lead {
  id: string;
  customer_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  source?: string;
  status: string;
}

export default function CalendlyIntegration() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [projectType, setProjectType] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<CalendlyStats>({
    totalLinksGenerated: 0,
    appointmentsBooked: 0,
    conversionRate: 0,
    topProjectTypes: []
  });

  // Project type options
  const projectTypes = [
    'Kitchen', 'Bathroom', 'Extension', 'Loft Conversion',
    'Full Renovation', 'Garden', 'Commercial', 'Other'
  ];

  useEffect(() => {
    fetchLeads();
    fetchAnalytics();
  }, []);

  /**
   * Fetch leads from CRM
   */
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, customer_name, email, phone, project_type, source, status')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    }
  };

  /**
   * Fetch Calendly analytics
   */
  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_link_analytics')
        .select('event_type, event_data, created_at');

      if (error) throw error;

      const linkGenerated = data?.filter(item => item.event_type === 'link_generated').length || 0;
      const appointmentsBooked = data?.filter(item => item.event_type === 'appointment_booked').length || 0;
      
      // Calculate project type distribution
      const projectTypeCounts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.event_type === 'link_generated' && 
            item.event_data && 
            typeof item.event_data === 'object' && 
            item.event_data !== null &&
            'project_type' in item.event_data) {
          const type = String((item.event_data as any).project_type);
          projectTypeCounts[type] = (projectTypeCounts[type] || 0) + 1;
        }
      });

      const topProjectTypes = Object.entries(projectTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalLinksGenerated: linkGenerated,
        appointmentsBooked: appointmentsBooked,
        conversionRate: linkGenerated > 0 ? (appointmentsBooked / linkGenerated) * 100 : 0,
        topProjectTypes
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  /**
   * Generate Calendly booking link
   */
  const generateBookingLink = async () => {
    if (!selectedLead || !projectType) {
      toast({
        title: "Error",
        description: "Please select a lead and project type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const lead = leads.find(l => l.id === selectedLead);
      
      const { data, error } = await supabase.functions.invoke('calendly-integration/generate-link', {
        body: {
          leadId: selectedLead,
          projectType: projectType,
          leadName: lead?.customer_name,
          leadEmail: lead?.email
        }
      });

      if (error) throw error;

      setGeneratedLink(data.booking_link);
      toast({
        title: "Success",
        description: "Calendly booking link generated successfully!",
      });

      // Refresh analytics
      fetchAnalytics();
      
    } catch (error) {
      console.error('Failed to generate booking link:', error);
      toast({
        title: "Error",
        description: "Failed to generate booking link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy link to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Copied",
        description: "Booking link copied to clipboard!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  /**
   * Send booking link via auto-responder
   */
  const sendBookingLink = async () => {
    if (!selectedLead || !generatedLink) {
      toast({
        title: "Error",
        description: "Please generate a booking link first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-responder', {
        body: {
          leadId: selectedLead,
          triggerType: 'manual',
          customMessage: {
            type: 'email',
            subject: `Book Your ${projectType} Consultation - Construyo`,
            message: `Hi {customer_name},

Thank you for your interest in your ${projectType} project! 

We'd love to discuss your vision and provide you with a personalized consultation. Please book a convenient time slot using the link below:

${generatedLink}

During our consultation, we'll:
• Understand your project requirements
• Discuss timeline and budget
• Provide expert recommendations
• Answer any questions you have

Looking forward to speaking with you soon!

Best regards,
The Construyo Team`
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking link sent via email!",
      });
      
    } catch (error) {
      console.error('Failed to send booking link:', error);
      toast({
        title: "Error",
        description: "Failed to send booking link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendly Integration</h1>
        <p className="text-muted-foreground">Generate project-specific booking links and manage consultation scheduling</p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Generate Links
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Generate Booking Link
                </CardTitle>
                <CardDescription>
                  Create project-specific Calendly links for leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-select">Select Lead</Label>
                  <Select value={selectedLead} onValueChange={setSelectedLead}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.customer_name} - {lead.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-type">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={generateBookingLink} 
                  disabled={isLoading || !selectedLead || !projectType}
                  className="w-full"
                >
                  {isLoading ? 'Generating...' : 'Generate Booking Link'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Link</CardTitle>
                <CardDescription>
                  Share this link with your lead or send via auto-responder
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedLink ? (
                  <>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-mono break-all">{generatedLink}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                        Copy Link
                      </Button>
                      <Button onClick={sendBookingLink} disabled={isLoading} className="flex-1">
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(generatedLink, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Test Booking Page
                    </Button>
                  </>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Generate a booking link to see options for sharing and testing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Links Generated</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLinksGenerated}</div>
                <p className="text-xs text-muted-foreground">Total booking links created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments Booked</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.appointmentsBooked}</div>
                <p className="text-xs text-muted-foreground">Successful consultations scheduled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Links to bookings ratio</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Top Project Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.topProjectTypes.map((item, index) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className="text-sm">{item.type}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Calendly Configuration</CardTitle>
              <CardDescription>
                Configure your Calendly integration settings and project type mappings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>Project Type Mappings:</strong><br/>
                  • Kitchen → kitchen-renovation-consultation<br/>
                  • Bathroom → bathroom-renovation-consultation<br/>
                  • Extension → home-extension-consultation<br/>
                  • Loft Conversion → loft-conversion-consultation<br/>
                  • Full Renovation → full-home-renovation-consultation<br/>
                  • Garden → garden-landscaping-consultation<br/>
                  • Commercial → commercial-project-consultation<br/>
                  • Other → general-construction-consultation
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Calendly Base URL</Label>
                  <Input 
                    value="https://calendly.com/construyo-consultations" 
                    disabled 
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input 
                    value="https://oolfnlkrwythebmlocaj.supabase.co/functions/v1/calendly-integration/webhook"
                    disabled 
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Configure this URL in your Calendly webhook settings to sync appointments
                  </p>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Setup Instructions:</strong><br/>
                    1. Create event types in Calendly matching the project type slugs above<br/>
                    2. Configure the webhook URL in your Calendly account<br/>
                    3. Ensure CALENDLY_API_TOKEN is set in your Supabase secrets<br/>
                    4. Test the integration using the Generate Links tab
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}