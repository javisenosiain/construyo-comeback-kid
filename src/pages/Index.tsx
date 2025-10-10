import { Users, CreditCard, Star, Share2, Calendar, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import LandingNavigation from "@/components/LandingNavigation";

const Index = () => {

  const keyFeatures = [
    {
      icon: Users,
      title: "Lead Capture & Conversion",
      description: "Real-time forms, WhatsApp integration, and CRM pipelines to turn inquiries into jobs.",
      color: "text-primary"
    },
    {
      icon: Wallet,
      title: "Payments & Projects",
      description: "Automate invoice reminders, secure payment links, and project tracking for steady cash flow.",
      color: "text-accent-foreground"
    },
    {
      icon: Star,
      title: "Marketing Magic",
      description: "AI-automated portfolio building, review showcases, social media posts, and microsites to track leads.",
      color: "text-success"
    },
    {
      icon: Calendar,
      title: "Scheduling Simplified",
      description: "Built-in booking for consultations—no more back-and-forth.",
      color: "text-primary"
    }
  ];

  const allFeatures = [
    {
      icon: Users,
      title: "Lead Capture",
      description: "Capture leads from forms, WhatsApp, and websites in real-time. Never miss an opportunity with instant notifications and automated follow-ups."
    },
    {
      icon: Share2,
      title: "CRM & Pipeline",
      description: "Track customers, projects, and conversions with powerful CRM tools built for construction. Manage your entire sales pipeline from inquiry to completion."
    },
    {
      icon: CreditCard,
      title: "Payment Automation",
      description: "Automate invoices, reminders, and secure payment links. Keep cash flow steady with automated payment tracking and follow-up reminders."
    },
    {
      icon: Star,
      title: "Portfolio & Reviews",
      description: "Showcase stunning before/after galleries and build trust with authentic reviews. Let your work speak for itself with beautiful visual presentations."
    },
    {
      icon: Star,
      title: "AI Portfolio Creation",
      description: "Upload photos and let AI generate galleries and social content automatically. Save hours on marketing with intelligent content generation."
    },
    {
      icon: Share2,
      title: "Smart Marketing",
      description: "Automate social media posts with AI-generated content. Market your services with clear reviews and portfolio showcases that convert."
    },
    {
      icon: Share2,
      title: "Microsites",
      description: "Host microsites to display your portfolio, reviews, and track conversions. Give each project its own professional web presence."
    },
    {
      icon: Calendar,
      title: "Easy Scheduling",
      description: "Book consultations and jobs seamlessly with integrated calendar tools. No more back-and-forth emails—clients book directly."
    }
  ];

  const benefits = [
    {
      title: "Exclusive Discounts",
      description: "50% off first year + free setup (limited to first 500 users)",
      icon: CreditCard
    },
    {
      title: "Shape the Product",
      description: "Direct input on features—your idea for AI portfolio automation could make it in!",
      icon: Star
    },
    {
      title: "Priority Access",
      description: "Beta users get first dibs on launches, plus insider tips for your business",
      icon: Users
    },
    {
      title: "Risk-Free",
      description: "Cancel anytime; we handle the tech so you build better",
      icon: Share2
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Landing Navigation */}
      <LandingNavigation />

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-gradient-hero py-24 px-6 pt-32">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              <span className="text-primary">Revolutionize</span> Your Construction Business
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-4xl mx-auto">
              The all-in-one platform for construction pros: Capture leads, manage CRM & projects, automate payments/reminders, showcase portfolios with AI-powered creation, market via reviews/social posts, host microsites for conversions—and focus on building, not tech.
            </p>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {keyFeatures.map((feature, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-white/80 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth">Login to Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <a href="#features">See All Features</a>
            </Button>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for builders, by builders. Construyo streamlines your entire workflow from lead to payment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allFeatures.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Construyo Section */}
      <section id="about" className="py-24 px-6 bg-secondary">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose Construyo?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Built specifically for construction professionals who want to focus on building, not managing technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {benefit.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Construction Business?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start streamlining your construction business management today
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/auth">Login to Get Started</Link>
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
              The all-in-one platform for construction professionals
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;