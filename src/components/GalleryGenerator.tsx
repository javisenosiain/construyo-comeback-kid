import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Camera, 
  Video, 
  Image, 
  Download, 
  Share2, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

interface ProjectGallery {
  id: string;
  project_id: string;
  gallery_type: string;
  title: string;
  description: string;
  media_count: number;
  generation_status: string;
  gallery_url: string;
  thumbnail_url: string;
  processing_time_seconds: number;
  created_at: string;
  completed_at: string;
  error_message: string;
}

interface GenerateGalleryConfig {
  maxImages?: number;
  videoLength?: number;
  style?: string;
  includeText?: boolean;
}

export default function GalleryGenerator() {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState<ProjectGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("proj123");

  // Sample call configuration for project "proj123"
  const sampleConfig: GenerateGalleryConfig = {
    maxImages: 15,
    videoLength: 45,
    style: "professional",
    includeText: true
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_galleries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleries(data || []);
    } catch (error) {
      console.error('Error fetching galleries:', error);
      toast.error('Failed to load galleries');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate a gallery for the specified project
   * Sample call for project ID "proj123"
   */
  const generateGallery = async (
    projectId: string = "proj123", 
    galleryType: 'photo' | 'video' | 'mixed' = 'photo',
    config: GenerateGalleryConfig = sampleConfig
  ) => {
    try {
      setGenerating(`${projectId}-${galleryType}`);
      
      console.log(`🎬 Starting gallery generation for project: ${projectId}`);
      console.log(`📊 Configuration:`, config);
      
      // Call the gallery generation edge function
      const { data, error } = await supabase.functions.invoke('gallery-generator', {
        body: {
          projectId,
          galleryType,
          title: `${galleryType.charAt(0).toUpperCase() + galleryType.slice(1)} Gallery - Project ${projectId}`,
          description: `Auto-generated ${galleryType} showcase from project timeline`,
          config
        }
      });

      if (error) {
        console.error('Gallery generation error:', error);
        throw error;
      }

      console.log('✅ Gallery generation response:', data);
      
      toast.success(`${galleryType} gallery generated successfully!`, {
        description: `Processed ${data.mediaCount} files in ${data.processingTime}s`
      });

      // Refresh the galleries list
      await fetchGalleries();
      
      // Log analytics for successful generation
      if (user) {
        await supabase
          .from('gallery_analytics')
          .insert({
            user_id: user.id,
            gallery_id: data.galleryId,
            event_type: 'generation_triggered',
            event_data: {
              project_id: projectId,
              gallery_type: galleryType,
              config: config as any
            }
          });
      }

    } catch (error) {
      console.error('Error generating gallery:', error);
      toast.error('Failed to generate gallery', {
        description: error.message || 'Please try again later'
      });
    } finally {
      setGenerating(null);
    }
  };

  const trackGalleryView = async (galleryId: string) => {
    try {
      if (user) {
        await supabase
          .from('gallery_analytics')
          .insert({
            user_id: user.id,
            gallery_id: galleryId,
            event_type: 'view',
            event_data: { timestamp: new Date().toISOString() }
          });
      }
    } catch (error) {
      console.error('Error tracking gallery view:', error);
    }
  };

  const downloadGallery = async (gallery: ProjectGallery) => {
    try {
      trackGalleryView(gallery.id);
      
      if (gallery.gallery_url) {
        window.open(gallery.gallery_url, '_blank');
        
        if (user) {
          await supabase
            .from('gallery_analytics')
            .insert({
              user_id: user.id,
              gallery_id: gallery.id,
              event_type: 'download',
              event_data: { url: gallery.gallery_url }
            });
        }
      }
    } catch (error) {
      console.error('Error downloading gallery:', error);
      toast.error('Failed to download gallery');
    }
  };

  const shareGallery = async (gallery: ProjectGallery) => {
    try {
      if (navigator.share && gallery.gallery_url) {
        await navigator.share({
          title: gallery.title,
          text: gallery.description,
          url: gallery.gallery_url,
        });
        
        if (user) {
          await supabase
            .from('gallery_analytics')
            .insert({
              user_id: user.id,
              gallery_id: gallery.id,
              event_type: 'share',
              event_data: { method: 'native_share' }
            });
        }
      } else if (gallery.gallery_url) {
        await navigator.clipboard.writeText(gallery.gallery_url);
        toast.success('Gallery link copied to clipboard');
        
        if (user) {
          await supabase
            .from('gallery_analytics')
            .insert({
              user_id: user.id,
              gallery_id: gallery.id,
              event_type: 'share',
              event_data: { method: 'clipboard' }
            });
        }
      }
    } catch (error) {
      console.error('Error sharing gallery:', error);
      toast.error('Failed to share gallery');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'photo':
        return <Camera className="h-4 w-4" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading galleries...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Portfolio Generator</h1>
          <p className="text-muted-foreground">
            Auto-generate stunning photo and video galleries from your project timelines
          </p>
        </div>
      </div>

      {/* Quick Actions - Sample Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Quick Gallery Generation
          </CardTitle>
          <CardDescription>
            Generate galleries for project "proj123" with AI-powered organization and captions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => generateGallery("proj123", "photo", sampleConfig)}
              disabled={generating === "proj123-photo"}
              className="h-auto p-4 flex flex-row items-start gap-2"
            >
              {generating === "proj123-photo" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Photo Gallery</div>
                <div className="text-sm opacity-80">Organize timeline photos</div>
              </div>
            </Button>

            <Button 
              onClick={() => generateGallery("proj123", "video", sampleConfig)}
              disabled={generating === "proj123-video"}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              {generating === "proj123-video" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Video className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Video Compilation</div>
                <div className="text-sm opacity-80">Create timeline video</div>
              </div>
            </Button>

            <Button 
              onClick={() => generateGallery("proj123", "mixed", sampleConfig)}
              disabled={generating === "proj123-mixed"}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
            >
              {generating === "proj123-mixed" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Image className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Mixed Gallery</div>
                <div className="text-sm opacity-80">Photos + videos</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Galleries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleries.map((gallery) => (
          <Card key={gallery.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {gallery.thumbnail_url ? (
                <img 
                  src={gallery.thumbnail_url} 
                  alt={gallery.title}
                  className="w-full h-full object-cover"
                  onClick={() => trackGalleryView(gallery.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getTypeIcon(gallery.gallery_type)}
                </div>
              )}
              
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {getTypeIcon(gallery.gallery_type)}
                  <span className="ml-1">{gallery.gallery_type}</span>
                </Badge>
                <Badge 
                  variant={gallery.generation_status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {getStatusIcon(gallery.generation_status)}
                  <span className="ml-1">{gallery.generation_status}</span>
                </Badge>
              </div>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-1">{gallery.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {gallery.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{gallery.media_count} files</span>
                <span>Project: {gallery.project_id}</span>
              </div>

              {gallery.generation_status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={65} className="h-2" />
                  <p className="text-sm text-muted-foreground">Generating gallery...</p>
                </div>
              )}

              {gallery.generation_status === 'failed' && (
                <div className="text-sm text-red-600">
                  {gallery.error_message || 'Generation failed'}
                </div>
              )}

              {gallery.generation_status === 'completed' && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => downloadGallery(gallery)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => shareGallery(gallery)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {gallery.completed_at ? (
                  <>Generated in {gallery.processing_time_seconds}s • {new Date(gallery.completed_at).toLocaleDateString()}</>
                ) : (
                  <>Created {new Date(gallery.created_at).toLocaleDateString()}</>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {galleries.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No galleries yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first project gallery using AI-powered timeline organization
            </p>
            <Button onClick={() => generateGallery()}>
              <Camera className="h-4 w-4 mr-2" />
              Generate Sample Gallery
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}