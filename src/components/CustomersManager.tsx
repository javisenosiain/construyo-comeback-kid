import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Users, Filter, Building, User, Mail, Phone, MapPin, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

const statusColors = {
  active: "bg-green-500",
  inactive: "bg-yellow-500",
  archived: "bg-gray-500"
};

export default function CustomersManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  // Get user's company ID
  useEffect(() => {
    const getUserCompany = async () => {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .single();
      
      if (userRoles) {
        setUserCompanyId(userRoles.company_id);
      }
    };
    
    getUserCompany();
  }, []);

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          creator:created_by(email),
          original_lead:original_lead_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('customer_type', typeFilter);
      }

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!userCompanyId
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerInsert) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateOpen(false);
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: CustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditOpen(false);
      setSelectedCustomer(null);
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update customer: ${error.message}`);
    }
  });

  const handleCreateCustomer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const customerData: CustomerInsert = {
      company_id: userCompanyId!,
      created_by: (await supabase.auth.getUser()).data.user!.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company_name: formData.get('company_name') as string || null,
      billing_address: formData.get('billing_address') as string || null,
      service_address: formData.get('service_address') as string || null,
      city: formData.get('city') as string || null,
      postal_code: formData.get('postal_code') as string || null,
      customer_type: formData.get('customer_type') as any || 'individual',
      vat_number: formData.get('vat_number') as string || null,
      business_registration: formData.get('business_registration') as string || null,
      credit_limit: formData.get('credit_limit') ? parseFloat(formData.get('credit_limit') as string) : null,
      payment_terms: formData.get('payment_terms') ? parseInt(formData.get('payment_terms') as string) : 30,
      notes: formData.get('notes') as string || null,
    };

    createCustomerMutation.mutate(customerData);
  };

  const handleUpdateCustomer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCustomer) return;

    const formData = new FormData(event.currentTarget);
    
    const updateData: CustomerUpdate & { id: string } = {
      id: selectedCustomer.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company_name: formData.get('company_name') as string || null,
      status: formData.get('status') as any,
      customer_type: formData.get('customer_type') as any,
      notes: formData.get('notes') as string || null,
    };

    updateCustomerMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Customers Management</h2>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to your system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" name="first_name" required />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" name="last_name" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Select name="customer_type" defaultValue="individual">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input id="company_name" name="company_name" />
                </div>
              </div>

              <div>
                <Label htmlFor="billing_address">Billing Address</Label>
                <Textarea id="billing_address" name="billing_address" />
              </div>

              <div>
                <Label htmlFor="service_address">Service Address</Label>
                <Textarea id="service_address" name="service_address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input id="postal_code" name="postal_code" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vat_number">VAT Number</Label>
                  <Input id="vat_number" name="vat_number" />
                </div>
                <div>
                  <Label htmlFor="business_registration">Business Registration</Label>
                  <Input id="business_registration" name="business_registration" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="credit_limit">Credit Limit (£)</Label>
                  <Input id="credit_limit" name="credit_limit" type="number" />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                  <Input id="payment_terms" name="payment_terms" type="number" defaultValue="30" />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCustomerMutation.isPending}>
                  {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid gap-4">
        {customers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || typeFilter !== 'all' || searchTerm ? 'Try adjusting your filters' : 'Create your first customer to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {customer.customer_type === 'business' ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      {customer.first_name} {customer.last_name}
                      {customer.company_name && (
                        <span className="text-sm text-muted-foreground font-normal">
                          at {customer.company_name}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${statusColors[customer.status as keyof typeof statusColors]} text-white`}>
                        {customer.status}
                      </Badge>
                      <Badge variant="outline">
                        {customer.customer_type}
                      </Badge>
                      {customer.original_lead_id && (
                        <Badge variant="secondary">
                          Converted Lead
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedCustomer(customer);
                      setIsEditOpen(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.city}, {customer.postal_code}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {customer.payment_terms && (
                      <div className="text-muted-foreground">
                        Payment Terms: {customer.payment_terms} days
                      </div>
                    )}
                    {customer.credit_limit && (
                      <div className="text-muted-foreground">
                        Credit Limit: £{customer.credit_limit.toLocaleString()}
                      </div>
                    )}
                    {customer.conversion_date && (
                      <div className="text-muted-foreground">
                        Converted: {new Date(customer.conversion_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                {customer.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Notes:</span>
                    </div>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Created: {new Date(customer.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input id="edit_first_name" name="first_name" defaultValue={selectedCustomer.first_name} required />
                </div>
                <div>
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input id="edit_last_name" name="last_name" defaultValue={selectedCustomer.last_name} required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_email">Email</Label>
                  <Input id="edit_email" name="email" type="email" defaultValue={selectedCustomer.email || ''} />
                </div>
                <div>
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input id="edit_phone" name="phone" defaultValue={selectedCustomer.phone || ''} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_customer_type">Customer Type</Label>
                  <Select name="customer_type" defaultValue={selectedCustomer.customer_type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select name="status" defaultValue={selectedCustomer.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input id="edit_company_name" name="company_name" defaultValue={selectedCustomer.company_name || ''} />
              </div>

              <div>
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea id="edit_notes" name="notes" defaultValue={selectedCustomer.notes || ''} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomerMutation.isPending}>
                  {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}