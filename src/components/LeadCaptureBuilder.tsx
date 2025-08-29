import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Eye, Code, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface LeadCaptureForm {
  id: string;
  form_name: string;
  form_title: string;
  form_description: string;
  fields: FormField[];
  redirect_url: string;
  thank_you_message: string;
  embed_code: string;
  is_active: boolean;
  created_at: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox" },
];

export default function LeadCaptureBuilder() {
  const [forms, setForms] = useState<LeadCaptureForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<LeadCaptureForm> | null>(null);
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_capture_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to ensure fields is properly typed
      const transformedData = (data || []).map(form => ({
        ...form,
        fields: Array.isArray(form.fields) ? (form.fields as unknown as FormField[]) : []
      }));
      
      setForms(transformedData);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const createNewForm = () => {
    setEditingForm({
      form_name: "New Lead Capture Form",
      form_title: "Get a Free Quote",
      form_description: "Fill out the form below and we'll get back to you with a personalized quote.",
      fields: [
        { id: "name", type: "text", label: "Full Name", required: true, placeholder: "Enter your full name" },
        { id: "email", type: "email", label: "Email", required: true, placeholder: "Enter your email" },
        { id: "phone", type: "phone", label: "Phone", required: false, placeholder: "Enter your phone number" },
        { id: "project", type: "textarea", label: "Project Description", required: true, placeholder: "Tell us about your project" }
      ],
      redirect_url: "",
      thank_you_message: "Thank you for your inquiry! We'll be in touch within 24 hours.",
      is_active: true
    });
    setShowFormBuilder(true);
  };

  const editForm = (form: LeadCaptureForm) => {
    setEditingForm({ ...form });
    setShowFormBuilder(true);
  };

  const saveForm = async () => {
    if (!editingForm) return;

    setCreating(true);
    try {
      const embedCode = generateEmbedCode(editingForm);
      
      const formData = {
        form_name: editingForm.form_name || '',
        form_title: editingForm.form_title || '',
        form_description: editingForm.form_description || '',
        redirect_url: editingForm.redirect_url || '',
        thank_you_message: editingForm.thank_you_message || '',
        embed_code: embedCode,
        fields: JSON.stringify(editingForm.fields || []),
        is_active: editingForm.is_active ?? true
      };

      let result;
      if (editingForm.id) {
        // Update existing form
        result = await supabase
          .from('lead_capture_forms')
          .update(formData)
          .eq('id', editingForm.id)
          .select()
          .single();
      } else {
        // Create new form
        result = await supabase
          .from('lead_capture_forms')
          .insert([formData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      await fetchForms();
      setShowFormBuilder(false);
      setEditingForm(null);
      toast.success(editingForm.id ? 'Form updated successfully!' : 'Form created successfully!');
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error('Failed to save form');
    } finally {
      setCreating(false);
    }
  };

  const generateEmbedCode = (form: Partial<LeadCaptureForm>) => {
    const baseUrl = window.location.origin;
    return `<iframe src="${baseUrl}/embed/form/${form.id}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const addField = () => {
    if (!editingForm) return;
    
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      placeholder: ""
    };

    setEditingForm({
      ...editingForm,
      fields: [...(editingForm.fields || []), newField]
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    if (!editingForm) return;
    
    const updatedFields = [...(editingForm.fields || [])];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    
    setEditingForm({
      ...editingForm,
      fields: updatedFields
    });
  };

  const removeField = (index: number) => {
    if (!editingForm) return;
    
    const updatedFields = [...(editingForm.fields || [])];
    updatedFields.splice(index, 1);
    
    setEditingForm({
      ...editingForm,
      fields: updatedFields
    });
  };

  const copyEmbedCode = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed code copied to clipboard!');
  };

  const toggleFormActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_capture_forms')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setForms(forms => 
        forms.map(form => 
          form.id === id ? { ...form, is_active: !currentStatus } : form
        )
      );

      toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Failed to update form');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lead Capture Forms</h2>
          <p className="text-muted-foreground">
            Create embeddable forms to capture leads on your micro-sites
          </p>
        </div>
        <Button onClick={createNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Forms List */}
      <div className="space-y-4">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No forms created yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first lead capture form to start collecting leads!
              </p>
            </CardContent>
          </Card>
        ) : (
          forms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{form.form_name}</CardTitle>
                    <Badge variant={form.is_active ? "default" : "secondary"}>
                      {form.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editForm(form)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFormActive(form.id, form.is_active)}
                    >
                      {form.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created {new Date(form.created_at).toLocaleDateString()} • {form.fields.length} fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Form Title: {form.form_title}</p>
                  <p className="text-sm text-muted-foreground">{form.form_description}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Embed Code</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={form.embed_code}
                      readOnly
                      className="text-sm font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmbedCode(form.embed_code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/embed/form/${form.id}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Builder Dialog */}
      <Dialog open={showFormBuilder} onOpenChange={setShowFormBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingForm?.id ? 'Edit Form' : 'Create New Form'}
            </DialogTitle>
            <DialogDescription>
              Design your lead capture form with custom fields and messaging
            </DialogDescription>
          </DialogHeader>
          
          {editingForm && (
            <div className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="fields">Form Fields</TabsTrigger>
                  <TabsTrigger value="settings">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label htmlFor="form_name">Form Name</Label>
                    <Input
                      id="form_name"
                      value={editingForm.form_name || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, form_name: e.target.value })}
                      placeholder="Internal name for this form"
                    />
                  </div>

                  <div>
                    <Label htmlFor="form_title">Form Title</Label>
                    <Input
                      id="form_title"
                      value={editingForm.form_title || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, form_title: e.target.value })}
                      placeholder="Title shown to users"
                    />
                  </div>

                  <div>
                    <Label htmlFor="form_description">Form Description</Label>
                    <Textarea
                      id="form_description"
                      value={editingForm.form_description || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, form_description: e.target.value })}
                      placeholder="Description shown to users"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="fields" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Form Fields</h3>
                    <Button onClick={addField} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {editingForm.fields?.map((field, index) => (
                      <Card key={field.id}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label>Field Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(index, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>Field Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="Field label"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label>Placeholder</Label>
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                placeholder="Placeholder text"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                              <Label>Required field</Label>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeField(index)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div>
                    <Label htmlFor="thank_you_message">Thank You Message</Label>
                    <Textarea
                      id="thank_you_message"
                      value={editingForm.thank_you_message || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, thank_you_message: e.target.value })}
                      placeholder="Message shown after form submission"
                    />
                  </div>

                  <div>
                    <Label htmlFor="redirect_url">Redirect URL (Optional)</Label>
                    <Input
                      id="redirect_url"
                      value={editingForm.redirect_url || ''}
                      onChange={(e) => setEditingForm({ ...editingForm, redirect_url: e.target.value })}
                      placeholder="URL to redirect to after submission"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingForm.is_active}
                      onCheckedChange={(checked) => setEditingForm({ ...editingForm, is_active: checked })}
                    />
                    <Label>Form is active</Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFormBuilder(false)}
                >
                  Cancel
                </Button>
                <Button onClick={saveForm} disabled={creating}>
                  {creating ? "Saving..." : "Save Form"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}