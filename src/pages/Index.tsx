import { useState } from "react";
import { Building2, Users, FileText, CreditCard, Star, Share2, Image, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import LandingNavigation from "@/components/LandingNavigation";
import BetaSignup from "@/components/BetaSignup";
import SocialMedia from "./SocialMedia";
import GalleryGenerator from "@/components/GalleryGenerator";

const Index = () => {
  const [showBetaSignup, setShowBetaSignup] = useState(false);

  const mvpFeatures = [
    {
      icon: FileText,
      title: "Contract Analysis",
      description: "AI-powered contract review and risk assessment with automated compliance checking",
      color: "text-primary"
    },
    {
      icon: Building2,
      title: "Regulatory Tracking",
      description: "Real-time monitoring of regulatory changes affecting your business",
      color: "text-accent-foreground"
    },
    {
      icon: Users,
      title: "Document Generation",
      description: "Generate compliant documents and contracts using AI templates",
      color: "text-success"
    },
    {
      icon: Star,
      title: "Compliance Dashboard",
      description: "Centralized view of your compliance status and upcoming requirements",
      color: "text-primary"
    },
    {
      icon: CreditCard,
      title: "Audit Preparation",
      description: "Automated audit trails and compliance documentation management",
      color: "text-accent-foreground"
    },
    {
      icon: Share2,
      title: "Risk Monitoring",
      description: "Proactive risk assessment and compliance alerts for your business",
      color: "text-success"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Landing Navigation */}
      <LandingNavigation onBetaClick={() => setShowBetaSignup(true)} />

      {/* Beta Signup Modal */}
      <BetaSignup open={showBetaSignup} onOpenChange={setShowBetaSignup} />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-gradient-hero py-24 px-6 pt-32">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Construyo
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Your AI-powered ally for business compliance. Automate contract analysis, track regulatory changes, and generate compliant documents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => setShowBetaSignup(true)}
                className="bg-success hover:bg-success/90 text-success-foreground font-semibold group transition-all hover:scale-105"
              >
                <Check className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                Join Beta Waitlist
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm"
                asChild
              >
                <Link to="/auth">Login / Signup</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Show Interest in Beta Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-success/10 to-accent/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Business Compliance?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our exclusive Beta program and be among the first to experience AI-powered compliance automation. 
            Get early access, priority support, and help shape the future of business compliance.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowBetaSignup(true)}
            className="bg-success hover:bg-success/90 text-success-foreground font-semibold group transition-all hover:scale-105 shadow-lg"
          >
            <Check className="w-5 h-5 mr-2 group-hover:animate-pulse" />
            Join Beta Waitlist
          </Button>
        </div>
      </section>

      {/* MVP Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              AI-Powered Compliance Solutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your legal compliance with intelligent automation and real-time regulatory tracking
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

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-secondary">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose Construyo?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Built by compliance experts and powered by AI, Construyo transforms how businesses handle legal requirements
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Expert-Built Solutions</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-1" />
                  <div>
                    <h4 className="font-semibold">AI-Powered Intelligence</h4>
                    <p className="text-muted-foreground">Advanced machine learning algorithms analyze contracts and regulations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-1" />
                  <div>
                    <h4 className="font-semibold">Real-Time Updates</h4>
                    <p className="text-muted-foreground">Stay current with automatic regulatory change notifications</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success mt-1" />
                  <div>
                    <h4 className="font-semibold">Audit-Ready Documentation</h4>
                    <p className="text-muted-foreground">Maintain comprehensive compliance records automatically</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-background rounded-lg p-8 shadow-lg">
              <h4 className="text-lg font-semibold mb-4">Join the Beta Program</h4>
              <p className="text-muted-foreground mb-6">
                Get exclusive early access to Construyo's AI compliance platform and help shape the future of business compliance automation.
              </p>
              <Button 
                onClick={() => setShowBetaSignup(true)}
                className="w-full bg-success hover:bg-success/90 text-success-foreground"
              >
                <Check className="w-4 h-4 mr-2" />
                Join Beta Waitlist
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Simplify Your Compliance?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the Beta program and be among the first to experience AI-powered compliance automation
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowBetaSignup(true)}
            className="bg-success hover:bg-success/90 text-success-foreground font-semibold group transition-all hover:scale-105"
          >
            <Check className="w-5 h-5 mr-2 group-hover:animate-pulse" />
            Join Beta Waitlist
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
              AI-powered business compliance made simple
            </p>
            <div className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowBetaSignup(true)}
                className="border-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Check className="w-4 h-4 mr-2" />
                Join Beta
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;