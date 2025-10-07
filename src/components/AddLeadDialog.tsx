import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface AddLeadDialogProps {
  onLeadAdded: () => void;
}

const AddLeadDialog = ({ onLeadAdded }: AddLeadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    project_type: '',
    project_description: '',
    address: '',
    estimated_budget_range: '',
    lead_source: 'manual',
    priority: 'medium',
    status: 'new'
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!user) {
    navigate('/auth');
    return;
  }

  setIsLoading(true);

  try {
    const leadData = {
      // No company_id needed
      created_by: user.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      project_type: formData.project_type,
      project_description: formData.project_description,
      address: formData.address,
      lead_source: formData.lead_source,
      priority: formData.priority,
      status: formData.status as "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost",
      notes: `Budget range: ${formData.estimated_budget_range}`
    };

    const { error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .single();  // Optional: Ensures exactly one row inserted

    if (insertError) throw insertError;

    toast({
      title: "Lead added successfully",
      description: `${formData.first_name} ${formData.last_name} has been added to your leads.`,
    });

    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      project_type: '',
      project_description: '',
      address: '',
      estimated_budget_range: '',
      lead_source: 'manual',
      priority: 'medium',
      status: 'new'
    });

    setOpen(false);
    onLeadAdded();
  } catch (error) {
    console.error('Error adding lead:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to add lead. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
}
   ;
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Capture lead information to start building your customer pipeline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+44 7123 456789"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="123 Main Street, City, Postcode"
            />
          </div>

          <div>
            <Label htmlFor="project_type">Project Type</Label>
            <Select onValueChange={(value) => handleInputChange('project_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kitchen_extension">Kitchen Extension</SelectItem>
                <SelectItem value="bathroom_renovation">Bathroom Renovation</SelectItem>
                <SelectItem value="loft_conversion">Loft Conversion</SelectItem>
                <SelectItem value="new_build">New Build</SelectItem>
                <SelectItem value="garden_landscaping">Garden Landscaping</SelectItem>
                <SelectItem value="roofing">Roofing</SelectItem>
                <SelectItem value="electrical">Electrical Work</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project_description">Project Description</Label>
            <Textarea
              id="project_description"
              value={formData.project_description}
              onChange={(e) => handleInputChange('project_description', e.target.value)}
              placeholder="Describe the project requirements, timeline, and any specific details..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimated_budget_range">Budget Range</Label>
              <Select onValueChange={(value) => handleInputChange('estimated_budget_range', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_5k">Under £5,000</SelectItem>
                  <SelectItem value="5k_15k">£5,000 - £15,000</SelectItem>
                  <SelectItem value="15k_30k">£15,000 - £30,000</SelectItem>
                  <SelectItem value="30k_50k">£30,000 - £50,000</SelectItem>
                  <SelectItem value="50k_100k">£50,000 - £100,000</SelectItem>
                  <SelectItem value="over_100k">Over £100,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="lead_source">Lead Source</Label>
            <Select 
              value={formData.lead_source} 
              onValueChange={(value) => handleInputChange('lead_source', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="whatsapp_referral">WhatsApp Referral</SelectItem>
                <SelectItem value="website_form">Website Form</SelectItem>
                <SelectItem value="planning_alert">Planning Alert</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="word_of_mouth">Word of Mouth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLeadDialog;
