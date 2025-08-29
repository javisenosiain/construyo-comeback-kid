import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Share2, MessageCircle, Eye, Users, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReferralCode {
  id: string;
  code: string;
  referral_message: string;
  whatsapp_template: string;
  total_clicks: number;
  total_conversions: number;
  is_active: boolean;
  created_at: string;
}

export default function ReferralSystem() {
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newReferral, setNewReferral] = useState({
    message: "Hi! I've found an amazing builder who just completed fantastic work for me. They're offering free quotes right now. Check them out: [LINK]",
    whatsappTemplate: "🏠 Hey! Just had amazing work done by this builder. They're giving free quotes right now - thought you might be interested! [LINK]"
  });

  useEffect(() => {
    fetchReferralCodes();
  }, []);

  const fetchReferralCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferralCodes(data || []);
    } catch (error) {
      console.error('Error fetching referral codes:', error);
      toast.error('Failed to load referral codes');
    } finally {
      setLoading(false);
    }
  };

  const createReferralCode = async () => {
    setCreating(true);
    try {
      // First generate the code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_referral_code');

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('referral_codes')
        .insert([{
          code: codeData,
          referral_message: newReferral.message,
          whatsapp_template: newReferral.whatsappTemplate
        }])
        .select()
        .single();

      if (error) throw error;

      setReferralCodes([data, ...referralCodes]);
      toast.success('Referral code created successfully!');
      
      // Reset form
      setNewReferral({
        message: "Hi! I've found an amazing builder who just completed fantastic work for me. They're offering free quotes right now. Check them out: [LINK]",
        whatsappTemplate: "🏠 Hey! Just had amazing work done by this builder. They're giving free quotes right now - thought you might be interested! [LINK]"
      });
    } catch (error) {
      console.error('Error creating referral code:', error);
      toast.error('Failed to create referral code');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const generateReferralLink = (code: string) => {
    return `${window.location.origin}/ref/${code}`;
  };

  const generateWhatsAppLink = (message: string, referralLink: string) => {
    const finalMessage = message.replace('[LINK]', referralLink);
    return `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('referral_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setReferralCodes(codes => 
        codes.map(code => 
          code.id === id ? { ...code, is_active: !currentStatus } : code
        )
      );

      toast.success(`Referral code ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating referral code:', error);
      toast.error('Failed to update referral code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Referral System</h2>
          <p className="text-muted-foreground">
            Create trackable referral links to grow your business through word-of-mouth
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {referralCodes.reduce((sum, code) => sum + code.total_clicks, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {referralCodes.reduce((sum, code) => sum + code.total_conversions, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Conversions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">
                      {referralCodes.length > 0 
                        ? (referralCodes.reduce((sum, code) => sum + code.total_conversions, 0) / 
                           Math.max(referralCodes.reduce((sum, code) => sum + code.total_clicks, 0), 1) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Existing Referral Codes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Referral Codes</h3>
            {referralCodes.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No referral codes created yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first referral code to start tracking referrals!
                  </p>
                </CardContent>
              </Card>
            ) : (
              referralCodes.map((code) => (
                <Card key={code.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">Code: {code.code}</CardTitle>
                        <Badge variant={code.is_active ? "default" : "secondary"}>
                          {code.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(code.id, code.is_active)}
                        >
                          {code.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Created {new Date(code.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Clicks</p>
                        <p className="font-semibold">{code.total_clicks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="font-semibold">{code.total_conversions}</p>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Referral Link</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            value={generateReferralLink(code.code)}
                            readOnly
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generateReferralLink(code.code), "Link")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">WhatsApp Share</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const whatsappLink = generateWhatsAppLink(
                                code.whatsapp_template,
                                generateReferralLink(code.code)
                              );
                              window.open(whatsappLink, '_blank');
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Share via WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const whatsappLink = generateWhatsAppLink(
                                code.whatsapp_template,
                                generateReferralLink(code.code)
                              );
                              copyToClipboard(whatsappLink, "WhatsApp link");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Referral Code</CardTitle>
              <CardDescription>
                Set up a new trackable referral code with custom messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message">Referral Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your referral message..."
                  value={newReferral.message}
                  onChange={(e) => setNewReferral({ ...newReferral, message: e.target.value })}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use [LINK] as a placeholder for the referral link
                </p>
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp Template</Label>
                <Textarea
                  id="whatsapp"
                  placeholder="Enter your WhatsApp message template..."
                  value={newReferral.whatsappTemplate}
                  onChange={(e) => setNewReferral({ ...newReferral, whatsappTemplate: e.target.value })}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optimized for WhatsApp sharing. Use [LINK] as a placeholder.
                </p>
              </div>

              <Button onClick={createReferralCode} disabled={creating} className="w-full">
                {creating ? "Creating..." : "Create Referral Code"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Analytics</CardTitle>
              <CardDescription>
                Detailed performance metrics for your referral campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referralCodes.map((code) => (
                  <div key={code.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Code: {code.code}</h4>
                      <Badge variant={code.is_active ? "default" : "secondary"}>
                        {code.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Clicks</p>
                        <p className="text-2xl font-bold">{code.total_clicks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="text-2xl font-bold">{code.total_conversions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversion Rate</p>
                        <p className="text-2xl font-bold">
                          {code.total_clicks > 0 
                            ? ((code.total_conversions / code.total_clicks) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
