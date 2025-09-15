import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, Calendar, ExternalLink, Eye, Zap } from "lucide-react";

/**
 * Product Catalogue Display Component for Customer Microsites
 * 
 * Features:
 * - Display services/products with tags and pricing (fixed or quote)
 * - Pull data from Construyo CRM catalogue tables
 * - Embedded quote request forms with Calendly integration
 * - CRM sync for quote requests + Zapier integration
 * - Responsive design with fast loading
 * - Analytics tracking for views and quote requests
 * 
 * Usage in microsite:
 * <CatalogueDisplay 
 *   clientId="client789" 
 *   micrositeId="microsite-uuid"
 *   calendlyUrl="https://calendly.com/client789/consultation"
 *   zapierWebhook="https://hooks.zapier.com/..."
 * />
 */

interface CatalogueItem {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  price?: number;
  price_display?: string;
  pricing_type: string; // Changed from union type to string
  image_url?: string;
  tags: string[];
  features: string[];
  duration_estimate?: string;
  category_id?: string;
  is_featured: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  sort_order: number;
  seo_title?: string;
  seo_description?: string;
}

interface CatalogueCategory {
  id: string;
  name: string;
  description?: string;
  icon: string;
}

interface CatalogueDisplayProps {
  clientId: string;
  micrositeId?: string;
  calendlyUrl?: string;
  zapierWebhook?: string;
  showHeader?: boolean;
  maxItems?: number;
}

interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  message: string;
  budget?: string;
  timeline?: string;
}

export const CatalogueDisplay: React.FC<CatalogueDisplayProps> = ({
  clientId,
  micrositeId,
  calendlyUrl,
  zapierWebhook,
  showHeader = true,
  maxItems = 12
}) => {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<CatalogueItem | null>(null);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    name: '',
    email: '',
    phone: '',
    serviceId: '',
    serviceName: '',
    message: '',
    budget: '',
    timeline: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCatalogueData();
    if (micrositeId) {
      trackCatalogueView();
    }
  }, [clientId, micrositeId]);

  /**
   * Fetch catalogue data from Construyo CRM tables
   * Pulls services/products with categories, pricing, and tags
   */
  const fetchCatalogueData = async () => {
    try {
      console.log('📦 Fetching catalogue data for client:', clientId);

      // Fetch catalogue items for the client
      const { data: items, error: itemsError } = await supabase
        .from('catalogue_items')
        .select(`
          *,
          catalogue_categories (
            id,
            name,
            description,
            icon
          )
        `)
        .eq('user_id', clientId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(maxItems);

      // Fetch categories for filtering
      const { data: cats, error: catsError } = await supabase
        .from('catalogue_categories')
        .select('*')
        .eq('user_id', clientId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      if (catsError) throw catsError;

      setCatalogueItems(items || []);
      setCategories(cats || []);

      console.log('✅ Catalogue data loaded:', {
        items: items?.length || 0,
        categories: cats?.length || 0,
        featured: items?.filter(item => item.is_featured).length || 0
      });

    } catch (error) {
      console.error('❌ Error fetching catalogue data:', error);
      toast({
        title: "Error",
        description: "Failed to load catalogue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Track catalogue view for analytics
   */
  const trackCatalogueView = async () => {
    if (!micrositeId) return;

    try {
      await supabase
        .from('catalogue_analytics')
        .insert({
          user_id: clientId,
          microsite_id: micrositeId,
          event_type: 'catalogue_view',
          event_data: {
            timestamp: new Date().toISOString(),
            totalItems: catalogueItems.length,
            categories: categories.length
          }
        });

      console.log('📊 Catalogue view tracked');
    } catch (error) {
      console.error('Error tracking catalogue view:', error);
    }
  };

  /**
   * Track quote request for analytics
   */
  const trackQuoteRequest = async (serviceId: string, serviceName: string) => {
    if (!micrositeId) return;

    try {
      await supabase
        .from('catalogue_analytics')
        .insert({
          user_id: clientId,
          microsite_id: micrositeId,
          catalogue_item_id: serviceId,
          event_type: 'quote_request',
          event_data: {
            timestamp: new Date().toISOString(),
            serviceName,
            formType: 'quote_request'
          }
        });

      console.log('📊 Quote request tracked for service:', serviceName);
    } catch (error) {
      console.error('Error tracking quote request:', error);
    }
  };

  /**
   * Handle quote request form submission
   * Syncs to Construyo CRM and optionally to Zapier
   */
  const handleQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuote(true);

    try {
      console.log('📝 Processing quote request for:', quoteForm.serviceName);

      // Create lead in Construyo CRM
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          customer_name: quoteForm.name,
          email: quoteForm.email,
          phone: quoteForm.phone,
          project_type: quoteForm.serviceName,
          description: quoteForm.message,
          budget_range: quoteForm.budget,
          timeline: quoteForm.timeline,
          source: `Catalogue: ${quoteForm.serviceName}`,
          status: 'new',
          priority: 'high', // Quote requests are high priority
          customer_id: clientId,
          notes: `Quote request from microsite catalogue for: ${quoteForm.serviceName}`
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Track the quote request
      await trackQuoteRequest(quoteForm.serviceId, quoteForm.serviceName);

      // Send to Zapier webhook if configured
      if (zapierWebhook) {
        try {
          console.log('🔗 Syncing quote request to external CRM via Zapier...');
          
          const zapierData = {
            leadId: lead.id,
            customerName: quoteForm.name,
            email: quoteForm.email,
            phone: quoteForm.phone,
            serviceRequested: quoteForm.serviceName,
            serviceId: quoteForm.serviceId,
            message: quoteForm.message,
            budget: quoteForm.budget,
            timeline: quoteForm.timeline,
            source: 'Catalogue Quote Request',
            requestType: 'quote',
            submittedAt: new Date().toISOString(),
            clientId: clientId,
            micrositeId: micrositeId
          };

          await fetch(zapierWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify(zapierData)
          });

          console.log('✅ External CRM sync successful');
        } catch (zapierError) {
          console.error('❌ Zapier webhook failed:', zapierError);
          // Don't fail the quote request if Zapier fails
        }
      }

      toast({
        title: "✅ Quote Request Submitted!",
        description: `Thank you ${quoteForm.name}! We'll contact you soon about ${quoteForm.serviceName}.`,
      });

      // Reset form and close dialog
      setQuoteForm({
        name: '',
        email: '',
        phone: '',
        serviceId: '',
        serviceName: '',
        message: '',
        budget: '',
        timeline: ''
      });
      setQuoteDialogOpen(false);
      setSelectedService(null);

      console.log('✅ Quote request processed successfully:', {
        leadId: lead.id,
        service: quoteForm.serviceName,
        customer: quoteForm.name
      });

    } catch (error) {
      console.error('❌ Error processing quote request:', error);
      toast({
        title: "Error",
        description: "Failed to submit quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  /**
   * Open quote request dialog for a specific service
   */
  const requestQuote = (item: CatalogueItem) => {
    setSelectedService(item);
    setQuoteForm(prev => ({
      ...prev,
      serviceId: item.id,
      serviceName: item.name,
      message: `I would like to request a quote for ${item.name}. ${item.description}`
    }));
    setQuoteDialogOpen(true);
  };

  /**
   * Filter items by category and tags
   */
  const filteredItems = catalogueItems.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category_id === selectedCategory;
    const tagMatch = selectedTags.length === 0 || 
      selectedTags.some(tag => item.tags?.includes(tag));
    return categoryMatch && tagMatch;
  });

  const allTags = [...new Set(catalogueItems.flatMap(item => item.tags || []))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading catalogue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Our Services & Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our comprehensive range of construction services with transparent pricing. 
            Request a quote or book a consultation for any service.
          </p>
        </div>
      )}

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Services
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      )}

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {allTags.slice(0, 8).map(tag => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => {
                setSelectedTags(prev => 
                  prev.includes(tag) 
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                );
              }}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Catalogue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <Card key={item.id} className={`h-full transition-all duration-300 hover:shadow-lg ${
            item.is_featured ? 'ring-2 ring-primary/20' : ''
          }`}>
            {item.is_featured && (
              <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 text-center">
                ⭐ Featured Service
              </div>
            )}
            
            {item.image_url && (
              <div className="aspect-video overflow-hidden rounded-t-lg">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            )}

            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                <div className="text-right">
                  {item.pricing_type === 'fixed' && item.price ? (
                    <div className="text-lg font-bold text-primary">
                      £{item.price.toLocaleString()}
                    </div>
                  ) : (
                    <Badge variant="outline">Quote Required</Badge>
                  )}
                  {item.price_display && (
                    <div className="text-xs text-muted-foreground">
                      {item.price_display}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <CardDescription className="line-clamp-3">
                {item.short_description || item.description}
              </CardDescription>

              {/* Features */}
              {item.features && item.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Includes:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {item.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Duration */}
              {item.duration_estimate && (
                <div className="text-xs text-muted-foreground">
                  <strong>Timeline:</strong> {item.duration_estimate}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => requestQuote(item)}
                  className="flex-1"
                  variant={item.pricing_type === 'quote' ? 'default' : 'outline'}
                >
                  {item.pricing_type === 'quote' ? 'Get Quote' : 'Request Service'}
                </Button>
                
                {calendlyUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(calendlyUrl, '_blank')}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quote Request Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote: {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll get back to you with a detailed quote.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuoteRequest} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={quoteForm.name}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={quoteForm.email}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={quoteForm.phone}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+44 7123 456 789"
                  required
                />
              </div>

              <div>
                <Label htmlFor="budget">Budget Range</Label>
                <Input
                  id="budget"
                  value={quoteForm.budget}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="£5,000 - £10,000"
                />
              </div>

              <div>
                <Label htmlFor="timeline">Preferred Timeline</Label>
                <Input
                  id="timeline"
                  value={quoteForm.timeline}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="Within 3 months"
                />
              </div>

              <div>
                <Label htmlFor="message">Project Details</Label>
                <Textarea
                  id="message"
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Tell us more about your project requirements..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={submittingQuote}
                className="flex-1"
              >
                {submittingQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quote Request'
                )}
              </Button>
              
              {calendlyUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(calendlyUrl, '_blank')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Call
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-muted-foreground">No services found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or contact us directly for custom requirements.
          </p>
        </div>
      )}
    </div>
  );
};