import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Instagram, Facebook, Zap, Palette, Clock, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchedulerProps {
  projectId?: string;
  onPostScheduled?: (postId: string) => void;
}

/**
 * Social Media Scheduler Component
 * 
 * Integrates with Zapier, Canva, and Buffer to schedule Instagram/Facebook posts
 * Features:
 * - Pull project galleries from CRM
 * - Create graphics with Canva integration
 * - Schedule via Buffer API
 * - Zapier workflow triggers
 * - Analytics logging
 */
const SocialMediaScheduler = ({ projectId = "proj123", onPostScheduled }: SchedulerProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [zapierWebhook, setZapierWebhook] = useState("");

  const handleSchedulePost = async () => {
    if (!user) {
      toast.error("Please log in to schedule posts");
      return;
    }

    if (!platform) {
      toast.error("Please select a platform");
      return;
    }

    if (scheduleType === "scheduled" && !scheduledDateTime) {
      toast.error("Please select a date and time for scheduling");
      return;
    }

    setIsLoading(true);

    try {
      // Call the social media scheduler edge function
      const { data, error } = await supabase.functions.invoke('social-media-scheduler', {
        body: {
          projectId,
          platform,
          scheduleType,
          scheduledFor: scheduleType === "scheduled" ? scheduledDateTime : null,
          customCaption: customCaption || null,
          zapierWebhook: zapierWebhook || null
        }
      });

      if (error) {
        console.error('Scheduling error:', error);
        throw new Error(error.message || 'Failed to schedule post');
      }

      if (data?.success) {
        toast.success(
          data.status === 'scheduled' 
            ? "Post scheduled successfully!" 
            : "Post created as draft - please configure Buffer integration"
        );
        
        // Reset form
        setPlatform("");
        setCustomCaption("");
        setScheduledDateTime("");
        
        // Notify parent component
        if (onPostScheduled) {
          onPostScheduled(data.postId);
        }
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Schedule post error:', error);
      toast.error(error.message || "Failed to schedule post");
    } finally {
      setIsLoading(false);
    }
  };

  // Sample call example for project "proj123"
  const handleSampleCall = async () => {
    setIsLoading(true);
    try {
      const sampleData = {
        projectId: "proj123",
        platform: "instagram",
        scheduleType: "now",
        customCaption: "🏗️ Another beautiful kitchen renovation completed! From outdated to outstanding - transforming homes one project at a time. Contact us for your dream renovation! #kitchenrenovation #construction #homeimprovement #renovation",
        zapierWebhook: zapierWebhook || undefined
      };

      const { data, error } = await supabase.functions.invoke('social-media-scheduler', {
        body: sampleData
      });

      if (error) throw error;

      toast.success("Sample post scheduled for project proj123!");
      console.log("Sample call result:", data);
    } catch (error: any) {
      toast.error("Sample call failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Scheduler Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Schedule Social Media Post
          </CardTitle>
          <CardDescription>
            Auto-generate and schedule Instagram/Facebook posts from your project galleries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project ID Display */}
          <div>
            <label className="text-sm font-medium mb-2 block">Project ID</label>
            <Input value={projectId} disabled className="bg-muted" />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Platform</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </div>
                </SelectItem>
                <SelectItem value="facebook">
                  <div className="flex items-center gap-2">
                    <Facebook className="w-4 h-4" />
                    Facebook
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Caption */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Custom Caption <span className="text-muted-foreground">(optional - AI will generate if empty)</span>
            </label>
            <Textarea
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Enter custom caption or leave empty for AI-generated content..."
              className="min-h-[100px]"
            />
          </div>

          {/* Schedule Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Schedule</label>
            <div className="flex gap-2 mb-3">
              <Button
                variant={scheduleType === "now" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("now")}
              >
                <Send className="w-4 h-4 mr-2" />
                Post Now
              </Button>
              <Button
                variant={scheduleType === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => setScheduleType("scheduled")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Later
              </Button>
            </div>

            {scheduleType === "scheduled" && (
              <Input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>

          {/* Zapier Webhook */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Zapier Webhook URL <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={zapierWebhook}
              onChange={(e) => setZapierWebhook(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSchedulePost}
              disabled={isLoading || !platform}
              className="flex-1"
            >
              {isLoading ? "Scheduling..." : "Schedule Post"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSampleCall}
              disabled={isLoading}
            >
              Test with proj123
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Canva Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-2">
              API Ready
            </Badge>
            <p className="text-xs text-muted-foreground">
              Automatically creates branded graphics from project images
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Buffer Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-2">
              API Ready
            </Badge>
            <p className="text-xs text-muted-foreground">
              Schedule posts across multiple social platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Zapier Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-2">
              Webhook Ready
            </Badge>
            <p className="text-xs text-muted-foreground">
              Trigger custom automation workflows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sample Usage Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Sample Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Example Call:</strong> Schedule post for project "proj123"</p>
          <p><strong>Process:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Pull project gallery/media from CRM database</li>
            <li>Generate AI-powered captions using OpenAI</li>
            <li>Create branded graphics via Canva API</li>
            <li>Schedule posts through Buffer API</li>
            <li>Trigger Zapier workflows for additional automation</li>
            <li>Log analytics and engagement metrics</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaScheduler;