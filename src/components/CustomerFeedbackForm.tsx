import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * CustomerFeedbackForm Component
 * 
 * Public feedback form for customers to submit project feedback.
 * Features:
 * - Rating system (1-5 stars)
 * - Comments field
 * - GDPR consent handling
 * - Input validation
 * - Secure token-based access
 * - Error handling and user feedback
 */

interface FeedbackFormData {
  id: string;
  form_title: string;
  form_description?: string;
  rating_label: string;
  comments_label: string;
  thank_you_message: string;
  gdpr_consent_required: boolean;
  gdpr_consent_text: string;
  zapier_webhook?: string;
}

interface DeliveryLogData {
  id: string;
  form_id: string;
  user_id: string;
  project_id: string;
  customer_name: string;
  customer_email?: string;
  expires_at: string;
}

interface CustomerFeedbackFormProps {
  token: string;
}

export default function CustomerFeedbackForm({ token }: CustomerFeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackFormData | null>(null);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogData | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchFeedbackForm();
    }
  }, [token]);

  /**
   * Fetch feedback form data using the secure token
   */
  const fetchFeedbackForm = async () => {
    try {
      setLoading(true);
      setError("");

      // First, get the delivery log to verify token validity
      const { data: deliveryData, error: deliveryError } = await supabase
        .from("feedback_delivery_logs")
        .select("*")
        .eq("response_token", token)
        .single();

      if (deliveryError) {
        throw new Error("Invalid or expired feedback link");
      }

      // Check if token is expired
      if (new Date(deliveryData.expires_at) < new Date()) {
        throw new Error("This feedback link has expired");
      }

      // Check if already responded
      const { data: existingResponse } = await supabase
        .from("feedback_responses")
        .select("id")
        .eq("response_token", token)
        .single();

      if (existingResponse) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      setDeliveryLog(deliveryData);
      setCustomerEmail(deliveryData.customer_email || "");

      // Get the form configuration
      const { data: formConfigData, error: formError } = await supabase
        .from("feedback_forms")
        .select("*")
        .eq("id", deliveryData.form_id)
        .single();

      if (formError) {
        throw new Error("Feedback form not found");
      }

      setFormData(formConfigData);
    } catch (error) {
      console.error("Error fetching feedback form:", error);
      setError(error instanceof Error ? error.message : "Failed to load feedback form");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate form input before submission
   */
  const validateForm = (): string | null => {
    if (rating < 1 || rating > 5) {
      return "Please select a rating between 1 and 5 stars";
    }

    if (formData?.gdpr_consent_required && !gdprConsent) {
      return "Please provide GDPR consent to submit your feedback";
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return "Please enter a valid email address";
    }

    return null;
  };

  /**
   * Submit feedback response with comprehensive error handling
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deliveryLog || !formData) {
      toast({
        title: "Error",
        description: "Form data not available",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Get client IP and user agent for audit logging
      const clientIP = await fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => data.ip)
        .catch(() => null);

      const userAgent = navigator.userAgent;

      // Submit feedback response
      const { error: submitError } = await supabase
        .from("feedback_responses")
        .insert([{
          form_id: deliveryLog.form_id || formData.id,
          user_id: deliveryLog.user_id,
          project_id: deliveryLog.project_id,
          customer_name: deliveryLog.customer_name,
          customer_email: customerEmail || deliveryLog.customer_email,
          rating,
          comments: comments.trim() || null,
          gdpr_consent: formData.gdpr_consent_required ? gdprConsent : true,
          submission_ip: clientIP,
          submission_user_agent: userAgent,
          response_token: token,
          expires_at: deliveryLog.expires_at,
        }]);

      if (submitError) {
        throw submitError;
      }

      // Update delivery log status
      await supabase
        .from("feedback_delivery_logs")
        .update({
          delivery_status: "responded",
          responded_at: new Date().toISOString(),
        })
        .eq("response_token", token);

      // Trigger Zapier webhook if configured
      if (formData.zapier_webhook) {
        try {
          await fetch(formData.zapier_webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "no-cors",
            body: JSON.stringify({
              project_id: deliveryLog.project_id,
              customer_name: deliveryLog.customer_name,
              customer_email: customerEmail || deliveryLog.customer_email,
              rating,
              comments: comments.trim(),
              submitted_at: new Date().toISOString(),
              gdpr_consent: gdprConsent,
            }),
          });
        } catch (zapierError) {
          console.warn("Zapier webhook failed:", zapierError);
          // Don't fail the submission if Zapier fails
        }
      }

      setSubmitted(true);
      toast({
        title: "Success",
        description: formData.thank_you_message,
      });

    } catch (error) {
      console.error("Error submitting feedback:", error);
      setError("Failed to submit feedback. Please try again.");
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
              <p className="text-muted-foreground">
                {formData?.thank_you_message || "Your feedback has been submitted successfully."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formData || !deliveryLog) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Form Not Available</h3>
              <p className="text-muted-foreground">
                This feedback form is not available or has expired.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{formData.form_title}</CardTitle>
          {formData.form_description && (
            <CardDescription>{formData.form_description}</CardDescription>
          )}
          <div className="text-sm text-muted-foreground">
            Project: <span className="font-medium">{deliveryLog.project_id}</span> •{" "}
            Customer: <span className="font-medium">{deliveryLog.customer_name}</span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Section */}
            <div className="space-y-2">
              <Label className="text-base font-medium">{formData.rating_label}</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm font-medium">{rating} out of 5</span>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-base font-medium">
                {formData.comments_label}
              </Label>
              <Textarea
                id="comments"
                placeholder="Please share your thoughts about the project..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Email Section (optional update) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium">
                Email Address (optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Update your email if needed for follow-up communication
              </p>
            </div>

            {/* GDPR Consent */}
            {formData.gdpr_consent_required && (
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="gdpr-consent"
                    checked={gdprConsent}
                    onCheckedChange={(checked) => setGdprConsent(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="gdpr-consent" className="text-sm leading-normal">
                    {formData.gdpr_consent_text}
                  </Label>
                </div>
                <Alert>
                  <AlertDescription className="text-xs">
                    <strong>Privacy Notice:</strong> Your feedback is collected to improve our services. 
                    We handle your data in accordance with GDPR regulations. You can request data 
                    deletion at any time by contacting us.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || rating === 0 || (formData.gdpr_consent_required && !gdprConsent)}
              className="w-full"
              size="lg"
            >
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>

            {/* Form Validation Messages */}
            {rating === 0 && (
              <p className="text-sm text-red-600">Please select a rating to continue</p>
            )}
            {formData.gdpr_consent_required && !gdprConsent && (
              <p className="text-sm text-red-600">GDPR consent is required to submit feedback</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}