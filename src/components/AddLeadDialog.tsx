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
    name: '',
    email: '',
    phone: '',
    project_type: '',
    description: '',
    location: '',
    budget_min: '',
    budget_max: '',
    source: 'manual',
    priority: 'medium'
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
        ...formData,
        user_id: user.id,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
      };

      const { error } = await supabase
        .from('leads')
        .insert(leadData);

      if (error) throw error;

      toast({
        title: "Lead added successfully",
        description: `${formData.name} has been added to your leads.`,
      });

      setFormData({
        name: '',
        email: '',
        phone: '',
        project_type: '',
        description: '',
        location: '',
        budget_min: '',
        budget_max: '',
        source: 'manual',
        priority: 'medium'
      });

      setOpen(false);
      onLeadAdded();
    } catch (error) {
      console.error('Error adding lead:', error);
      toast({
        title: "Error",
        description: "Failed to add lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>
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
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+44 7123 456789"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Postcode"
              />
            </div>
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
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the project requirements, timeline, and any specific details..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget_min">Budget Range (£)</Label>
              <div className="flex gap-2">
                <Input
                  id="budget_min"
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => handleInputChange('budget_min', e.target.value)}
                  placeholder="Min"
                />
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => handleInputChange('budget_max', e.target.value)}
                  placeholder="Max"
                />
              </div>
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
            <Label htmlFor="source">Lead Source</Label>
            <Select 
              value={formData.source} 
              onValueChange={(value) => handleInputChange('source', value)}
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