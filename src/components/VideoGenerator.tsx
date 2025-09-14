import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Video, 
  Upload, 
  Play, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Image,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoGeneratorProps {
  projectId?: string;
  onVideoGenerated?: (videoId: string) => void;
}

interface VideoGeneration {
  id: string;
  project_id: string;
  video_type: string;
  status: string;
  before_image_url?: string;
  after_image_url?: string;
  testimonial_text?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  metadata?: any;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ 
  projectId = "proj456", 
  onVideoGenerated 
}) => {
  const [beforeImage, setBeforeImage] = useState<string>('');
  const [afterImage, setAfterImage] = useState<string>('');
  const [testimonialText, setTestimonialText] = useState<string>('');
  const [videoType, setVideoType] = useState<'before_after' | 'testimonial' | 'progress'>('before_after');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(false);

  // Load existing video generations
  useEffect(() => {
    loadVideoGenerations();
    
    // Set up real-time subscription for status updates
    const subscription = supabase
      .channel('video_generations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'video_generations' 
        }, 
        (payload) => {
          console.log('Video generation update:', payload);
          loadVideoGenerations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadVideoGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading video generations:', error);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      console.error('Error loading video generations:', error);
    }
  };

  /**
   * Generate AI video for project "proj456" using RunwayML
   * Sample call: generateVideo with before/after images and testimonial
   */
  const handleGenerateVideo = async () => {
    if (!beforeImage || !afterImage) {
      toast.error('Please provide both before and after images');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('Generating video for project:', projectId);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate videos');
        return;
      }

      // Call video generation edge function
      const { data, error } = await supabase.functions.invoke('video-generator', {
        body: {
          projectId,
          beforeImageUrl: beforeImage,
          afterImageUrl: afterImage,
          testimonialText: testimonialText.trim() || undefined,
          videoType
        }
      });

      if (error) {
        console.error('Video generation error:', error);
        toast.error('Failed to start video generation');
        return;
      }

      console.log('Video generation started:', data);
      toast.success('Video generation started! You\'ll be notified when it\'s ready.');

      // Log analytics
      await supabase.from('video_analytics').insert({
        user_id: session.user.id,
        video_generation_id: data.videoGenerationId,
        event_type: 'generation_requested',
        event_data: { project_id: projectId, video_type: videoType }
      });

      // Clear form
      setBeforeImage('');
      setAfterImage('');
      setTestimonialText('');
      
      // Reload videos
      await loadVideoGenerations();

      if (onVideoGenerated) {
        onVideoGenerated(data.videoGenerationId);
      }

    } catch (error) {
      console.error('Error generating video:', error);
      toast.error('An error occurred while generating the video');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      case 'processing':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleDownloadVideo = async (videoUrl: string, projectId: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}-before-after-video.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Video downloaded successfully');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            AI Video Generator
          </CardTitle>
          <CardDescription>
            Create stunning before/after videos using AI. Upload your project images and let RunwayML generate professional transformation videos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Video Type</label>
            <div className="flex gap-2">
              {[
                { value: 'before_after', label: 'Before/After', icon: Image },
                { value: 'testimonial', label: 'With Testimonial', icon: MessageSquare },
                { value: 'progress', label: 'Progress Video', icon: Video }
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={videoType === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVideoType(value as any)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Image URLs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Before Image URL</label>
              <Input
                placeholder="https://example.com/before.jpg"
                value={beforeImage}
                onChange={(e) => setBeforeImage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">After Image URL</label>
              <Input
                placeholder="https://example.com/after.jpg"
                value={afterImage}
                onChange={(e) => setAfterImage(e.target.value)}
              />
            </div>
          </div>

          {/* Testimonial Text */}
          {(videoType === 'testimonial' || videoType === 'progress') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {videoType === 'testimonial' ? 'Customer Testimonial' : 'Project Description'}
              </label>
              <Textarea
                placeholder={videoType === 'testimonial' 
                  ? "Amazing work! The transformation exceeded our expectations..." 
                  : "Kitchen renovation with modern appliances and custom cabinetry..."}
                value={testimonialText}
                onChange={(e) => setTestimonialText(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateVideo}
            disabled={isGenerating || !beforeImage || !afterImage}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Generate AI Video
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Videos */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Videos</CardTitle>
          <CardDescription>Your AI-generated before/after videos</CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No videos generated yet</p>
              <p className="text-sm">Create your first AI video above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Project {video.project_id}</h4>
                        <Badge className={getStatusColor(video.status)}>
                          {getStatusIcon(video.status)}
                          <span className="ml-1 capitalize">{video.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {video.video_type.replace('_', ' ')} • {new Date(video.created_at).toLocaleDateString()}
                      </p>
                      {video.testimonial_text && (
                        <p className="text-sm mt-2 italic">"{video.testimonial_text}"</p>
                      )}
                    </div>
                    {video.duration && (
                      <div className="text-sm text-muted-foreground">
                        {video.duration}s
                      </div>
                    )}
                  </div>

                  {/* Progress for processing videos */}
                  {video.status === 'processing' && video.metadata?.progress && (
                    <div className="mb-3">
                      <Progress value={video.metadata.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing: {video.metadata.progress}%
                      </p>
                    </div>
                  )}

                  {/* Error message */}
                  {video.status === 'failed' && video.error_message && (
                    <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {video.error_message}
                    </div>
                  )}

                  {/* Video actions */}
                  <div className="flex gap-2">
                    {video.video_url && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                            <Play className="w-4 h-4 mr-1" />
                            Preview
                          </a>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadVideo(video.video_url!, video.project_id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                    {video.status === 'processing' && (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Processing...
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoGenerator;