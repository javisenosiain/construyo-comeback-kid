import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreditCard, DollarSign, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";

const Payments = () => {
  const payments = [
    {
      id: "PAY-001",
      invoice: "INV-001",
      customer: "Sarah Johnson",
      amount: "£18,500",
      method: "Bank Transfer",
      status: "completed",
      date: "2024-01-16",
      processingFee: "£185"
    },
    {
      id: "PAY-002", 
      invoice: "INV-002",
      customer: "Michael Chen",
      amount: "£9,750",
      method: "Stripe",
      status: "completed",
      date: "2024-01-12",
      processingFee: "£292"
    },
    {
      id: "PAY-003",
      invoice: "INV-004",
      customer: "David Thompson",
      amount: "£6,200",
      method: "Stripe",
      status: "processing",
      date: "2024-01-17",
      processingFee: "£186"
    },
    {
      id: "PAY-004",
      invoice: "INV-005",
      customer: "Lisa Parker",
      amount: "£12,800",
      method: "PayPal",
      status: "failed",
      date: "2024-01-17",
      processingFee: "£0"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success text-success-foreground";
      case "processing": return "bg-accent text-accent-foreground";
      case "failed": return "bg-destructive text-destructive-foreground";
      case "pending": return "bg-secondary text-secondary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle;
      case "processing": return Clock;
      case "failed": return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payments</h1>
            <p className="text-muted-foreground">Secure payment processing and tracking with multiple payment methods</p>
          </div>
          <Button>
            <CreditCard className="w-4 h-4 mr-2" />
            Setup Payment Method
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">£47,250</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">£663</div>
              <p className="text-xs text-muted-foreground">2.8% average rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground">+2.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4h</div>
              <p className="text-xs text-muted-foreground">For card payments</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Methods Performance */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Performance by payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Stripe (Cards)</span>
                    <span className="text-sm font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">3.2% processing fee</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Bank Transfer</span>
                    <span className="text-sm font-medium">22%</span>
                  </div>
                  <Progress value={22} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">1% processing fee</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">PayPal</span>
                    <span className="text-sm font-medium">10%</span>
                  </div>
                  <Progress value={10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">3.8% processing fee</p>
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Stripe</span>
                  <Badge className="bg-success text-success-foreground">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">PayPal</span>
                  <Badge className="bg-success text-success-foreground">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Xero</span>
                  <Badge variant="outline">Setup Required</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">QuickBooks</span>
                  <Badge variant="outline">Setup Required</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions and their status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {payments.map((payment) => {
                  const StatusIcon = getStatusIcon(payment.status);
                  return (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold">{payment.id}</h4>
                            <Badge className={getStatusColor(payment.status)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {payment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {payment.customer} • Invoice {payment.invoice}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{payment.amount}</div>
                          <div className="text-xs text-muted-foreground">
                            Fee: {payment.processingFee}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <CreditCard className="w-4 h-4 inline mr-1" />
                            {payment.method}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(payment.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {payment.status === "failed" && (
                            <Button variant="outline" size="sm">
                              Retry Payment
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;