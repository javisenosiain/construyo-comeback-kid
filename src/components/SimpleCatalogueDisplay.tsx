import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Eye, Globe, Calendar, Clock, Tag, DollarSign } from "lucide-react";

// Sample catalogue data for demonstration
const SAMPLE_CATALOGUE = [
  {
    id: '1',
    name: 'Kitchen Renovation',
    description: 'Complete kitchen makeover with modern appliances and custom cabinetry.',
    short_description: 'Transform your kitchen with our complete renovation service',
    price: 15000,
    price_display: '£15,000 - £25,000',
    pricing_type: 'quote' as const,
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
    tags: ['Kitchen', 'Renovation', 'Modern'],
    features: ['Custom Cabinetry', 'Modern Appliances', 'Stone Countertops'],
    duration_estimate: '4-6 weeks',
    category: 'Interior',
    is_featured: true
  },
  {
    id: '2',
    name: 'Bathroom Remodel',
    description: 'Luxury bathroom renovation with premium fixtures and finishes.',
    short_description: 'Create a spa-like bathroom experience',
    price: 8000,
    price_display: '£8,000 - £15,000',
    pricing_type: 'quote' as const,
    image_url: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600&h=400&fit=crop',
    tags: ['Bathroom', 'Luxury', 'Spa'],
    features: ['Premium Fixtures', 'Heated Floors', 'Walk-in Shower'],
    duration_estimate: '3-4 weeks',
    category: 'Interior',
    is_featured: false
  },
  {
    id: '3',
    name: 'Home Extension',
    description: 'Add space and value to your home with our extension services.',
    short_description: 'Expand your living space with our expert extension service',
    price: 35000,
    price_display: '£35,000+',
    pricing_type: 'quote' as const,
    image_url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=400&fit=crop',
    tags: ['Extension', 'Space', 'Value'],
    features: ['Planning Permission Assistance', 'Structural Work', 'Full Project Management'],
    duration_estimate: '8-12 weeks',
    category: 'Construction',
    is_featured: true
  }
];

interface MicrositeData {
  id: string;
  client_name: string;
  domain_slug: string;
  safe_microsite_data: any;
  is_active: boolean;
  created_at: string;
}

interface SimpleCatalogueDisplayProps {
  userId?: string;
  micrositeId?: string;
  micrositeSlug?: string;
  calendlyUrl?: string;
  showQuoteForm?: boolean;
  className?: string;
  maxItems?: number;
  featuredOnly?: boolean;
}

export const SimpleCatalogueDisplay: React.FC<SimpleCatalogueDisplayProps> = ({
  userId,
  micrositeId,
  micrositeSlug,
  calendlyUrl,
  showQuoteForm = true,
  className = "",
  maxItems,
  featuredOnly = false
}) => {
  const [microsite, setMicrosite] = useState<MicrositeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quoteFormData, setQuoteFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    project_description: '',
    estimated_budget: '',
    preferred_timeline: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (micrositeSlug) {
      fetchSecureMicrositeData();
    }
  }, [micrositeSlug]);

  /**
   * SECURITY UPDATE: Use secure edge function instead of direct table access
   * This prevents exposure of sensitive customer data
   */
  const fetchSecureMicrositeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔒 Fetching secure microsite data for slug: ${micrositeSlug}`);
      
      // Use the secure edge function that filters sensitive data
      const { data, error } = await supabase.functions.invoke('microsite-safe-access', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: micrositeSlug })
      });

      if (error) {
        console.error('Error fetching secure microsite data:', error);
        setError('Failed to load microsite data');
        return;
      }

      if (!data?.success || !data?.data) {
        setError('Microsite not found or inactive');
        return;
      }

      setMicrosite(data.data);
      console.log('✅ Secure microsite data loaded successfully');
      
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter and limit items based on props
  let items = SAMPLE_CATALOGUE;
  if (featuredOnly) {
    items = items.filter(item => item.is_featured);
  }
  if (maxItems) {
    items = items.slice(0, maxItems);
  }

  const handleQuoteRequest = (item: any) => {
    if (!showQuoteForm) return;
    
    setSelectedItem(item);
    setQuoteFormData(prev => ({
      ...prev,
      project_description: `Interested in: ${item.name} - ${item.short_description}`
    }));
  };

  const submitQuoteRequest = async () => {
    if (!selectedItem || !quoteFormData.customer_name || !quoteFormData.customer_email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate quote request submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Success!",
        description: "Your quote request has been submitted. We'll be in touch soon!",
      });

      // Reset form and close dialog
      setQuoteFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        project_description: '',
        estimated_budget: '',
        preferred_timeline: ''
      });
      setSelectedItem(null);

      // Open Calendly if URL provided
      const finalCalendlyUrl = calendlyUrl || microsite?.safe_microsite_data?.calendlyUrl;
      if (finalCalendlyUrl) {
        window.open(finalCalendlyUrl, '_blank');
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast({
        title: "Error",
        description: "Failed to submit quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show microsite info if loading or if we have microsite data
  if (micrositeSlug) {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="m-4">
          <CardContent className="p-6">
            <div className="text-center">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Microsite</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (microsite) {
      const micrositeData = microsite.safe_microsite_data || {};
      
      return (
        <div className="container mx-auto p-4 max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {micrositeData.clientName || microsite.client_name}
                  </CardTitle>
                  <CardDescription>
                    {micrositeData.description || 'Professional construction services'}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  Active & Secure
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Services */}
              {micrositeData.services && micrositeData.services.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Our Services</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {micrositeData.services.map((service: string, index: number) => (
                      <Badge key={index} variant="outline" className="justify-start p-2">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Portfolio Settings */}
              {micrositeData.portfolioSettings && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Portfolio</h3>
                  <div className="space-y-2">
                    {micrositeData.portfolioSettings.showReviews && (
                      <p className="text-sm text-muted-foreground">
                        ✓ Customer reviews displayed
                      </p>
                    )}
                    {micrositeData.portfolioSettings.maxItems && (
                      <p className="text-sm text-muted-foreground">
                        Showcasing up to {micrositeData.portfolioSettings.maxItems} projects
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => window.open(`/microsite/${microsite.domain_slug}`, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Live Site
                </Button>
                
                {(calendlyUrl || micrositeData.calendlyUrl) && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(calendlyUrl || micrositeData.calendlyUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Book Consultation
                  </Button>
                )}
              </div>

              {/* Meta Information */}
              <div className="pt-4 border-t text-sm text-muted-foreground">
                <p>Created: {new Date(microsite.created_at).toLocaleDateString()}</p>
                <p>Domain: {microsite.domain_slug}</p>
                <p className="text-green-600">🔒 Secure: Sensitive data protected</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Default catalogue display
  const featuredItems = items.filter(item => item.is_featured);
  const finalCalendlyUrl = calendlyUrl || microsite?.safe_microsite_data?.calendlyUrl;

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Featured Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.map(item => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="p-0">
                  {item.image_url && (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant="secondary" className="ml-2">Featured</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{item.short_description}</p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="font-semibold">
                        {item.pricing_type === 'quote' ? 'Request Quote' : item.price_display || `£${item.price}`}
                      </span>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleQuoteRequest(item)}
                    >
                      Get Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All Catalogue Items */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="mb-3">{item.name}</CardTitle>
                <p className="text-muted-foreground mb-4">{item.short_description}</p>
                
                {/* Features */}
                {item.features.length > 0 && (
                  <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                    {item.features.slice(0, 3).map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                )}

                {/* Duration */}
                {item.duration_estimate && (
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Clock className="w-4 h-4 mr-2" />
                    {item.duration_estimate}
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Pricing and CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span className="font-semibold">
                      {item.pricing_type === 'quote' ? 'Request Quote' : item.price_display || `£${item.price}`}
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleQuoteRequest(item)}
                  >
                    Get Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quote Request Dialog */}
      {showQuoteForm && selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Quote: {selectedItem.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Name *</Label>
                <Input
                  id="customer_name"
                  value={quoteFormData.customer_name}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="customer_email">Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={quoteFormData.customer_email}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="customer_phone">Phone</Label>
                <Input
                  id="customer_phone"
                  value={quoteFormData.customer_phone}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="Your phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="project_description">Project Details</Label>
                <Textarea
                  id="project_description"
                  value={quoteFormData.project_description}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, project_description: e.target.value }))}
                  placeholder="Tell us more about your project..."
                />
              </div>
              
              <div>
                <Label htmlFor="estimated_budget">Estimated Budget</Label>
                <Input
                  id="estimated_budget"
                  value={quoteFormData.estimated_budget}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, estimated_budget: e.target.value }))}
                  placeholder="e.g., £5,000 - £10,000"
                />
              </div>
              
              <div>
                <Label htmlFor="preferred_timeline">Preferred Timeline</Label>
                <Input
                  id="preferred_timeline"
                  value={quoteFormData.preferred_timeline}
                  onChange={(e) => setQuoteFormData(prev => ({ ...prev, preferred_timeline: e.target.value }))}
                  placeholder="e.g., Within 3 months"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={submitQuoteRequest}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Request Quote"}
                </Button>
                {finalCalendlyUrl && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(finalCalendlyUrl, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Book Call
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};