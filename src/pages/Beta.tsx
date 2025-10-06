import { useState } from "react";
import { Check, Zap, DollarSign, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Beta = () => {
  const [email, setEmail] = useState("");
  const [problems, setProblems] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !problems.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and describe your biggest admin pain",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('beta_subscribers')
        .insert({
          email,
          name: problems, // Store problems in name field for now
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Signed Up",
            description: "This email is already on the Beta waitlist!",
          });
        } else {
          throw error;
        }
      } else {
        setSuccess(true);
        toast({
          title: "Welcome to the Beta!",
          description: "We'll be in touch soon with early access details.",
        });
        setEmail("");
        setProblems("");
      }
    } catch (error) {
      console.error('Beta signup error:', error);
      toast({
        title: "Signup Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Zap,
      title: "Lead Goldmine",
      description: "Auto-scrape planning sites + WhatsApp referrals = 3x qualified leads. No cold calls.",
      emoji: "🔥"
    },
    {
      icon: DollarSign,
      title: "Payments on Autopilot",
      description: "Stripe/Xero invoices + one-click links. Get paid faster, chase less.",
      emoji: "💰"
    },
    {
      icon: Calendar,
      title: "Engage & Close",
      description: "Calendly quotes + Zapier CRM sync (HubSpot or Sheets). 40% faster deals.",
      emoji: "📱"
    },
    {
      icon: Star,
      title: "Reviews + Social Magic",
      description: "Auto-push 5-stars to Google. AI before/after videos → Insta posts via Buffer. Free marketing fuel.",
      emoji: "⭐"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="py-24 px-6 pt-32">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Construyo
            </h1>
            <p className="text-2xl md:text-3xl text-white font-semibold mb-4">
              The Best tool for Trade Pros
            </p>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Reclaim your weekends. Automate leads, invoices, reviews & Insta posts. 
              Turn one job into a referral empire—set up in 1 hour.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Why You'll Wish You Signed Up Sooner
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{feature.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-white/80">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center text-white mb-12">
            <p className="text-lg mb-2">
              Built for builders, surveyors & contractors: Supabase secure, GDPR-ready, multi-role access.
            </p>
          </div>
        </div>
      </section>

      {/* MVP Status Section */}
      <section className="py-16 px-6 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
            MVP Locked & Loaded <span className="text-white/60">(Oct 6, 2025)</span>
          </h2>
          
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-3 text-white">
              <Check className="w-6 h-6 text-success" />
              <span className="text-lg">Lead scraping + WhatsApp referrals: <span className="font-semibold">Live ✅</span></span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Check className="w-6 h-6 text-success" />
              <span className="text-lg">Stripe invoicing + Zapier automations: <span className="font-semibold">Firing</span></span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Check className="w-6 h-6 text-success" />
              <span className="text-lg">Review engine + AI videos: <span className="font-semibold">Testing hot</span></span>
            </div>
            <div className="flex items-center gap-3 text-white">
              <Check className="w-6 h-6 text-success" />
              <span className="text-lg">Microsites & CRM sync: <span className="font-semibold">Dashboard-ready</span></span>
            </div>
          </div>

          <p className="text-xl text-white text-center mb-8">
            <span className="font-semibold">Beta Q1 2026.</span> Next: AI quoting.
          </p>
        </div>
      </section>

      {/* Signup Form Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-xl">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-8">
              {success ? (
                <div className="text-center">
                  <Check className="w-16 h-16 text-success mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">You're On the List! 🎉</h3>
                  <p className="text-white/80">
                    We'll send Beta access details to your inbox soon. Get ready to reclaim your weekends!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Your email—get Beta early
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="problems" className="block text-sm font-medium text-white mb-2">
                      Biggest admin pain? (We'll fix it)
                    </label>
                    <Textarea
                      id="problems"
                      placeholder="e.g., Chasing payments takes 10 hours/week, getting reviews is like pulling teeth, etc."
                      value={problems}
                      onChange={(e) => setProblems(e.target.value)}
                      required
                      rows={4}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold text-lg"
                  >
                    {loading ? "Joining..." : "Join 500+ Pros—Grab Beta Spot"}
                  </Button>

                  <p className="text-xs text-white/60 text-center">
                    By signing up, you agree to receive Beta updates. Unsubscribe anytime.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Beta;
