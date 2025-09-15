import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Package, Eye } from "lucide-react";
import { CatalogueDisplay } from './CatalogueDisplay';

/**
 * Catalogue Manager Component for CRM
 * 
 * Allows users to:
 * - Create and manage service/product catalogue
 * - Set fixed prices or quote-based pricing
 * - Organize with categories and tags
 * - Preview how catalogue appears in microsites
 * - Generate sample catalogue for client ID "client789"
 */

interface CatalogueItem {
  id?: string;
  name: string;
  description: string;
  short_description: string;
  price?: number;
  price_display: string;
  pricing_type: string; // Changed from union type to string
  image_url: string;
  tags: string[] | string;
  features: string[] | string;
  duration_estimate: string;
  category_id?: string;
  is_featured: boolean;
  is_active: boolean;
  seo_title: string;
  seo_description: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  sort_order?: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const CatalogueManager = () => {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [formData, setFormData] = useState<CatalogueItem>({
    name: '',
    description: '',
    short_description: '',
    price: undefined,
    price_display: '',
    pricing_type: 'quote',
    image_url: '',
    tags: '',
    features: '',
    duration_estimate: '',
    category_id: '',
    is_featured: false,
    is_active: true,
    seo_title: '',
    seo_description: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchCatalogueData();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchCatalogueData = async () => {
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        supabase
          .from('catalogue_items')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('catalogue_categories')
          .select('*')
          .order('sort_order', { ascending: true })
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setItems(itemsResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (error) {
      console.error('Error fetching catalogue data:', error);
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
   * Sample function to create catalogue for client ID "client789"
   * Demonstrates complete catalogue setup with various service types
   */
  const createClient789Catalogue = async () => {
    if (!currentUser) return;

    const sampleCategories = [
      { name: 'Kitchen Renovations', description: 'Complete kitchen transformations', icon: '🍳' },
      { name: 'Bathroom Remodeling', description: 'Luxury bathroom upgrades', icon: '🛁' },
      { name: 'Home Extensions', description: 'Space expansion projects', icon: '🏠' },
      { name: 'Landscaping', description: 'Garden and outdoor spaces', icon: '🌱' }
    ];

    const sampleItems = [
      {
        name: 'Complete Kitchen Renovation',
        description: 'Full kitchen renovation including cabinets, countertops, appliances, flooring, and electrical work. Professional design consultation included.',
        short_description: 'Transform your kitchen with our complete renovation service',
        price: 15000,
        price_display: 'Starting from £15,000',
        pricing_type: 'fixed',
        tags: ['Kitchen', 'Renovation', 'Design'],
        features: ['Design consultation', 'Premium appliances', '2-year warranty', 'Project management'],
        duration_estimate: '3-4 weeks',
        is_featured: true
      },
      {
        name: 'Luxury Bathroom Suite',
        description: 'Premium bathroom renovation with high-end fixtures, tiles, and modern amenities. Includes underfloor heating and smart features.',
        short_description: 'Luxury bathroom with premium fixtures and modern amenities',
        price: 12000,
        price_display: 'From £12,000',
        pricing_type: 'fixed',
        tags: ['Bathroom', 'Luxury', 'Modern'],
        features: ['Underfloor heating', 'Smart fixtures', 'Premium tiles', 'Waterproofing'],
        duration_estimate: '2-3 weeks',
        is_featured: true
      },
      {
        name: 'Single Story Extension',
        description: 'Professional home extension service to add valuable space to your property. Includes planning permission assistance and full project management.',
        short_description: 'Add space and value with a professional extension',
        pricing_type: 'quote',
        price_display: 'Quote required',
        tags: ['Extension', 'Planning', 'Space'],
        features: ['Planning permission help', 'Structural engineering', 'Full project management', 'Building control'],
        duration_estimate: '8-12 weeks'
      },
      {
        name: 'Garden Landscaping',
        description: 'Complete garden transformation including design, planting, patios, and outdoor lighting. Create your perfect outdoor space.',
        short_description: 'Transform your garden into a beautiful outdoor space',
        price: 8000,
        price_display: 'Starting from £8,000',
        pricing_type: 'fixed',
        tags: ['Garden', 'Landscaping', 'Outdoor'],
        features: ['Garden design', 'Patio installation', 'Planting scheme', 'Outdoor lighting'],
        duration_estimate: '1-2 weeks'
      },
      {
        name: 'Loft Conversion',
        description: 'Professional loft conversion to create additional living space. Includes insulation, windows, flooring, and electrical work.',
        short_description: 'Convert your loft into valuable living space',
        pricing_type: 'quote',
        price_display: 'Quote based on requirements',
        tags: ['Loft', 'Conversion', 'Space'],
        features: ['Structural work', 'Insulation', 'Velux windows', 'Electrical installation'],
        duration_estimate: '4-6 weeks'
      },
      {
        name: 'Electrical Rewiring',
        description: 'Complete electrical rewiring service for safety and modern standards. Includes new consumer unit and testing.',
        short_description: 'Professional electrical rewiring for safety and compliance',
        price: 3500,
        price_display: '£3,500 for average home',
        pricing_type: 'fixed',
        tags: ['Electrical', 'Safety', 'Rewiring'],
        features: ['New consumer unit', 'Modern sockets', 'Safety testing', 'Certification'],
        duration_estimate: '3-5 days'
      }
    ];

    try {
      console.log('🏗️ Creating sample catalogue for Client789...');

      // Create categories first
      const { data: createdCategories } = await supabase
        .from('catalogue_categories')
        .insert(sampleCategories.map(cat => ({
          ...cat,
          user_id: currentUser.id
        })))
        .select();

      // Create catalogue items
      const itemsToInsert = sampleItems.map((item, index) => ({
        ...item,
        user_id: currentUser.id,
        category_id: createdCategories?.[Math.floor(index / 2)]?.id || null,
        seo_title: `${item.name} - Client789 Construction`,
        seo_description: item.short_description,
        sort_order: index
      }));

      await supabase
        .from('catalogue_items')
        .insert(itemsToInsert);

      toast({
        title: "✅ Client789 Catalogue Created!",
        description: "Sample catalogue with 6 services and 4 categories has been created",
      });

      fetchCatalogueData();

      console.log('✅ Sample catalogue created for Client789:', {
        categories: sampleCategories.length,
        items: sampleItems.length,
        featured: sampleItems.filter(item => item.is_featured).length
      });

    } catch (error) {
      console.error('❌ Error creating sample catalogue:', error);
      toast({
        title: "Error",
        description: "Failed to create sample catalogue",
        variant: "destructive",
      });
    }
  };

  const saveItem = async () => {
    try {
      const itemData = {
        ...formData,
        user_id: currentUser?.id,
        tags: typeof formData.tags === 'string' ? formData.tags.split(',').map(t => t.trim()) : formData.tags,
        features: typeof formData.features === 'string' ? formData.features.split(',').map(f => f.trim()) : formData.features
      };

      if (editing) {
        await supabase
          .from('catalogue_items')
          .update(itemData)
          .eq('id', editing);
      } else {
        await supabase
          .from('catalogue_items')
          .insert(itemData);
      }

      toast({
        title: "Success",
        description: `Catalogue item ${editing ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      fetchCatalogueData();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: "Failed to save catalogue item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      short_description: '',
      price: undefined,
      price_display: '',
      pricing_type: 'quote',
      image_url: '',
      tags: '',
      features: '',
      duration_estimate: '',
      category_id: '',
      is_featured: false,
      is_active: true,
      seo_title: '',
      seo_description: ''
    });
    setEditing(null);
  };

  const editItem = (item: any) => {
    setFormData({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
      features: Array.isArray(item.features) ? item.features.join(', ') : item.features || ''
    });
    setEditing(item.id);
  };

  const deleteItem = async (id: string) => {
    try {
      await supabase
        .from('catalogue_items')
        .delete()
        .eq('id', id);

      toast({
        title: "Success",
        description: "Catalogue item deleted successfully",
      });

      fetchCatalogueData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete catalogue item",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Catalogue Preview</h2>
          <Button onClick={() => setShowPreview(false)} variant="outline">
            Back to Manager
          </Button>
        </div>
        <CatalogueDisplay 
          clientId={currentUser?.id || ''} 
          calendlyUrl="https://calendly.com/client789/consultation"
          zapierWebhook="https://hooks.zapier.com/hooks/catch/example/webhook"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Catalogue Manager</h2>
          <p className="text-muted-foreground">
            Manage your services and products for client microsites
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPreview(true)} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={createClient789Catalogue} variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Create Client789 Sample
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit' : 'Add New'} Catalogue Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Service/Product Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Complete Kitchen Renovation"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Short Description</Label>
            <Input
              value={formData.short_description}
              onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
              placeholder="Brief description for cards"
            />
          </div>

          <div>
            <Label>Full Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the service"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Pricing Type</Label>
              <Select
                value={formData.pricing_type}
                onValueChange={(value: 'fixed' | 'quote') => setFormData(prev => ({ ...prev, pricing_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="quote">Quote Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price (£)</Label>
              <Input
                type="number"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="15000"
                disabled={formData.pricing_type === 'quote'}
              />
            </div>
            <div>
              <Label>Price Display Text</Label>
              <Input
                value={formData.price_display}
                onChange={(e) => setFormData(prev => ({ ...prev, price_display: e.target.value }))}
                placeholder="Starting from £15,000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={typeof formData.tags === 'string' ? formData.tags : formData.tags.join(', ')}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Kitchen, Renovation, Design"
              />
            </div>
            <div>
              <Label>Duration Estimate</Label>
              <Input
                value={formData.duration_estimate}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_estimate: e.target.value }))}
                placeholder="3-4 weeks"
              />
            </div>
          </div>

          <div>
            <Label>Features (comma-separated)</Label>
            <Textarea
              value={typeof formData.features === 'string' ? formData.features : formData.features.join(', ')}
              onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
              placeholder="Design consultation, Premium appliances, 2-year warranty"
              rows={2}
            />
          </div>

          <div>
            <Label>Image URL</Label>
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label>Featured Service</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveItem}>
              {editing ? 'Update' : 'Create'} Item
            </Button>
            {editing && (
              <Button onClick={resetForm} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <Card key={item.id} className={item.is_featured ? 'ring-2 ring-primary/20' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => editItem(item)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteItem(item.id!)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">{item.short_description}</p>
              <div className="flex justify-between items-center">
                <div>
                  {item.pricing_type === 'fixed' ? (
                    <span className="font-bold text-primary">£{item.price?.toLocaleString()}</span>
                  ) : (
                    <Badge variant="outline">Quote Required</Badge>
                  )}
                </div>
                {item.is_featured && (
                  <Badge>Featured</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};