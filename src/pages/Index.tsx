import { Building2, Users, FileText, CreditCard, Star, Share2, Image, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import SocialMedia from "./SocialMedia";
import GalleryGenerator from "@/components/GalleryGenerator";

const Index = () => {
  const mvpFeatures = [
    {
      icon: Users,
      title: "Lead Capture",
      description: "Capture leads automatically with embedded forms and referral systems",
      color: "text-primary"
    },
    {
      icon: Building2,
      title: "Professional Communication",
      description: "Auto-responders and quote booking links for seamless customer engagement",
      color: "text-accent-foreground"
    },
    {
      icon: FileText,
      title: "Invoicing",
      description: "Generate and send professional invoices with payment tracking",
      color: "text-success"
    },
    {
      icon: CreditCard,
      title: "Payment Collection",
      description: "Secure payment processing with Stripe integration",
      color: "text-primary"
    },
    {
      icon: Star,
      title: "Review Management",
      description: "Request reviews and manage your online reputation",
      color: "text-accent-foreground"
    },
    {
      icon: Share2,
      title: "Social Media",
      description: "Automatically showcase completed projects on Instagram",
      color: "text-success"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Construyo
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              The complete automation platform for small construction and trade businesses. 
              From lead capture to payment collection - all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                <Link to="/auth">Login / Signup</Link>
              </Button>
              <Button size="lg" className="bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:border-orange-600">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* MVP Features Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Grow Your Business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our MVP focuses on the core features that drive results for construction businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mvpFeatures.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4 ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media & Portfolio Integration */}
      <section className="py-24 px-6 bg-secondary">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Showcase Your Work & Build Your Brand
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Automatically generate stunning portfolios and schedule social media posts to showcase your completed projects
            </p>
          </div>

          <Tabs defaultValue="social" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Social Media
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Portfolio
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="social" className="mt-8">
              <div className="bg-background rounded-lg">
                <SocialMedia />
              </div>
            </TabsContent>
            
            <TabsContent value="portfolio" className="mt-8">
              <div className="bg-background rounded-lg">
                <GalleryGenerator />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-secondary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Automate Your Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of construction professionals who trust Construyo to grow their business
          </p>
          <Button size="lg" className="bg-gradient-primary border-0" asChild>
            <Link to="/auth">Start Your Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-sidebar">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-sidebar-foreground mb-4">
              Construyo
            </h3>
            <p className="text-sidebar-foreground/80">
              Automating success for construction professionals
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;