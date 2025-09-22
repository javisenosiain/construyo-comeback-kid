import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, Calendar, ExternalLink, Eye, Zap, Package, Clock, DollarSign, Phone, Mail, MapPin } from "lucide-react";

/**
 * Enhanced Product Catalogue for Client Microsites
 * 
 * Features:
 * - Display services/products with tags (Kitchen, Extension) and pricing (fixed or quote)
 * - Pull catalogue data from Construyo CRM Tables
 * - Allow clients to request quotes via embedded form linked to Calendly
 * - Sync quote requests to Construyo CRM and optionally to external CRMs via Zapier
 * - Responsive design and fast loading
 * - Log catalogue views and quote requests for analytics
 * 
 * Sample usage for client ID "client789":
 * <ProductCatalogueDisplay 
 *   clientId="client789" 
 *   micrositeId="microsite-uuid"
 *   calendlyUrl="https://calendly.com/client789/consultation"
 *   zapierWebhook="https://hooks.zapier.com/..."
 *   enableAnalytics={true}
 * />
 */

interface CatalogueItem {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  price?: number;
  price_display?: string;
  pricing_type: string; // Changed to string to match database
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
  user_id: string;
  is_active: boolean;
  sort_order: number;
}

interface ProductCatalogueDisplayProps {
  clientId: string;
  micrositeId?: string;
  calendlyUrl?: string;
  zapierWebhook?: string;
  showHeader?: boolean;
  maxItems?: number;
  featuredOnly?: boolean;
  enableAnalytics?: boolean;
  className?: string;
}

interface QuoteFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name?: string;
  project_description: string;
  estimated_budget: string;
  preferred_timeline: string;
  selected_service_id: string;
  selected_service_name: string;
  additional_notes?: string;
}

export const ProductCatalogueDisplay: React.FC<ProductCatalogueDisplayProps> = ({
  clientId,
  micrositeId,
  calendlyUrl,
  zapierWebhook,
  showHeader = true,
  maxItems = 20,
  featuredOnly = false,
  enableAnalytics = true,
  className = ""
}) => {
  const [catalogueItems, setCatalogueItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<CatalogueItem | null>(null);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    company_name: '',
    project_description: '',
    estimated_budget: '',
    preferred_timeline: '',
    selected_service_id: '',
    selected_service_name: '',
    additional_notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    initializeCatalogue();
  }, [clientId, micrositeId]);

  /**
   * Initialize catalogue: Fetch data and track view
   */
  const initializeCatalogue = async () => {
    await Promise.all([
      fetchCatalogueData(),
      enableAnalytics && trackCatalogueView()
    ]);
  };

  /**
   * Fetch catalogue data from Construyo CRM tables
   * Optimized for fast loading with proper indexing
   */
  const fetchCatalogueData = async () => {
    try {
      console.log('📦 Fetching catalogue data for client:', clientId);
      setLoading(true);

      // Fetch catalogue items with categories in a single query for performance
      const { data: items, error: itemsError } = await supabase
        .from('catalogue_items')
        .select(`
          *,
          catalogue_categories!inner (
            id,
            name,
            description,
            icon,
            sort_order
          )
        `)
        .eq('user_id', clientId)
        .eq('is_active', true)
        .eq('catalogue_categories.is_active', true)
        .order('sort_order', { ascending: true })
        .order('is_featured', { ascending: false })
        .limit(maxItems);

      // Fetch categories separately for filtering
      const { data: cats, error: catsError } = await supabase
        .from('catalogue_categories')
        .select('*')
        .eq('user_id', clientId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;
      if (catsError) throw catsError;

      // Filter featured items if requested
      const filteredItems = featuredOnly 
        ? (items || []).filter(item => item.is_featured)
        : (items || []);

      setCatalogueItems(filteredItems);
      setCategories(cats || []);

      console.log('✅ Catalogue data loaded:', {
        totalItems: filteredItems.length,
        categories: cats?.length || 0,
        featured: filteredItems.filter(item => item.is_featured).length,
        clientId
      });

    } catch (error) {
      console.error('❌ Error fetching catalogue data:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load catalogue. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Track catalogue view for analytics
   * Records user engagement and microsite performance
   */
  const trackCatalogueView = async () => {
    if (!enableAnalytics || !micrositeId) return;

    try {
      const viewData = {
        user_id: clientId,
        microsite_id: micrositeId,
        event_type: 'catalogue_view',
        event_data: {
          timestamp: new Date().toISOString(),
          totalItems: catalogueItems.length,
          categories: categories.length,
          featuredOnly,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        },
        ip_address: null, // Will be set by database
        user_agent: navigator.userAgent,
        referrer: document.referrer || null
      };

      await supabase
        .from('catalogue_analytics')
        .insert(viewData);

      console.log('📊 Catalogue view tracked successfully');
    } catch (error) {
      console.error('📊 Error tracking catalogue view:', error);
      // Don't show error to user for analytics failures
    }
  };

  /**
   * Track quote request for analytics
   * Records conversion events for performance analysis
   */
  const trackQuoteRequest = async (serviceId: string, serviceName: string, formData: QuoteFormData) => {
    if (!enableAnalytics || !micrositeId) return;

    try {
      const requestData = {
        user_id: clientId,
        microsite_id: micrositeId,
        catalogue_item_id: serviceId,
        event_type: 'quote_request',
        event_data: {
          timestamp: new Date().toISOString(),
          serviceName,
          serviceId,
          customerEmail: formData.customer_email,
          estimatedBudget: formData.estimated_budget,
          timeline: formData.preferred_timeline,
          conversionSource: 'microsite_catalogue'
        },
        ip_address: null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null
      };

      await supabase
        .from('catalogue_analytics')
        .insert(requestData);

      console.log('📊 Quote request tracked:', serviceName);
    } catch (error) {
      console.error('📊 Error tracking quote request:', error);
    }
  };

  /**
   * Handle quote request form submission
   * Comprehensive CRM integration with external sync
   */
  const handleQuoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuote(true);

    try {
      console.log('📝 Processing quote request for:', quoteForm.selected_service_name);

      // Validate required fields
      if (!quoteForm.customer_name || !quoteForm.customer_email || !quoteForm.project_description) {
        throw new Error('Please fill in all required fields');
      }

      // Get authenticated user for proper CRM structure
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      // Get user's company for lead assignment
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoles?.company_id) {
        throw new Error('User company configuration not found');
      }

      // Parse customer name
      const nameParts = quoteForm.customer_name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Create lead in Construyo CRM
      const leadData = {
        company_id: userRoles.company_id,
        created_by: user.id,
        first_name: firstName,
        last_name: lastName,
        email: quoteForm.customer_email,
        phone: quoteForm.customer_phone,
        company_name: quoteForm.company_name,
        project_type: quoteForm.selected_service_name,
        project_description: quoteForm.project_description,
        estimated_timeline: quoteForm.preferred_timeline,
        lead_source: `Microsite Catalogue: ${quoteForm.selected_service_name}`,
        notes: `Budget: ${quoteForm.estimated_budget}\nTimeline: ${quoteForm.preferred_timeline}\nAdditional Notes: ${quoteForm.additional_notes}\n\nQuote request from microsite catalogue.`,
        priority: 'high', // Catalogue requests are high priority
        status: 'new' as const,
        tags: ['microsite', 'catalogue', 'quote-request']
      };

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();

      if (leadError) throw leadError;

      // Store detailed quote request
      const quoteRequestData = {
        user_id: clientId,
        catalogue_item_id: quoteForm.selected_service_id,
        microsite_id: micrositeId,
        customer_name: quoteForm.customer_name,
        customer_email: quoteForm.customer_email,
        customer_phone: quoteForm.customer_phone,
        project_description: quoteForm.project_description,
        estimated_budget: quoteForm.estimated_budget,
        preferred_timeline: quoteForm.preferred_timeline,
        form_data: {
          companyName: quoteForm.company_name,
          additionalNotes: quoteForm.additional_notes,
          serviceName: quoteForm.selected_service_name,
          submissionSource: 'microsite_catalogue'
        },
        status: 'pending',
        calendly_event_url: calendlyUrl,
        source_url: window.location.href
      };

      await supabase
        .from('quote_requests')
        .insert(quoteRequestData);

      // Track analytics
      await trackQuoteRequest(quoteForm.selected_service_id, quoteForm.selected_service_name, quoteForm);

      // External CRM sync via Zapier (if configured)
      if (zapierWebhook) {
        await syncToExternalCRM(lead, quoteForm);
      }

      // Success notification
      toast({
        title: "✅ Quote Request Submitted!",
        description: `Thank you ${quoteForm.customer_name}! We'll contact you about ${quoteForm.selected_service_name} within 24 hours.`,
      });

      // Open Calendly for immediate booking (optional)
      if (calendlyUrl) {
        setTimeout(() => {
          window.open(calendlyUrl, '_blank');
        }, 2000);
      }

      // Reset form and close dialog
      resetQuoteForm();
      
      console.log('✅ Quote request processed successfully:', {
        leadId: lead.id,
        service: quoteForm.selected_service_name,
        customer: quoteForm.customer_name,
        externalCRMSynced: !!zapierWebhook
      });

    } catch (error) {
      console.error('❌ Error processing quote request:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to submit quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingQuote(false);
    }
  };

  /**
   * Sync quote request to external CRM via Zapier
   * Ensures data flows to client's existing systems
   */
  const syncToExternalCRM = async (lead: any, formData: QuoteFormData) => {
    try {
      console.log('🔗 Syncing quote request to external CRM...');
      
      const zapierPayload = {
        // Lead Information
        leadId: lead.id,
        customerName: formData.customer_name,
        customerEmail: formData.customer_email,
        customerPhone: formData.customer_phone,
        companyName: formData.company_name,
        
        // Service Information
        serviceRequested: formData.selected_service_name,
        serviceId: formData.selected_service_id,
        projectDescription: formData.project_description,
        estimatedBudget: formData.estimated_budget,
        preferredTimeline: formData.preferred_timeline,
        additionalNotes: formData.additional_notes,
        
        // Meta Information
        source: 'Microsite Product Catalogue',
        submissionType: 'quote_request',
        submittedAt: new Date().toISOString(),
        clientId: clientId,
        micrositeId: micrositeId,
        calendlyUrl: calendlyUrl,
        
        // CRM Fields Mapping
        leadSource: `Microsite: ${formData.selected_service_name}`,
        leadStatus: 'New Quote Request',
        priority: 'High',
        tags: ['microsite', 'catalogue', 'quote-request']
      };

      const response = await fetch(zapierWebhook, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'no-cors', // Handle CORS for Zapier webhooks
        body: JSON.stringify(zapierPayload)
      });

      console.log('✅ External CRM sync completed');
      
    } catch (zapierError) {
      console.error('❌ External CRM sync failed:', zapierError);
      // Don't fail the quote request if external sync fails
    }
  };

  /**
   * Open quote request dialog for a specific service
   */
  const requestQuote = (item: CatalogueItem) => {
    setSelectedService(item);
    setQuoteForm(prev => ({
      ...prev,
      selected_service_id: item.id,
      selected_service_name: item.name,
      project_description: `I would like to request a quote for ${item.name}. ${item.short_description || item.description}`,
    }));
    setQuoteDialogOpen(true);
  };

  /**
   * Reset quote form to initial state
   */
  const resetQuoteForm = () => {
    setQuoteForm({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      company_name: '',
      project_description: '',
      estimated_budget: '',
      preferred_timeline: '',
      selected_service_id: '',
      selected_service_name: '',
      additional_notes: ''
    });
    setQuoteDialogOpen(false);
    setSelectedService(null);
  };

  /**
   * Filter items based on category, tags, and search query
   */
  const filteredItems = catalogueItems.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category_id === selectedCategory;
    const tagMatch = selectedTags.length === 0 || 
      selectedTags.some(tag => item.tags?.includes(tag));
    const searchMatch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return categoryMatch && tagMatch && searchMatch;
  });

  // Extract unique tags for filtering
  const allTags = [...new Set(catalogueItems.flatMap(item => item.tags || []))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading catalogue...</p>
        </div>
      </div>
    );
  }

  if (catalogueItems.length === 0) {
    return (
      <div className="text-center p-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Services Available</h3>
        <p className="text-muted-foreground">
          The catalogue is currently being updated. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header Section */}
      {showHeader && (
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Our Services & Products</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore our comprehensive range of construction services with transparent pricing. 
            Request a quote or book a consultation for any service.
          </p>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="max-w-md mx-auto">
          <Input
            type="search"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

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
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        )}

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {allTags.slice(0, 12).map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
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
      </div>

      {/* Results Count */}
      <div className="text-center text-sm text-muted-foreground">
        Showing {filteredItems.length} of {catalogueItems.length} services
      </div>

      {/* Catalogue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map(item => (
          <Card 
            key={item.id} 
            className={`h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              item.is_featured ? 'ring-2 ring-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''
            }`}
          >
            {/* Featured Badge */}
            {item.is_featured && (
              <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 text-center rounded-t-lg">
                ⭐ Featured Service
              </div>
            )}
            
            {/* Service Image */}
            {item.image_url && (
              <div className="aspect-video overflow-hidden rounded-t-lg">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}

            <CardHeader className="flex-none">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg leading-tight line-clamp-2">{item.name}</CardTitle>
                <div className="text-right flex-shrink-0">
                  {item.pricing_type === 'fixed' && item.price ? (
                    <div className="text-lg font-bold text-primary">
                      £{item.price.toLocaleString()}
                    </div>
                  ) : (
                    <Badge variant="outline" className="whitespace-nowrap">
                      Quote Required
                    </Badge>
                  )}
                  {item.price_display && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.price_display}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4">
              {/* Description */}
              <CardDescription className="line-clamp-3">
                {item.short_description || item.description}
              </CardDescription>

              {/* Duration */}
              {item.duration_estimate && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  {item.duration_estimate}
                </div>
              )}

              {/* Features (if available) */}
              {item.features && item.features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Includes:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {item.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        {feature}
                      </li>
                    ))}
                    {item.features.length > 3 && (
                      <li className="text-primary text-xs">
                        +{item.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {item.tags?.slice(0, 3).map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button 
                  onClick={() => requestQuote(item)}
                  className="w-full"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {item.pricing_type === 'fixed' ? 'Get Quote' : 'Request Quote'}
                </Button>
                
                {calendlyUrl && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(calendlyUrl, '_blank')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Consultation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredItems.length === 0 && (
        <div className="text-center p-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Quote Request Dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Request Quote: {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              Fill out the form below and we'll get back to you within 24 hours with a detailed quote.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleQuoteRequest} className="space-y-4">
            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Contact Information</h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="customer_name">Full Name *</Label>
                  <Input
                    id="customer_name"
                    value={quoteForm.customer_name}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="John Smith"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_email">Email Address *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={quoteForm.customer_email}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="john@example.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_phone">Phone Number</Label>
                  <Input
                    id="customer_phone"
                    type="tel"
                    value={quoteForm.customer_phone}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="+44 7700 900123"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company_name">Company Name (Optional)</Label>
                  <Input
                    id="company_name"
                    value={quoteForm.company_name}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="ABC Ltd."
                  />
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h4 className="font-medium">Project Details</h4>
              
              <div>
                <Label htmlFor="project_description">Project Description *</Label>
                <Textarea
                  id="project_description"
                  value={quoteForm.project_description}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, project_description: e.target.value }))}
                  placeholder="Please describe your project requirements..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_budget">Estimated Budget</Label>
                  <Select
                    value={quoteForm.estimated_budget}
                    onValueChange={(value) => setQuoteForm(prev => ({ ...prev, estimated_budget: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="under-5k">Under £5,000</SelectItem>
                      <SelectItem value="5k-10k">£5,000 - £10,000</SelectItem>
                      <SelectItem value="10k-25k">£10,000 - £25,000</SelectItem>
                      <SelectItem value="25k-50k">£25,000 - £50,000</SelectItem>
                      <SelectItem value="over-50k">Over £50,000</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="preferred_timeline">Preferred Timeline</Label>
                  <Select
                    value={quoteForm.preferred_timeline}
                    onValueChange={(value) => setQuoteForm(prev => ({ ...prev, preferred_timeline: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">As soon as possible</SelectItem>
                      <SelectItem value="1-month">Within 1 month</SelectItem>
                      <SelectItem value="2-3-months">2-3 months</SelectItem>
                      <SelectItem value="6-months">Within 6 months</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <Textarea
                  id="additional_notes"
                  value={quoteForm.additional_notes}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, additional_notes: e.target.value }))}
                  placeholder="Any additional requirements or questions..."
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetQuoteForm} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={submittingQuote} className="flex-1">
                {submittingQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Quote
                  </>
                )}
              </Button>
              {calendlyUrl && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => window.open(calendlyUrl, '_blank')}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Call
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * Sample implementation for client ID "client789":
 * 
 * const Client789Catalogue = () => {
 *   return (
 *     <ProductCatalogueDisplay 
 *       clientId="client789"
 *       micrositeId="client789-microsite-uuid"
 *       calendlyUrl="https://calendly.com/client789/consultation"
 *       zapierWebhook="https://hooks.zapier.com/hooks/catch/12345/client789"
 *       enableAnalytics={true}
 *       showHeader={true}
 *       maxItems={20}
 *       className="container mx-auto px-4"
 *     />
 *   );
 * };
 */