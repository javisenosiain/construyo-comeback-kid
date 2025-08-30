import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, MessageCircle, BarChart, Users, Send, Link as LinkIcon } from "lucide-react";

interface ReferralCampaign {
  id: string;
  campaign_name?: string;
  code: string;
  whatsapp_template: string;
  referral_message: string;
  target_microsite_id?: string;
  is_active: boolean;
  total_clicks: number;
  total_conversions: number;
  total_sent?: number;
  total_failed?: number;
  reward_description?: string;
  created_at: string;
  user_id: string;
  updated_at: string;
}

interface WhatsAppContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  last_sent_at?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

interface ReferralAnalytics {
  totalSent: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  recentActivity: any[];
}

/**
 * WhatsApp Referral System Component
 * 
 * Features:
 * - Auto-generate unique trackable referral links
 * - Respond.io WhatsApp API integration
 * - Referral tracking and analytics
 * - Message templates and customization
 * - Duplicate contact handling and merging
 * - Compliance with WhatsApp rate limits
 * - Real-time campaign monitoring
 */
export const WhatsAppReferralSystem: React.FC = () => {
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [microsites, setMicrosites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form states
  const [newCampaign, setNewCampaign] = useState({
    campaignName: '',
    targetMicrositeId: '',
    customMessage: '',
    rewardDescription: ''
  });
  
  const [bulkContacts, setBulkContacts] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Default WhatsApp message templates
  const messageTemplates = {
    standard: "🏗️ Hi {name}! I found an amazing construction service that I think you'd love. They're offering free quotes right now! Check them out: {link} \n\nLet me know what you think! 😊",
    reward: "🎁 Hey {name}! I'm sharing this amazing construction service with you. When you get a quote through my link, we both get rewards! {link} \n\nDon't miss out on this opportunity! 🏠✨",
    professional: "Hello {name}, I wanted to recommend this excellent construction company that recently helped me. They provide quality services and free consultations: {link} \n\nFeel free to mention my name when you contact them.",
    urgent: "⏰ {name}, there's a limited-time offer from this top construction company! Free quotes + special discounts for new customers: {link} \n\nDon't wait - this offer won't last long! 🚀"
  };

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Fetches all referral campaigns, microsites, and analytics
   */
  const fetchData = async () => {
    try {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch microsites for targeting
      const { data: micrositesData, error: micrositesError } = await supabase
        .from('microsites')
        .select('id, client_name, domain_slug, is_active')
        .eq('is_active', true);

      if (micrositesError) throw micrositesError;

      // Fetch analytics
      await fetchAnalytics();

      setCampaigns(campaignsData || []);
      setMicrosites(micrositesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches referral analytics and performance metrics
   */
  const fetchAnalytics = async () => {
    try {
      const { data: clicksData } = await supabase
        .from('referral_clicks')
        .select('*')
        .gte('clicked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const totalClicks = clicksData?.length || 0;
      const totalConversions = clicksData?.filter(click => click.converted).length || 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      setAnalytics({
        totalSent: 0, // Will be updated from WhatsApp API logs
        totalClicks,
        totalConversions,
        conversionRate,
        recentActivity: clicksData || []
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  /**
   * Creates a new referral campaign with unique tracking code
   */
  const createCampaign = async () => {
    if (!newCampaign.campaignName || !newCampaign.targetMicrositeId) {
      toast.error('Campaign name and target microsite are required');
      return;
    }

    setLoading(true);
    try {
      // Generate unique referral code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_referral_code');

      if (codeError) throw codeError;

      // Create campaign
      const campaignData = {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        code: codeData,
        referral_message: newCampaign.customMessage || messageTemplates.standard,
        whatsapp_template: newCampaign.customMessage || messageTemplates.standard,
        is_active: true,
        campaign_name: newCampaign.campaignName,
        target_microsite_id: newCampaign.targetMicrositeId,
        reward_description: newCampaign.rewardDescription
      };

      const { data: campaign, error: campaignError } = await supabase
        .from('referral_codes')
        .insert([campaignData])
        .select()
        .single();

      if (campaignError) throw campaignError;

      toast.success('Referral campaign created successfully!');
      setNewCampaign({
        campaignName: '',
        targetMicrositeId: '',
        customMessage: '',
        rewardDescription: ''
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generates trackable referral link for a campaign
   */
  const generateReferralLink = (campaign: ReferralCampaign): string => {
    const microsite = microsites.find(m => m.id === campaign.target_microsite_id);
    if (!microsite) {
      // Fallback to main domain with referral code
      const baseUrl = window.location.origin;
      return `${baseUrl}?ref=${campaign.code}&utm_source=whatsapp&utm_medium=referral`;
    }

    const baseUrl = window.location.origin;
    return `${baseUrl}/microsite/${microsite.domain_slug}?ref=${campaign.code}&utm_source=whatsapp&utm_medium=referral&utm_campaign=${encodeURIComponent(campaign.campaign_name || 'referral')}`;
  };

  /**
   * Sends WhatsApp referral message via respond.io API
   */
  const sendWhatsAppReferral = async (
    campaignId: string, 
    contacts: WhatsAppContact[], 
    customMessage?: string
  ) => {
    setSending(true);
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');

      const referralLink = generateReferralLink(campaign);
      
      // Call edge function for WhatsApp integration
      const { data, error } = await supabase.functions.invoke('whatsapp-referral-sender', {
        body: {
          action: 'send_bulk_referral',
          campaignId,
          contacts,
          referralLink,
          messageTemplate: customMessage || campaign.whatsapp_template,
          campaignName: campaign.campaign_name
        }
      });

      if (error) throw error;

      toast.success(`Referral messages sent to ${contacts.length} contacts`);
      
      // Refresh analytics
      await fetchAnalytics();
      
    } catch (error) {
      console.error('Error sending WhatsApp referrals:', error);
      toast.error('Failed to send referral messages');
    } finally {
      setSending(false);
    }
  };

  /**
   * Parses bulk contact input and validates format
   */
  const parseBulkContacts = (input: string): WhatsAppContact[] => {
    const lines = input.trim().split('\n');
    const contacts: WhatsAppContact[] = [];
    
    lines.forEach((line, index) => {
      const parts = line.trim().split(',');
      if (parts.length >= 1 && parts[0].trim()) {
        const phone = parts[0].trim().replace(/\D/g, ''); // Remove non-digits
        if (phone.length >= 10) {
          contacts.push({
            id: `contact_${index}_${Date.now()}`,
            phone: `+${phone}`,
            name: parts[1]?.trim() || `Contact ${index + 1}`,
            email: parts[2]?.trim() || undefined,
            status: 'pending'
          });
        }
      }
    });
    
    return contacts;
  };

  /**
   * Handles bulk contact import and sending
   */
  const handleBulkSend = async () => {
    if (!selectedCampaignId || !bulkContacts.trim()) {
      toast.error('Please select a campaign and add contacts');
      return;
    }

    const contactList = parseBulkContacts(bulkContacts);
    if (contactList.length === 0) {
      toast.error('No valid contacts found. Format: phone,name,email (one per line)');
      return;
    }

    await sendWhatsAppReferral(selectedCampaignId, contactList);
    setBulkContacts('');
  };

  /**
   * Copies referral link to clipboard
   */
  const copyReferralLink = (campaign: ReferralCampaign) => {
    const link = generateReferralLink(campaign);
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  /**
   * Sample function call to send referral for user123
   */
  const sendSampleReferral = async () => {
    const sampleContacts: WhatsAppContact[] = [
      {
        id: 'sample_contact_1',
        phone: '+447123456789',
        name: 'John Smith',
        email: 'john.smith@example.com',
        status: 'pending'
      }
    ];

    if (campaigns.length > 0) {
      await sendWhatsAppReferral(campaigns[0].id, sampleContacts);
      toast.success('Sample referral sent for user123!');
    } else {
      toast.error('Please create a campaign first');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Referral System</h2>
          <p className="text-muted-foreground">
            Create and manage WhatsApp referral campaigns with respond.io integration
          </p>
        </div>
        <Button onClick={sendSampleReferral} variant="outline">
          <MessageCircle className="h-4 w-4 mr-2" />
          Send Sample (User123)
        </Button>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="send">Send Referrals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Create Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>
                Set up a new WhatsApp referral campaign with trackable links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    value={newCampaign.campaignName}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, campaignName: e.target.value }))}
                    placeholder="Spring Promotion 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="targetMicrosite">Target Microsite</Label>
                  <Select
                    value={newCampaign.targetMicrositeId}
                    onValueChange={(value) => setNewCampaign(prev => ({ ...prev, targetMicrositeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select microsite" />
                    </SelectTrigger>
                    <SelectContent>
                      {microsites.map((microsite) => (
                        <SelectItem key={microsite.id} value={microsite.id}>
                          {microsite.client_name} (/{microsite.domain_slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="rewardDescription">Reward Description</Label>
                <Input
                  id="rewardDescription"
                  value={newCampaign.rewardDescription}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, rewardDescription: e.target.value }))}
                  placeholder="10% discount for both referrer and referee"
                />
              </div>

              <div>
                <Label htmlFor="customMessage">Custom Message Template</Label>
                <Textarea
                  id="customMessage"
                  value={newCampaign.customMessage}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, customMessage: e.target.value }))}
                  placeholder="Use {name} for contact name and {link} for referral link"
                  rows={3}
                />
              </div>

              <Button onClick={createCampaign} disabled={loading}>
                Create Campaign
              </Button>
            </CardContent>
          </Card>

          {/* Existing Campaigns */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Campaigns</h3>
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No campaigns created yet. Create your first campaign above!
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-base">{campaign.campaign_name || 'Unnamed Campaign'}</CardTitle>
                        <CardDescription>
                          Code: {campaign.code} • 
                          Clicks: {campaign.total_clicks} • 
                          Conversions: {campaign.total_conversions}
                        </CardDescription>
                      </div>
                      <Badge variant={campaign.is_active ? "default" : "secondary"}>
                        {campaign.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Referral Link</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          value={generateReferralLink(campaign)}
                          readOnly
                          className="text-sm font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyReferralLink(campaign)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send WhatsApp Referrals</CardTitle>
              <CardDescription>
                Send referral messages to multiple contacts via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignSelect">Select Campaign</Label>
                <Select
                  value={selectedCampaignId}
                  onValueChange={setSelectedCampaignId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.filter(c => c.is_active).map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.campaign_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bulkContacts">
                  Contacts (Format: phone,name,email - one per line)
                </Label>
                <Textarea
                  id="bulkContacts"
                  value={bulkContacts}
                  onChange={(e) => setBulkContacts(e.target.value)}
                  placeholder="447123456789,John Smith,john@example.com&#10;447987654321,Jane Doe,jane@example.com"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: 447123456789,John Smith,john@example.com
                </p>
              </div>

              <Button 
                onClick={handleBulkSend} 
                disabled={sending}
                className="w-full"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Messages...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Referral Messages
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{analytics.totalSent}</div>
                  <p className="text-xs text-muted-foreground">Messages Sent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{analytics.totalClicks}</div>
                  <p className="text-xs text-muted-foreground">Link Clicks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{analytics.totalConversions}</div>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(messageTemplates).map(([key, template]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="capitalize">{key} Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={template}
                    readOnly
                    rows={4}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(template);
                      toast.success('Template copied to clipboard!');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppReferralSystem;
