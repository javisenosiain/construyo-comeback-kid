import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Resolution Page Component
 * 
 * Public page for customers to respond to negative feedback resolution requests.
 * Accessed via secure token from email/WhatsApp links.
 * Features:
 * - Token-based secure access
 * - Resolution form submission
 * - GDPR-compliant data handling
 * - User-friendly interface
 */

interface ResolutionData {
  id: string;
  project_id: string;
  customer_name: string;
  resolution_status: string;
  token_expires_at: string;
  feedback_response_id: string;
}

const Resolution: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [resolutionData, setResolutionData] = useState<ResolutionData | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadResolutionData();
    }
  }, [token]);

  const loadResolutionData = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_resolutions')
        .select('*')
        .eq('resolution_token', token)
        .single();

      if (error) {
        console.error('Error loading resolution data:', error);
        setError('Invalid or expired resolution link');
        return;
      }

      if (!data) {
        setError('Resolution request not found');
        return;
      }

      // Check if token has expired
      if (new Date(data.token_expires_at) < new Date()) {
        setError('This resolution link has expired');
        return;
      }

      // Check if already resolved
      if (data.resolution_status === 'resolved') {
        setIsSubmitted(true);
      }

      setResolutionData(data);
    } catch (error) {
      console.error('Error loading resolution data:', error);
      setError('Failed to load resolution data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResolution = async () => {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide your feedback before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('negative-feedback-diversion/resolve', {
        body: {
          resolution_token: token,
          resolution_notes: resolutionNotes,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully. We'll take action to address your concerns.",
      });

    } catch (error: any) {
      console.error('Error submitting resolution:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit resolution feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading resolution form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Access Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>If you believe this is an error, please contact our support team.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Thank You!</CardTitle>
            <CardDescription>
              Your feedback has been received and we're taking action
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <AlertDescription>
                We appreciate you taking the time to help us improve. 
                Our team will review your feedback and take appropriate action.
              </AlertDescription>
            </Alert>
            
            <div className="text-sm text-muted-foreground">
              <p>Project: <strong>{resolutionData?.project_id}</strong></p>
              <p>Customer: <strong>{resolutionData?.customer_name}</strong></p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">What happens next?</p>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Our team will review your concerns</li>
                <li>• We'll implement corrective measures</li>
                <li>• You may receive a follow-up call</li>
                <li>• We'll work to regain your trust</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6 text-yellow-400 fill-current"
                />
              ))}
            </div>
          </div>
          <CardTitle className="text-2xl">We Want to Make This Right</CardTitle>
          <CardDescription>
            Help us understand how we can improve your experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              We noticed you weren't completely satisfied with your recent project. 
              Your feedback is important to us, and we want to address any concerns immediately.
            </AlertDescription>
          </Alert>

          {resolutionData && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="font-medium">Project Details</div>
              <div className="text-sm text-muted-foreground">
                <p>Project ID: <strong>{resolutionData.project_id}</strong></p>
                <p>Customer: <strong>{resolutionData.customer_name}</strong></p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">
                Please tell us what went wrong and how we can make it right:
              </Label>
              <Textarea
                id="resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Please describe:
• What specific issues did you encounter?
• How did this impact you?
• What would you like us to do to resolve this?
• How can we prevent this in the future?"
                rows={8}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSubmitResolution}
              disabled={isSubmitting || !resolutionNotes.trim()}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Your Privacy Matters</p>
              <ul className="space-y-1">
                <li>• Your feedback is confidential and GDPR-compliant</li>
                <li>• We use this information solely to improve our services</li>
                <li>• This secure link expires after 7 days</li>
                <li>• Contact us anytime to update or delete your data</li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                This is a secure, encrypted form. Your information is protected and will only be used to address your concerns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Resolution;