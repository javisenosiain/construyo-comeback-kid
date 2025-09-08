import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Mail, MessageCircle, ExternalLink, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";

interface PaymentLinkManagerProps {
  invoice: {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_email?: string;
    project_title: string;
    amount: number;
    currency: string;
    status: string;
    due_date: string;
  };
  onStatusUpdate?: () => void;
}

export const PaymentLinkManager: React.FC<PaymentLinkManagerProps> = ({ 
  invoice, 
  onStatusUpdate 
}) => {
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp'>('email');
  const [recipientContact, setRecipientContact] = useState(invoice.customer_email || '');
  const [customMessage, setCustomMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string>('');
  const { toast } = useToast();

  const handleSharePaymentLink = async () => {
    if (!recipientContact.trim()) {
      toast({
        title: "Missing Contact",
        description: "Please enter a valid email or phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      const { data, error } = await supabase.functions.invoke('payment-link-generator', {
        body: {
          invoiceId: invoice.id,
          deliveryMethod,
          recipientContact: recipientContact.trim(),
          customMessage: customMessage.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setPaymentLink(data.paymentLink);
      
      toast({
        title: "Payment Link Shared",
        description: `Payment link generated and ${data.deliveryResult ? 'sent' : 'ready'} via ${deliveryMethod}`,
      });

      // Clear form
      setCustomMessage('');
      
    } catch (error) {
      console.error('Error sharing payment link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share payment link",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke('payment-status-tracker', {
        body: {
          invoiceId: invoice.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data.results[0];
      if (result) {
        toast({
          title: "Payment Status Updated",
          description: `Status: ${result.newStatus} (Payment: ${result.paymentStatus})`,
        });

        // Trigger parent component refresh
        onStatusUpdate?.();
      }
      
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check payment status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invoice #{invoice.invoice_number}</span>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(invoice.status)}>
                {getStatusIcon(invoice.status)}
                <span className="ml-1 capitalize">{invoice.status}</span>
              </Badge>
              <Button
                onClick={handleCheckPaymentStatus}
                disabled={isChecking}
                size="sm"
                variant="outline"
              >
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Check Status</span>
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {invoice.customer_name} • {invoice.currency} {invoice.amount} • Due: {invoice.due_date}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Project: {invoice.project_title}
          </p>
          
          {paymentLink && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Payment Link Generated:</p>
              <div className="flex items-center gap-2">
                <Input
                  value={paymentLink}
                  readOnly
                  className="text-sm"
                />
                <Button
                  onClick={() => window.open(paymentLink, '_blank')}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Payment Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Share Payment Link
          </CardTitle>
          <CardDescription>
            Generate and send a secure payment link to your customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delivery-method">Delivery Method</Label>
            <Select value={deliveryMethod} onValueChange={(value: 'email' | 'whatsapp') => setDeliveryMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">
              {deliveryMethod === 'email' ? 'Email Address' : 'Phone Number'}
            </Label>
            <Input
              id="recipient"
              placeholder={
                deliveryMethod === 'email' 
                  ? 'customer@example.com' 
                  : '+1234567890'
              }
              value={recipientContact}
              onChange={(e) => setRecipientContact(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your customer..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSharePaymentLink}
            disabled={isSharing || !recipientContact.trim()}
            className="w-full"
          >
            {isSharing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Generating & Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate & Send Payment Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};