import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SocialMediaScheduler from "@/components/SocialMediaScheduler";
import { 
  Instagram, 
  Facebook, 
  Calendar,
  Image,
  Video,
  Zap,
  Eye,
  Heart,
  MessageCircle,
  Share,
  Send
} from "lucide-react";

const SocialMedia = () => {
  const scheduledPosts = [
    {
      id: 1,
      project: "Kitchen Extension - Johnson Residence",
      platform: "Instagram",
      type: "Before/After",
      scheduledFor: "2024-01-20T10:00",
      status: "scheduled",
      engagement: null
    },
    {
      id: 2,
      project: "Bathroom Renovation - Chen Property",
      platform: "Facebook",
      type: "Progress Video",
      scheduledFor: "2024-01-18T15:30",
      status: "posted",
      engagement: { likes: 24, comments: 5, shares: 2 }
    },
    {
      id: 3,
      project: "Loft Conversion - Williams Home",
      platform: "Instagram",
      type: "Photo Gallery",
      scheduledFor: "2024-01-22T09:00",
      status: "draft",
      engagement: null
    }
  ];

  const automationRules = [
    {
      trigger: "Project Completion",
      action: "Post before/after photos to Instagram",
      enabled: true
    },
    {
      trigger: "Milestone Reached",
      action: "Share progress video on Facebook",
      enabled: true
    },
    {
      trigger: "5-Star Review Received",
      action: "Share customer testimonial",
      enabled: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "posted": return "bg-success text-success-foreground";
      case "scheduled": return "bg-accent text-accent-foreground";
      case "draft": return "bg-secondary text-secondary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Instagram": return Instagram;
      case "Facebook": return Facebook;
      default: return Instagram;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Social Media Automation</h1>
            <p className="text-muted-foreground">Showcase your work and build your brand automatically</p>
          </div>
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Post
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">12,450</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">8.2%</div>
              <p className="text-xs text-muted-foreground">+1.4% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Posts This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">18 automated</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New Followers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">+186</div>
              <p className="text-xs text-muted-foreground">+12% growth rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="posts">Recent Posts</TabsTrigger>
            <TabsTrigger value="scheduler">
              <Send className="w-4 h-4 mr-2" />
              Post Scheduler
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Scheduled Posts */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled & Recent Posts</CardTitle>
                    <CardDescription>Automated content based on your project milestones</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {scheduledPosts.map((post) => {
                      const PlatformIcon = getPlatformIcon(post.platform);
                      return (
                        <div key={post.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                                <PlatformIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{post.project}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getStatusColor(post.status)}>
                                    {post.status}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {post.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm">
                                {new Date(post.scheduledFor).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(post.scheduledFor).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>

                          {post.engagement && (
                            <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                {post.engagement.likes}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                {post.engagement.comments}
                              </div>
                              <div className="flex items-center gap-1">
                                <Share className="w-4 h-4" />
                                {post.engagement.shares}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{post.platform}</span>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              {post.status === "draft" && (
                                <Button size="sm">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Schedule
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Automation Settings */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Automation Rules
                    </CardTitle>
                    <CardDescription>
                      Automatically post content based on project events
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {automationRules.map((rule, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{rule.trigger}</p>
                            <p className="text-xs text-muted-foreground">{rule.action}</p>
                          </div>
                          <Switch checked={rule.enabled} />
                        </div>
                        {index < automationRules.length - 1 && <hr />}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Content Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Content Templates</CardTitle>
                    <CardDescription>
                      AI-generated captions and content formats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <span className="text-sm">Before/After Photos</span>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <span className="text-sm">Progress Videos</span>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">Customer Testimonials</span>
                      </div>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Connections */}
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4" />
                        <span className="text-sm">Instagram Business</span>
                      </div>
                      <Badge className="bg-success text-success-foreground">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4" />
                        <span className="text-sm">Facebook Page</span>
                      </div>
                      <Badge className="bg-success text-success-foreground">Connected</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Zap className="w-4 h-4 mr-2" />
                      Connect More Platforms
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scheduler" className="mt-6">
            <SocialMediaScheduler 
              projectId="proj123"
              onPostScheduled={(postId) => {
                console.log('Post scheduled:', postId);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SocialMedia;