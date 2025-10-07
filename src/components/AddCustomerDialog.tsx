import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AddCustomerDialogProps {
  onCustomerAdded: () => void;
}

const AddCustomerDialog = ({ onCustomerAdded }: AddCustomerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    service_address: '',
    billing_address: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoles?.company_id) throw new Error('User company not found');

      const { error } = await supabase
        .from('customers')
        .insert({
          company_id: userRoles.company_id,
          created_by: user.id,
          ...formData
        });

      if (error) throw error;

      toast({ title: "Customer added successfully" });
      setFormData({
        first_name: '', last_name: '', email: '', phone: '',
        company_name: '', service_address: '', billing_address: '', notes: ''
      });
      setOpen(false);
      onCustomerAdded();
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" />Add Customer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>Enter customer information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} /></div>
            <div><Label>Last Name *</Label><Input required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          </div>
          <div><Label>Company Name</Label><Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} /></div>
          <div><Label>Service Address</Label><Input value={formData.service_address} onChange={(e) => setFormData({...formData, service_address: e.target.value})} /></div>
          <div><Label>Billing Address</Label><Input value={formData.billing_address} onChange={(e) => setFormData({...formData, billing_address: e.target.value})} /></div>
          <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Adding..." : "Add Customer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
