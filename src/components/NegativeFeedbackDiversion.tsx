import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Send, BarChart3, Clock, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * NegativeFeedbackDiversion Component
 * 
 * Manages negative feedback diversion for resolution with the following features:
 * - Detect feedback ratings <4 automatically
 * - Send resolution messages via email/WhatsApp
 * - Track resolution attempts and outcomes
 * - Monitor and analytics dashboard
 * - GDPR-compliant data handling
 */

interface FeedbackResponse {
  id: string;
  project_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  rating: number;
  comments?: string;
  submitted_at: string;
}

interface FeedbackResolution {
  id: string;
  feedback_response_id: string;
  project_id: string;
  customer_name: string;
  resolution_status: string;
  delivery_method: string;
  initiated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

const NegativeFeedbackDiversion: React.FC = () => {
  const [negativeFeedback, setNegativeFeedback] = useState<FeedbackResponse[]>([]);
  const [resolutions, setResolutions] = useState<FeedbackResolution[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'whatsapp'>('email');
  const [customMessage, setCustomMessage] = useState("");
  const [autoMonitoring, setAutoMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalNegative: 0,
    pendingResolutions: 0,
    resolvedCount: 0,
    avgResolutionTime: 0,
  });
  const { toast } = useToast();

  // Load negative feedback and resolutions
  useEffect(() => {
    loadNegativeFeedback();
    loadResolutions();
    loadStats();
  }, []);

  // Auto-monitoring interval
  useEffect(() => {
    if (autoMonitoring) {
      const interval = setInterval(() => {
        handleMonitorNegativeFeedback();
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoMonitoring]);

  const loadNegativeFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_responses')
        .select('*')
        .lt('rating', 4)
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNegativeFeedback(data || []);
    } catch (error) {
      console.error('Error loading negative feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load negative feedback",
        variant: "destructive",
      });
    }
  };

  const loadResolutions = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_resolutions')
        .select('*')
        .order('initiated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setResolutions(data || []);
    } catch (error) {
      console.error('Error loading resolutions:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Get total negative feedback count
      const { count: totalNegative } = await supabase
        .from('feedback_responses')
        .select('*', { count: 'exact', head: true })
        .lt('rating', 4);

      // Get pending resolutions
      const { count: pendingResolutions } = await supabase
        .from('feedback_resolutions')
        .select('*', { count: 'exact', head: true })
        .eq('resolution_status', 'pending');

      // Get resolved count
      const { count: resolvedCount } = await supabase
        .from('feedback_resolutions')
        .select('*', { count: 'exact', head: true })
        .eq('resolution_status', 'resolved');

      setStats({
        totalNegative: totalNegative || 0,
        pendingResolutions: pendingResolutions || 0,
        resolvedCount: resolvedCount || 0,
        avgResolutionTime: 0, // Calculate if needed
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleProcessFeedback = async () => {
    if (!selectedFeedback) {
      toast({
        title: "Error",
        description: "Please select a feedback response to process",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('negative-feedback-diversion/process', {
        body: {
          feedback_response_id: selectedFeedback,
          delivery_method: deliveryMethod,
          custom_message: customMessage || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Resolution message sent successfully via ${deliveryMethod}`,
      });

      // Refresh data
      loadResolutions();
      setSelectedFeedback("");
      setCustomMessage("");
      
    } catch (error: any) {
      console.error('Error processing feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process negative feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonitorNegativeFeedback = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('negative-feedback-diversion/monitor');

      if (error) throw error;

      if (data.processed && data.processed.length > 0) {
        toast({
          title: "Auto-Monitor",
          description: `Processed ${data.processed.length} negative feedback responses`,
        });
        
        // Refresh data
        loadNegativeFeedback();
        loadResolutions();
        loadStats();
      }
      
    } catch (error: any) {
      console.error('Error monitoring feedback:', error);
      toast({
        title: "Monitor Error",
        description: error.message || "Failed to monitor negative feedback",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'sent':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'sent':
        return 'text-blue-600 bg-blue-50';
      case 'resolved':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Negative Feedback Diversion</h2>
          <p className="text-muted-foreground">
            Automatically detect and resolve negative customer feedback
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-monitoring"
              checked={autoMonitoring}
              onCheckedChange={setAutoMonitoring}
            />
            <Label htmlFor="auto-monitoring">Auto Monitor</Label>
          </div>
          <Button
            onClick={handleMonitorNegativeFeedback}
            variant="outline"
            size="sm"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Check Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Negative</p>
                <p className="text-2xl font-bold">{stats.totalNegative}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingResolutions}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats.totalNegative > 0 
                    ? Math.round((stats.resolvedCount / stats.totalNegative) * 100)
                    : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="process" className="space-y-4">
        <TabsList>
          <TabsTrigger value="process">Process Feedback</TabsTrigger>
          <TabsTrigger value="monitor">Monitor & Track</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Negative Feedback</CardTitle>
              <CardDescription>
                Send resolution messages for specific negative feedback responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-select">Select Feedback Response</Label>
                <Select value={selectedFeedback} onValueChange={setSelectedFeedback}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose negative feedback to process..." />
                  </SelectTrigger>
                  <SelectContent>
                    {negativeFeedback.map((feedback) => (
                      <SelectItem key={feedback.id} value={feedback.id}>
                        {feedback.project_id} - {feedback.customer_name} ({feedback.rating}/5)
                        {feedback.comments && ` - "${feedback.comments.substring(0, 50)}..."`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-method">Delivery Method</Label>
                <Select value={deliveryMethod} onValueChange={(value: 'email' | 'whatsapp') => setDeliveryMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personalized message to the resolution email/WhatsApp..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleProcessFeedback}
                disabled={isLoading || !selectedFeedback}
                className="w-full"
              >
                {isLoading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Resolution Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Negative Feedback</CardTitle>
              <CardDescription>
                All feedback responses with ratings below 4/5
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {negativeFeedback.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No negative feedback found. Great job!
                    </AlertDescription>
                  </Alert>
                ) : (
                  negativeFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {feedback.customer_name} - Project {feedback.project_id}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                            {feedback.rating}/5
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(feedback.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {feedback.comments && (
                        <p className="text-sm text-muted-foreground">
                          "{feedback.comments}"
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Contact: {feedback.customer_email || feedback.customer_phone || 'No contact info'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution Tracking</CardTitle>
              <CardDescription>
                Track all resolution attempts and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resolutions.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No resolution attempts found.
                    </AlertDescription>
                  </Alert>
                ) : (
                  resolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {resolution.customer_name} - Project {resolution.project_id}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(resolution.resolution_status)}
                          <span className={`text-sm px-2 py-1 rounded ${getStatusColor(resolution.resolution_status)}`}>
                            {resolution.resolution_status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Initiated: {new Date(resolution.initiated_at).toLocaleDateString()} via {resolution.delivery_method}
                      </div>
                      {resolution.resolved_at && (
                        <div className="text-sm text-muted-foreground">
                          Resolved: {new Date(resolution.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                      {resolution.resolution_notes && (
                        <p className="text-sm">
                          Notes: {resolution.resolution_notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolution Analytics</CardTitle>
              <CardDescription>
                Performance metrics for negative feedback resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Analytics dashboard coming soon! This will show resolution rates, response times, and customer satisfaction improvements.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NegativeFeedbackDiversion;