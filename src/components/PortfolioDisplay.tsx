import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink, Play, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  project_type: string;
  client_name: string;
  completion_date: string;
  budget_range: string;
  image_url: string;
  tags?: string[];
  media_urls?: string[];
}

interface Review {
  id: string;
  platform: string;
  rating: number;
  reviewer_name: string;
  review_text: string;
  platform_url: string;
  review_date: string;
}

interface PortfolioDisplayProps {
  userId: string;
  micrositeId?: string;
  maxItems?: number;
  showReviews?: boolean;
  googleReviewUrl?: string;
  trustpilotReviewUrl?: string;
  className?: string;
}

/**
 * Portfolio display component for client microsites
 * Shows completed projects with filtering and review links
 * 
 * Usage example for client ID "client789":
 * <PortfolioDisplay 
 *   userId="client789"
 *   micrositeId="micro123"
 *   maxItems={6}
 *   showReviews={true}
 *   googleReviewUrl="https://g.page/r/business-id/review"
 *   trustpilotReviewUrl="https://trustpilot.com/review/business.com"
 * />
 */
export const PortfolioDisplay: React.FC<PortfolioDisplayProps> = ({
  userId,
  micrositeId,
  maxItems = 9,
  showReviews = true,
  googleReviewUrl,
  trustpilotReviewUrl,
  className = ""
}) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [mediaModal, setMediaModal] = useState<{ isOpen: boolean; item: PortfolioItem | null }>({
    isOpen: false,
    item: null
  });

  useEffect(() => {
    fetchPortfolioData();
    if (showReviews) {
      fetchReviews();
    }
    logPortfolioView();
  }, [userId]);

  const fetchPortfolioData = async () => {
    try {
      // Fetch portfolio items from CRM
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', userId)
        .order('completion_date', { ascending: false })
        .limit(maxItems);

      if (portfolioError) throw portfolioError;

      // Transform data and add tags based on project_type
      const itemsWithTags = portfolioData?.map(item => ({
        ...item,
        tags: generateTagsFromProject(item.project_type, item.title, item.description)
      })) || [];

      setPortfolioItems(itemsWithTags);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('external_reviews')
        .select('*')
        .eq('user_id', userId)
        .eq('verified', true)
        .order('review_date', { ascending: false })
        .limit(3);

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const generateTagsFromProject = (projectType: string, title: string, description: string): string[] => {
    const tags = new Set<string>();
    
    // Add project type as primary tag
    if (projectType) tags.add(projectType);
    
    // Extract common construction keywords
    const keywords = [
      'kitchen', 'bathroom', 'extension', 'renovation', 'remodel', 
      'plumbing', 'electrical', 'flooring', 'roofing', 'painting',
      'garden', 'landscaping', 'conservatory', 'loft', 'basement'
    ];
    
    const text = `${title} ${description}`.toLowerCase();
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
    
    return Array.from(tags).slice(0, 4); // Limit to 4 tags
  };

  const logPortfolioView = async () => {
    if (!micrositeId) return;
    
    try {
      await supabase.from('microsite_analytics').insert({
        microsite_id: micrositeId,
        event_type: 'portfolio_view',
        event_data: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          items_count: portfolioItems.length
        }
      });
    } catch (error) {
      console.error('Error logging portfolio view:', error);
    }
  };

  const logReviewLinkClick = async (platform: string, url: string) => {
    if (!micrositeId) return;
    
    try {
      await supabase.from('microsite_analytics').insert({
        microsite_id: micrositeId,
        event_type: 'review_link_click',
        event_data: {
          platform,
          timestamp: new Date().toISOString(),
          url
        }
      });
    } catch (error) {
      console.error('Error logging review click:', error);
    }
  };

  const handleReviewClick = (platform: string, url: string) => {
    logReviewLinkClick(platform, url);
    window.open(url, '_blank');
  };

  const handleMediaClick = (item: PortfolioItem) => {
    setMediaModal({ isOpen: true, item });
  };

  // Get all unique tags for filtering
  const allTags = Array.from(
    new Set(portfolioItems.flatMap(item => item.tags || []))
  ).sort();

  // Filter items by selected tag
  const filteredItems = selectedTag === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.tags?.includes(selectedTag));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Section Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Our Recent Work</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Take a look at some of our completed projects and see the quality craftsmanship we deliver
        </p>
      </div>

      {/* Reviews Section */}
      {showReviews && reviews.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-center">What Our Clients Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {reviews.map(review => (
              <Card key={review.id} className="text-center">
                <CardContent className="p-4">
                  <div className="flex justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">
                    "{review.review_text}"
                  </p>
                  <p className="text-xs font-medium">{review.reviewer_name}</p>
                  <p className="text-xs text-muted-foreground">{review.platform}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Review Call-to-Action */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Had a great experience? We'd love your feedback!</p>
            <div className="flex justify-center gap-3">
              {googleReviewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick('Google', googleReviewUrl)}
                  className="flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Review on Google
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              {trustpilotReviewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewClick('Trustpilot', trustpilotReviewUrl)}
                  className="flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Review on Trustpilot
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Filter Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={selectedTag === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTag('all')}
          >
            All Projects
          </Button>
          {allTags.map(tag => (
            <Button
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      {/* Portfolio Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="p-0 relative">
                <div 
                  className="aspect-video bg-muted cursor-pointer relative overflow-hidden"
                  onClick={() => handleMediaClick(item)}
                >
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Media overlay */}
                  {item.media_urls && item.media_urls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      +{item.media_urls.length - 1} more
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {item.description}
                </p>
                
                {/* Tags */}
                {item.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Project Details */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {item.completion_date && (
                    <p>Completed: {new Date(item.completion_date).toLocaleDateString()}</p>
                  )}
                  {item.budget_range && (
                    <p>Budget: {item.budget_range}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found for the selected category.</p>
        </div>
      )}

      {/* Media Modal */}
      {mediaModal.isOpen && mediaModal.item && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setMediaModal({ isOpen: false, item: null })}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-hidden rounded-lg">
            <img 
              src={mediaModal.item.image_url} 
              alt={mediaModal.item.title}
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};