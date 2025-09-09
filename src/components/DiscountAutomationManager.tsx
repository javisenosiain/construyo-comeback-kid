import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Zap, DollarSign, Mail, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DiscountApplication {
  id: string;
  invoice_id: string;
  discount_rule_id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  applied_at: string;
  notification_status: string;
  notification_channel?: string;
  discount_rules: {
    rule_name: string;
    rule_type: string;
    discount_value: number;
    discount_type: string;
  };
  construyo_invoices: {
    customer_name: string;
    customer_email: string;
    invoice_number: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  status: string;
  lead_id?: string;
}

const DiscountAutomationManager: React.FC = () => {
  const [applications, setApplications] = useState<DiscountApplication[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Form state for manual discount application
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notificationChannel, setNotificationChannel] = useState<'email' | 'whatsapp' | 'both'>('email');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch discount applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('discount_applications')
        .select(`
          id,
          invoice_id,
          discount_rule_id,
          original_amount,
          discount_amount,
          final_amount,
          applied_at,
          notification_status,
          notification_channel,
          discount_rules!inner(rule_name, rule_type, discount_value, discount_type),
          construyo_invoices!inner(customer_name, customer_email, invoice_number)
        `)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch eligible invoices (not yet discounted)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('construyo_invoices')
        .select('id, invoice_number, customer_name, customer_email, amount, status, lead_id')
        .eq('status', 'draft')
        .not('id', 'in', `(${applicationsData?.map(app => `'${app.invoice_id}'`).join(',') || "''"})`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (invoicesError) throw invoicesError;

      setApplications((applicationsData as any) || []);
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch discount data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = async () => {
    if (!selectedInvoice || !clientName) {
      toast({
        title: 'Error',
        description: 'Please select an invoice and provide client information',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const invoice = invoices.find(inv => inv.id === selectedInvoice);
      if (!invoice) throw new Error('Invoice not found');

      const { data, error } = await supabase.functions.invoke('discount-automation', {
        body: {
          invoiceId: selectedInvoice,
          leadId: invoice.lead_id,
          clientInfo: {
            name: clientName,
            email: clientEmail || invoice.customer_email,
            phone: clientPhone,
          },
          notificationChannel,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Success',
          description: `Discount applied successfully! Saved $${data.data.savings.toFixed(2)}`,
        });

        // Reset form
        setSelectedInvoice('');
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        
        // Refresh data
        await fetchData();
      } else {
        toast({
          title: 'Info',
          description: data.message || 'No eligible discount found for this invoice',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply discount: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'whatsapp':
        return <MessageCircle className="h-3 w-3" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="h-3 w-3" />
            <MessageCircle className="h-3 w-3" />
          </div>
        );
      default:
        return null;
    }
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setClientName(invoice.customer_name || '');
      setClientEmail(invoice.customer_email || '');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading discount automation data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Discount Automation</h2>
        <p className="text-muted-foreground">
          Apply automated discounts to invoices and track client notifications
        </p>
      </div>

      {/* Manual Discount Application */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Apply Discount to Invoice
          </CardTitle>
          <CardDescription>
            Select an invoice to automatically check for eligible discounts and apply them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-select">Select Invoice</Label>
              <Select value={selectedInvoice} onValueChange={handleInvoiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.customer_name} - ${invoice.amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification-channel">Notification Channel</Label>
              <Select 
                value={notificationChannel} 
                onValueChange={(value: 'email' | 'whatsapp' | 'both') => setNotificationChannel(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                  <SelectItem value="both">Email & WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">Client Email</Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Enter client email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-phone">Client Phone (for WhatsApp)</Label>
              <Input
                id="client-phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <Button 
            onClick={applyDiscount} 
            disabled={processing || !selectedInvoice || !clientName}
            className="w-full md:w-auto"
          >
            {processing ? 'Processing...' : 'Apply Discount'}
          </Button>
        </CardContent>
      </Card>

      {/* Sample API Call Example */}
      <Card>
        <CardHeader>
          <CardTitle>Sample API Call</CardTitle>
          <CardDescription>
            Example call to apply a 10% referral discount to invoice "inv123"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm overflow-x-auto">
{`POST /functions/v1/discount-automation
{
  "invoiceId": "inv123",
  "leadId": "lead789",
  "clientInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "notificationChannel": "both"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Discount Applications History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Discount Applications</h3>
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {application.construyo_invoices.invoice_number}
                      </h4>
                      <Badge variant="secondary">
                        {application.discount_rules.rule_name}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {application.construyo_invoices.customer_name} • 
                      {application.construyo_invoices.customer_email}
                    </p>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="line-through">${application.original_amount}</span>
                        <span className="font-medium text-green-600">
                          ${application.final_amount}
                        </span>
                      </div>
                      
                      <div className="text-green-600 font-medium">
                        Saved ${application.discount_amount}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Applied on {new Date(application.applied_at).toLocaleDateString()}</span>
                      {application.notification_channel && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {getChannelIcon(application.notification_channel)}
                            <span className="capitalize">{application.notification_channel}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(application.notification_status)}
                    <span className="text-xs capitalize">
                      {application.notification_status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {applications.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  No discount applications yet. Apply discounts to invoices to see them here.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountAutomationManager;