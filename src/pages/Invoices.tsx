import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentProviderSettings from "@/components/PaymentProviderSettings";
import PricingRulesManager from "@/components/PricingRulesManager";
import { Plus, FileText, Send, Eye, Settings, Calculator, Zap, DollarSign, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  project_title: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  sent_date?: string;
  created_at: string;
}

interface Lead {
  id: string;
  customer_name: string;
  email: string;
  project_type: string;
  description?: string;
  status: string;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("stripe");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchLeads();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('construyo_invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', user?.id)
        .in('status', ['new', 'contacted', 'qualified'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const generateInvoice = async () => {
    if (!selectedLead) {
      toast.error('Please select a lead');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: {
          leadId: selectedLead,
          amount: customAmount ? parseFloat(customAmount) : undefined,
          paymentProvider: selectedProvider,
          syncToSheets: true,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Invoice generated successfully!');
        fetchInvoices();
        fetchLeads();
        setSelectedLead("");
        setCustomAmount("");
      } else {
        throw new Error(data.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success text-success-foreground";
      case "sent": return "bg-accent text-accent-foreground"; 
      case "draft": return "bg-secondary text-secondary-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getInvoiceStats = () => {
    const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const outstanding = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = invoices.filter(inv => {
      return inv.status === 'sent' && new Date(inv.due_date) < new Date();
    }).reduce((sum, inv) => sum + inv.amount, 0);

    return { total, paid, outstanding, overdue };
  };

  const stats = getInvoiceStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoicing & Payments</h1>
            <p className="text-muted-foreground">Automated invoice generation with payment provider integrations</p>
          </div>
        </div>

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Auto-Generate
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Pricing Rules
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Payment Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(stats.outstanding)}</div>
                  <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{formatCurrency(stats.paid)}</div>
                  <p className="text-xs text-muted-foreground">Successfully collected</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdue)}</div>
                  <p className="text-xs text-muted-foreground">Past due date</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
            </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">£28,250</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">£9,750</div>
              <p className="text-xs text-muted-foreground">+15% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Payment Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12 days</div>
              <p className="text-xs text-muted-foreground">-2 days improvement</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">Invoices paid on time</p>
            </CardContent>
          </Card>
        </div>

            {/* Invoices List */}
            <div className="grid gap-4">
              {invoices.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No invoices found.</p>
                    <p className="text-sm text-muted-foreground">Generate your first invoice from a lead in the Auto-Generate tab.</p>
                  </CardContent>
                </Card>
              ) : (
                invoices.map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-3">
                            <FileText className="w-5 h-5" />
                            {invoice.invoice_number}
                            <Badge className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {invoice.customer_name} • {invoice.project_title}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{formatCurrency(invoice.amount, invoice.currency)}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {invoice.sent_date && (
                            <span className="text-sm text-muted-foreground">
                              Sent: {new Date(invoice.sent_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            Created: {new Date(invoice.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          {invoice.status === "draft" ? (
                            <Button size="sm">
                              <Send className="w-4 h-4 mr-2" />
                              Send
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Send className="w-4 h-4 mr-2" />
                              Resend
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Auto-Generate Invoice from Lead
                </CardTitle>
                <CardDescription>
                  Generate invoices automatically from qualified leads using your pricing rules and payment provider integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Lead</label>
                      <Select value={selectedLead} onValueChange={setSelectedLead}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a lead to generate invoice" />
                        </SelectTrigger>
                        <SelectContent>
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.customer_name} - {lead.project_type.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {leads.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No eligible leads found. Leads must be in 'new', 'contacted', or 'qualified' status.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Amount (Optional)</label>
                      <Input
                        type="number"
                        placeholder="Leave empty to use pricing rules"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        If not specified, amount will be calculated using your pricing rules
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Payment Provider</label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stripe">💳 Stripe</SelectItem>
                          <SelectItem value="quickbooks">📊 QuickBooks</SelectItem>
                          <SelectItem value="xero">🏢 Xero</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={generateInvoice}
                      disabled={!selectedLead || generating}
                      className="w-full"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating Invoice...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate Invoice
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">What happens when you generate an invoice:</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 mt-0.5 text-primary" />
                        <span>Amount calculated using your pricing rules or custom amount</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-0.5 text-primary" />
                        <span>Invoice created in your selected payment provider</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 text-primary" />
                        <span>Due date automatically set to 30 days from creation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-primary" />
                        <span>Analytics and payment status tracking enabled</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 mt-0.5 text-primary" />
                        <span>Optional sync to Google Sheets via Zapier webhook</span>
                      </li>
                    </ul>

                    {selectedLead && (
                      <div className="p-4 rounded-lg bg-muted">
                        <h4 className="font-medium mb-2">Selected Lead Details:</h4>
                        {leads.find(l => l.id === selectedLead) && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Name:</strong> {leads.find(l => l.id === selectedLead)?.customer_name}</p>
                            <p><strong>Project:</strong> {leads.find(l => l.id === selectedLead)?.project_type.replace(/_/g, ' ')}</p>
                            <p><strong>Email:</strong> {leads.find(l => l.id === selectedLead)?.email}</p>
                            <p><strong>Status:</strong> {leads.find(l => l.id === selectedLead)?.status}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <PricingRulesManager />
          </TabsContent>

          <TabsContent value="settings">
            <PaymentProviderSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Invoices;