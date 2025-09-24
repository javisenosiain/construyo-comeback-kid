import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Image, Share2, Plus, Edit, ExternalLink, Heart, MessageCircle, Users } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
  platform?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  project_url?: string;
  created_at: string;
  category?: string;
}

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  media_urls?: string[];
  scheduled_for?: string;
  posted_at?: string;
  status: string;
  engagement_stats?: any;
}

const MarketingDashboard = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "", customer_name: "" });
  const [newProject, setNewProject] = useState({ title: "", description: "", image_url: "", project_url: "", category: "" });
  const [newPost, setNewPost] = useState({ platform: "twitter", content: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('construyo_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Fetch portfolio projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('project_galleries')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData?.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        image_url: p.thumbnail_url,
        project_url: p.gallery_url,
        created_at: p.created_at,
        category: p.gallery_type
      })) || []);

      // Fetch social posts
      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setSocialPosts(postsData || []);

    } catch (error) {
      console.error('Error fetching marketing data:', error);
      toast.error('Failed to fetch marketing data');
    } finally {
      setLoading(false);
    }
  };

  const addReview = async () => {
    if (!newReview.customer_name.trim() || !newReview.comment.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('construyo_reviews')
        .insert([{
          rating: newReview.rating,
          comment: newReview.comment,
          customer_name: newReview.customer_name,
          status: 'published',
          user_id: auth.uid()
        }]);

      if (error) throw error;
      
      toast.success('Review added successfully');
      setNewReview({ rating: 5, comment: "", customer_name: "" });
      fetchData();
    } catch (error) {
      console.error('Error adding review:', error);
      toast.error('Failed to add review');
    }
  };

  const addProject = async () => {
    if (!newProject.title.trim() || !newProject.description.trim()) {
      toast.error('Please fill in title and description');
      return;
    }

    try {
      const { error } = await supabase
        .from('project_galleries')
        .insert([{
          title: newProject.title,
          description: newProject.description,
          thumbnail_url: newProject.image_url || null,
          gallery_url: newProject.project_url || null,
          gallery_type: newProject.category || 'photo',
          generation_status: 'completed',
          project_id: 'manual-' + Date.now(),
          user_id: auth.uid()
        }]);

      if (error) throw error;
      
      toast.success('Project added successfully');
      setNewProject({ title: "", description: "", image_url: "", project_url: "", category: "" });
      fetchData();
    } catch (error) {
      console.error('Error adding project:', error);
      toast.error('Failed to add project');
    }
  };

  const addSocialPost = async () => {
    if (!newPost.content.trim()) {
      toast.error('Please enter post content');
      return;
    }

    try {
      const { error } = await supabase
        .from('social_posts')
        .insert([{
          platform: newPost.platform,
          content: newPost.content,
          post_type: 'text',
          status: 'draft'
        }]);

      if (error) throw error;
      
      toast.success('Social post saved');
      setNewPost({ platform: "twitter", content: "" });
      fetchData();
    } catch (error) {
      console.error('Error adding social post:', error);
      toast.error('Failed to add social post');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketing</h1>
          <p className="text-muted-foreground">Manage your online presence, reviews, and portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {reviews.length} Reviews
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Image className="h-3 w-3" />
            {projects.length} Projects
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="reviews" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Customer Reviews
              </CardTitle>
              <CardDescription>
                Display and manage customer reviews and testimonials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold">
                    {reviews.length > 0 ? 
                      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 
                      '0.0'
                    }
                  </div>
                  <div className="flex">
                    {renderStars(reviews.length > 0 ? 
                      Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : 
                      0
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ({reviews.length} reviews)
                  </div>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Customer Name</Label>
                        <Input
                          value={newReview.customer_name}
                          onChange={(e) => setNewReview({...newReview, customer_name: e.target.value})}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div>
                        <Label>Rating</Label>
                        <div className="flex gap-1 mt-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setNewReview({...newReview, rating: i + 1})}
                              className="p-1"
                            >
                              <Star
                                className={`h-6 w-6 ${i < newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Review Comment</Label>
                        <Textarea
                          value={newReview.comment}
                          onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                          placeholder="Enter review comment"
                          rows={4}
                        />
                      </div>
                      <Button onClick={addReview} className="w-full">
                        Add Review
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        {review.platform && (
                          <Badge variant="outline" className="text-xs">
                            {review.platform}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">"{review.comment}"</p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{review.customer_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Google Reviews Embed */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Google Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      Google Reviews widget would be embedded here using Google My Business API
                    </p>
                    <Button variant="outline" className="mt-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Google
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Portfolio Projects
              </CardTitle>
              <CardDescription>
                Showcase your work with project galleries and descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Project Title</Label>
                        <Input
                          value={newProject.title}
                          onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                          placeholder="Enter project title"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newProject.description}
                          onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                          placeholder="Describe the project"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Image URL (Optional)</Label>
                        <Input
                          value={newProject.image_url}
                          onChange={(e) => setNewProject({...newProject, image_url: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Project URL (Optional)</Label>
                        <Input
                          value={newProject.project_url}
                          onChange={(e) => setNewProject({...newProject, project_url: e.target.value})}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={newProject.category}
                          onChange={(e) => setNewProject({...newProject, category: e.target.value})}
                          placeholder="e.g., Kitchen, Extension, Bathroom"
                        />
                      </div>
                      <Button onClick={addProject} className="w-full">
                        Add Project
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="overflow-hidden">
                    {project.image_url && (
                      <div className="aspect-video bg-muted/50 relative">
                        <img
                          src={project.image_url}
                          alt={project.title}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{project.title}</h3>
                        {project.category && (
                          <Badge variant="outline" className="text-xs">
                            {project.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          {project.project_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={project.project_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Media Management
              </CardTitle>
              <CardDescription>
                Manage your social media presence and posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Post Creation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <select
                        value={newPost.platform}
                        onChange={(e) => setNewPost({...newPost, platform: e.target.value})}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="twitter">Twitter/X</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Post Content</Label>
                      <Textarea
                        value={newPost.content}
                        onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                        placeholder="What's on your mind?"
                        rows={3}
                      />
                    </div>
                  </div>
                  <Button onClick={addSocialPost}>
                    <Plus className="h-4 w-4 mr-2" />
                    Save Post
                  </Button>
                </CardContent>
              </Card>

              {/* Social Posts List */}
              <div className="space-y-4">
                {socialPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="capitalize">
                          {post.platform}
                        </Badge>
                        <Badge className={`text-xs ${
                          post.status === 'published' ? 'bg-green-100 text-green-800' :
                          post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm mb-3">{post.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          {post.posted_at ? 
                            `Posted ${new Date(post.posted_at).toLocaleDateString()}` :
                            post.scheduled_for ?
                            `Scheduled for ${new Date(post.scheduled_for).toLocaleDateString()}` :
                            `Created ${new Date(post.created_at).toLocaleDateString()}`
                          }
                        </div>
                        {post.engagement_stats && (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {post.engagement_stats.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {post.engagement_stats.comments || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="h-3 w-3" />
                              {post.engagement_stats.shares || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Social Media Embeds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Twitter/X Feed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <p className="text-muted-foreground">
                        Twitter feed widget would be embedded here
                      </p>
                      <Button variant="outline" className="mt-2">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Twitter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">LinkedIn Updates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <p className="text-muted-foreground">
                        LinkedIn feed widget would be embedded here
                      </p>
                      <Button variant="outline" className="mt-2">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on LinkedIn
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingDashboard;