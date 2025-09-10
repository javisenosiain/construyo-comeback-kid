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
import { Plus, Edit, Trash2, Send, Star, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * FeedbackFormManager Component
 * 
 * Manages post-project customer feedback forms with the following features:
 * - Create and customize feedback forms
 * - Send forms via email/WhatsApp after project completion
 * - Store responses with GDPR compliance
 * - Zapier integration for Google Sheets sync
 * - Analytics and delivery tracking
 */

interface FeedbackForm {
  id: string;
  form_name: string;
  form_title: string;
  form_description?: string;
  rating_label: string;
  comments_label: string;
  thank_you_message: string;
  is_active: boolean;
  zapier_webhook?: string;
  google_sheets_sync: boolean;
  gdpr_consent_required: boolean;
  gdpr_consent_text: string;
  created_at: string;
  updated_at: string;
}

interface FeedbackResponse {
  id: string;
  project_id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comments?: string;
  submitted_at: string;
  gdpr_consent: boolean;
}

interface DeliveryLog {
  id: string;
  project_id: string;
  customer_name: string;
  delivery_method: string;
  delivery_status: string;
  sent_at?: string;
  responded_at?: string;
  created_at: string;
}

export default function FeedbackFormManager() {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [selectedForm, setSelectedForm] = useState<FeedbackForm | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isSendFormOpen, setIsSendFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing forms
  const [formData, setFormData] = useState({
    form_name: "",
    form_title: "Project Feedback",
    form_description: "",
    rating_label: "Overall Rating",
    comments_label: "Comments",
    thank_you_message: "Thank you for your feedback!",
    zapier_webhook: "",
    google_sheets_sync: false,
    gdpr_consent_required: true,
    gdpr_consent_text: "I consent to my data being processed for feedback purposes.",
  });

  // Form state for sending feedback forms
  const [sendFormData, setSendFormData] = useState({
    project_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    delivery_method: "email",
  });

  useEffect(() => {
    fetchForms();
    fetchResponses();
    fetchDeliveryLogs();
  }, []);

  /**
   * Fetch all feedback forms for the current user
   */
  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_forms")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch feedback forms",
        variant: "destructive",
      });
    }
  };

  /**
   * Fetch feedback responses with analytics
   */
  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_responses")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch feedback responses",
        variant: "destructive",
      });
    }
  };

  /**
   * Fetch delivery logs for tracking sent forms
   */
  const fetchDeliveryLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback_delivery_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeliveryLogs(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch delivery logs",
        variant: "destructive",
      });
    }
  };

  /**
   * Create or update a feedback form
   */
  const handleSaveForm = async () => {
    try {
      setLoading(true);
      
      if (selectedForm) {
        // Update existing form
        const { error } = await supabase
          .from("feedback_forms")
          .update(formData)
          .eq("id", selectedForm.id);

        if (error) throw error;
        toast({ title: "Success", description: "Feedback form updated successfully" });
      } else {
        // Create new form
        const { error } = await supabase
          .from("feedback_forms")
          .insert([{ ...formData, user_id: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        toast({ title: "Success", description: "Feedback form created successfully" });
      }

      setIsCreateFormOpen(false);
      setSelectedForm(null);
      resetFormData();
      fetchForms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save feedback form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send feedback form to customer via email/WhatsApp
   * Example call: sendFeedbackForm("proj456", "John Doe", "john@example.com", "", "email")
   */
  const handleSendFeedbackForm = async () => {
    try {
      setLoading(true);

      if (!forms.length) {
        toast({
          title: "Error", 
          description: "Please create a feedback form first",
          variant: "destructive",
        });
        return;
      }

      // Use the first active form or create a default one
      const activeForm = forms.find(f => f.is_active) || forms[0];

      const payload = {
        form_id: activeForm.id,
        project_id: sendFormData.project_id,
        customer_name: sendFormData.customer_name,
        customer_email: sendFormData.customer_email,
        customer_phone: sendFormData.customer_phone,
        delivery_method: sendFormData.delivery_method,
      };

      const { data, error } = await supabase.functions.invoke("feedback-sender", {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Feedback form sent successfully via ${sendFormData.delivery_method}`,
      });

      setIsSendFormOpen(false);
      resetSendFormData();
      fetchDeliveryLogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send feedback form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a feedback form
   */
  const handleDeleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from("feedback_forms")
        .delete()
        .eq("id", formId);

      if (error) throw error;

      toast({ title: "Success", description: "Feedback form deleted successfully" });
      fetchForms();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete feedback form",
        variant: "destructive",
      });
    }
  };

  const resetFormData = () => {
    setFormData({
      form_name: "",
      form_title: "Project Feedback",
      form_description: "",
      rating_label: "Overall Rating", 
      comments_label: "Comments",
      thank_you_message: "Thank you for your feedback!",
      zapier_webhook: "",
      google_sheets_sync: false,
      gdpr_consent_required: true,
      gdpr_consent_text: "I consent to my data being processed for feedback purposes.",
    });
  };

  const resetSendFormData = () => {
    setSendFormData({
      project_id: "",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      delivery_method: "email",
    });
  };

  const editForm = (form: FeedbackForm) => {
    setSelectedForm(form);
    setFormData({
      form_name: form.form_name,
      form_title: form.form_title,
      form_description: form.form_description || "",
      rating_label: form.rating_label,
      comments_label: form.comments_label,
      thank_you_message: form.thank_you_message,
      zapier_webhook: form.zapier_webhook || "",
      google_sheets_sync: form.google_sheets_sync,
      gdpr_consent_required: form.gdpr_consent_required,
      gdpr_consent_text: form.gdpr_consent_text,
    });
    setIsCreateFormOpen(true);
  };

  // Calculate analytics
  const totalResponses = responses.length;
  const averageRating = responses.length > 0 
    ? (responses.reduce((sum, r) => sum + r.rating, 0) / responses.length).toFixed(1)
    : 0;
  const responseRate = deliveryLogs.length > 0 
    ? ((responses.length / deliveryLogs.filter(d => d.delivery_status === 'sent').length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Feedback Forms</h2>
          <p className="text-muted-foreground">
            Create and manage post-project customer feedback forms
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSendFormOpen} onOpenChange={setIsSendFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="w-4 h-4 mr-2" />
                Send Feedback Form
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Feedback Form</DialogTitle>
                <DialogDescription>
                  Send a feedback form to a customer after project completion
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project_id">Project ID *</Label>
                  <Input
                    id="project_id"
                    placeholder="e.g., proj456"
                    value={sendFormData.project_id}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, project_id: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    placeholder="e.g., John Doe"
                    value={sendFormData.customer_name}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    placeholder="john@example.com"
                    value={sendFormData.customer_email}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_phone">Customer Phone</Label>
                  <Input
                    id="customer_phone"
                    placeholder="+44 7700 900123"
                    value={sendFormData.customer_phone}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_method">Delivery Method</Label>
                  <select
                    id="delivery_method"
                    className="w-full p-2 border rounded-md"
                    value={sendFormData.delivery_method}
                    onChange={(e) => setSendFormData(prev => ({ ...prev, delivery_method: e.target.value }))}
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <Button 
                  onClick={handleSendFeedbackForm} 
                  disabled={loading || !sendFormData.project_id || !sendFormData.customer_name}
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send Feedback Form"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedForm ? "Edit Feedback Form" : "Create Feedback Form"}
                </DialogTitle>
                <DialogDescription>
                  Design a customizable feedback form for post-project customer feedback
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <Label htmlFor="form_name">Form Name *</Label>
                  <Input
                    id="form_name"
                    placeholder="e.g., Post-Project Feedback"
                    value={formData.form_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, form_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="form_title">Form Title</Label>
                  <Input
                    id="form_title"
                    value={formData.form_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, form_title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="form_description">Form Description</Label>
                  <Textarea
                    id="form_description"
                    placeholder="Optional description shown to customers"
                    value={formData.form_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, form_description: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rating_label">Rating Label</Label>
                  <Input
                    id="rating_label"
                    value={formData.rating_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating_label: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="comments_label">Comments Label</Label>
                  <Input
                    id="comments_label"
                    value={formData.comments_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, comments_label: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="thank_you_message">Thank You Message</Label>
                  <Textarea
                    id="thank_you_message"
                    value={formData.thank_you_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, thank_you_message: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="zapier_webhook">Zapier Webhook URL</Label>
                  <Input
                    id="zapier_webhook"
                    placeholder="https://hooks.zapier.com/..."
                    value={formData.zapier_webhook}
                    onChange={(e) => setFormData(prev => ({ ...prev, zapier_webhook: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="google_sheets_sync"
                    checked={formData.google_sheets_sync}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, google_sheets_sync: checked }))}
                  />
                  <Label htmlFor="google_sheets_sync">Enable Google Sheets Sync</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="gdpr_consent_required"
                    checked={formData.gdpr_consent_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gdpr_consent_required: checked }))}
                  />
                  <Label htmlFor="gdpr_consent_required">Require GDPR Consent</Label>
                </div>
                {formData.gdpr_consent_required && (
                  <div>
                    <Label htmlFor="gdpr_consent_text">GDPR Consent Text</Label>
                    <Textarea
                      id="gdpr_consent_text"
                      value={formData.gdpr_consent_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, gdpr_consent_text: e.target.value }))}
                    />
                  </div>
                )}
                <Button 
                  onClick={handleSaveForm} 
                  disabled={loading || !formData.form_name}
                  className="w-full"
                >
                  {loading ? "Saving..." : selectedForm ? "Update Form" : "Create Form"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-4">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No feedback forms yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first feedback form to start collecting customer reviews
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {forms.map((form) => (
                <Card key={form.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{form.form_title}</h3>
                        <p className="text-sm text-muted-foreground">{form.form_name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Active: {form.is_active ? "Yes" : "No"}</span>
                          <span>GDPR: {form.gdpr_consent_required ? "Required" : "Optional"}</span>
                          <span>Zapier: {form.zapier_webhook ? "Connected" : "Not connected"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editForm(form)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          {responses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
                  <p className="text-muted-foreground">
                    Customer feedback responses will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {responses.map((response) => (
                <Card key={response.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{response.customer_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Project: {response.project_id}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < response.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-medium">{response.rating}/5</span>
                        </div>
                      </div>
                      {response.comments && (
                        <p className="text-sm mt-2">{response.comments}</p>
                      )}
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Submitted: {new Date(response.submitted_at).toLocaleDateString()}</span>
                        <span>GDPR Consent: {response.gdpr_consent ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalResponses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageRating}/5</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{responseRate}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>Track sent feedback forms and responses</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryLogs.length === 0 ? (
                <p className="text-muted-foreground">No delivery logs yet</p>
              ) : (
                <div className="space-y-2">
                  {deliveryLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="font-medium">{log.customer_name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({log.project_id})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="capitalize">{log.delivery_method}</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            log.delivery_status === "sent"
                              ? "bg-green-100 text-green-800"
                              : log.delivery_status === "failed"
                              ? "bg-red-100 text-red-800"
                              : log.delivery_status === "responded"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {log.delivery_status}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <AlertDescription>
          <strong>Sample Usage:</strong> To send a feedback form for project "proj456", use the "Send Feedback Form" button above with the project ID "proj456", customer details, and preferred delivery method. The system will automatically handle GDPR compliance, analytics tracking, and optional Zapier integration for Google Sheets sync.
        </AlertDescription>
      </Alert>
    </div>
  );
}