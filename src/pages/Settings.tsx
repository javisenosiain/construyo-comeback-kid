import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Zap,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const Settings = () => {
  const integrations = [
    {
      name: "Stripe",
      description: "Payment processing and invoicing",
      status: "connected",
      icon: CreditCard,
      lastSync: "2024-01-17T10:30:00Z"
    },
    {
      name: "Zapier",
      description: "Workflow automation and CRM integration",
      status: "connected", 
      icon: Zap,
      lastSync: "2024-01-17T09:15:00Z"
    },
    {
      name: "WhatsApp Business",
      description: "Referral system and customer communication",
      status: "setup_required",
      icon: Phone,
      lastSync: null
    },
    {
      name: "Instagram Business",
      description: "Automated social media posting",
      status: "connected",
      icon: Globe,
      lastSync: "2024-01-17T08:45:00Z"
    },
    {
      name: "Google My Business",
      description: "Review management and local SEO",
      status: "setup_required",
      icon: Globe,
      lastSync: null
    },
    {
      name: "Xero",
      description: "Accounting and financial management",
      status: "setup_required",
      icon: Building2,
      lastSync: null
    }
  ];

  const notificationSettings = [
    { label: "New lead notifications", enabled: true },
    { label: "Payment received alerts", enabled: true },
    { label: "Review request reminders", enabled: false },
    { label: "Weekly business reports", enabled: true },
    { label: "Integration sync failures", enabled: true },
    { label: "Social media post confirmations", enabled: false }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-success text-success-foreground";
      case "setup_required": return "bg-secondary text-secondary-foreground";
      case "error": return "bg-destructive text-destructive-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return CheckCircle;
      case "setup_required": return AlertCircle;
      case "error": return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account, integrations, and automation preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue="Javier" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Senosiain" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="jsenosi1@hotmail.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+44 7123 456789" />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="City, Country" defaultValue="London, UK" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Settings */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Configure your business details and service offerings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" placeholder="Your Construction Company" />
                </div>
                <div>
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input id="businessType" placeholder="e.g., General Contractor, Electrician, Plumber" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input id="licenseNumber" placeholder="Professional license number" />
                  </div>
                  <div>
                    <Label htmlFor="insuranceNumber">Insurance Policy</Label>
                    <Input id="insuranceNumber" placeholder="Insurance policy number" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="serviceAreas">Service Areas</Label>
                  <Input id="serviceAreas" placeholder="London, Birmingham, Manchester..." />
                </div>
                <div>
                  <Label htmlFor="specialties">Specialties</Label>
                  <Input id="specialties" placeholder="Kitchen extensions, bathroom renovations..." />
                </div>
                <Button>Update Business Info</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Integrations & Automations
                </CardTitle>
                <CardDescription>
                  Connect your favorite tools and automate your workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {integrations.map((integration, index) => {
                    const StatusIcon = getStatusIcon(integration.status);
                    const IntegrationIcon = integration.icon;
                    
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                              <IntegrationIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{integration.name}</h4>
                              <p className="text-sm text-muted-foreground">{integration.description}</p>
                              {integration.lastSync && (
                                <p className="text-xs text-muted-foreground">
                                  Last sync: {new Date(integration.lastSync).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(integration.status)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {integration.status === "connected" ? "Connected" : "Setup Required"}
                            </Badge>
                            <Button 
                              variant={integration.status === "connected" ? "outline" : "default"} 
                              size="sm"
                            >
                              {integration.status === "connected" ? "Configure" : "Connect"}
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose which notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notificationSettings.map((setting, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{setting.label}</p>
                    </div>
                    <Switch defaultChecked={setting.enabled} />
                  </div>
                ))}
                <div className="pt-4">
                  <h4 className="font-semibold mb-3">Notification Methods</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>Email Notifications</span>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>SMS Notifications</span>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">SMS Authentication</p>
                      <p className="text-sm text-muted-foreground">Receive codes via text message</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                  <CardDescription>
                    Control your data and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline">Download My Data</Button>
                  <Button variant="destructive">Delete Account</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;