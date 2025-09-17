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
import { Plus, Eye, Edit, UserCheck, Trash2, Users, Filter } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

const statusColors = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500", 
  qualified: "bg-green-500",
  proposal_sent: "bg-purple-500",
  won: "bg-emerald-500",
  lost: "bg-red-500"
};

const priorityColors = {
  low: "bg-gray-500",
  medium: "bg-orange-500",
  high: "bg-red-500"
};

export default function LeadsManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(email),
          creator:created_by(email)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!userCompanyId
  });

  // Fetch company users for assignment
  const { data: companyUsers = [] } = useQuery({
    queryKey: ['company-users', userCompanyId],
    queryFn: async () => {
      if (!userCompanyId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(full_name, email)
        `)
        .eq('company_id', userCompanyId)
        .eq('is_active', true)
        .in('role', ['admin', 'builder']);

      if (error) throw error;
      return data;
    },
    enabled: !!userCompanyId
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: LeadInsert) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(leadData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsCreateOpen(false);
      toast.success("Lead created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create lead: ${error.message}`);
    }
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditOpen(false);
      setSelectedLead(null);
      toast.success("Lead updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    }
  });

  // Convert lead to customer mutation
  const convertLeadMutation = useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('convert_lead_to_customer', {
        p_lead_id: leadId,
        p_conversion_notes: notes
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success("Lead converted to customer successfully");
    },
    onError: (error) => {
      toast.error(`Failed to convert lead: ${error.message}`);
    }
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success("Lead deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete lead: ${error.message}`);
    }
  });

  const handleCreateLead = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const leadData: LeadInsert = {
      company_id: userCompanyId!,
      created_by: (await supabase.auth.getUser()).data.user!.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company_name: formData.get('company_name') as string || null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      postal_code: formData.get('postal_code') as string || null,
      lead_source: formData.get('lead_source') as string || null,
      priority: formData.get('priority') as any || 'medium',
      project_type: formData.get('project_type') as string || null,
      project_description: formData.get('project_description') as string || null,
      estimated_budget_min: formData.get('estimated_budget_min') ? parseFloat(formData.get('estimated_budget_min') as string) : null,
      estimated_budget_max: formData.get('estimated_budget_max') ? parseFloat(formData.get('estimated_budget_max') as string) : null,
      estimated_timeline: formData.get('estimated_timeline') as string || null,
      notes: formData.get('notes') as string || null,
      assigned_to: formData.get('assigned_to') as string || null,
    };

    createLeadMutation.mutate(leadData);
  };

  const handleUpdateLead = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLead) return;

    const formData = new FormData(event.currentTarget);
    
    const updateData: LeadUpdate & { id: string } = {
      id: selectedLead.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company_name: formData.get('company_name') as string || null,
      status: formData.get('status') as any,
      priority: formData.get('priority') as any,
      assigned_to: formData.get('assigned_to') as string || null,
      notes: formData.get('notes') as string || null,
    };

    updateLeadMutation.mutate(updateData);
  };

  const handleConvertLead = (leadId: string) => {
    const notes = prompt("Add conversion notes (optional):");
    convertLeadMutation.mutate({ leadId, notes: notes || undefined });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Leads Management</h2>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new prospect to your lead pipeline.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
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

              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input id="company_name" name="company_name" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Input id="lead_source" name="lead_source" placeholder="Website, Referral, etc." />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue="medium">
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
                <div>
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select name="assigned_to">
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.profiles?.full_name || user.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="project_type">Project Type</Label>
                <Input id="project_type" name="project_type" placeholder="Kitchen, Extension, etc." />
              </div>

              <div>
                <Label htmlFor="project_description">Project Description</Label>
                <Textarea id="project_description" name="project_description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_budget_min">Min Budget (£)</Label>
                  <Input id="estimated_budget_min" name="estimated_budget_min" type="number" />
                </div>
                <div>
                  <Label htmlFor="estimated_budget_max">Max Budget (£)</Label>
                  <Input id="estimated_budget_max" name="estimated_budget_max" type="number" />
                </div>
              </div>

              <div>
                <Label htmlFor="estimated_timeline">Estimated Timeline</Label>
                <Input id="estimated_timeline" name="estimated_timeline" placeholder="3 months, Summer 2024, etc." />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
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
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Search leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Leads Grid */}
      <div className="grid gap-4">
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || searchTerm ? 'Try adjusting your filters' : 'Create your first lead to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {lead.first_name} {lead.last_name}
                      {lead.company_name && (
                        <span className="text-sm text-muted-foreground font-normal ml-2">
                          at {lead.company_name}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${statusColors[lead.status as keyof typeof statusColors]} text-white`}>
                        {lead.status}
                      </Badge>
                      <Badge className={`${priorityColors[lead.priority as keyof typeof priorityColors]} text-white`}>
                        {lead.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedLead(lead);
                      setIsEditOpen(true);
                    }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {lead.status !== 'won' && lead.status !== 'lost' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConvertLead(lead.id)}
                        disabled={convertLeadMutation.isPending}
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLeadMutation.mutate(lead.id)}
                      disabled={deleteLeadMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Contact:</p>
                    <p>{lead.email}</p>
                    <p>{lead.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project:</p>
                    <p>{lead.project_type || 'Not specified'}</p>
                    {lead.estimated_budget_min && lead.estimated_budget_max && (
                      <p>£{lead.estimated_budget_min.toLocaleString()} - £{lead.estimated_budget_max.toLocaleString()}</p>
                    )}
                  </div>
                </div>
                {lead.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Notes:</p>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Created: {new Date(lead.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Lead Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_first_name">First Name</Label>
                  <Input id="edit_first_name" name="first_name" defaultValue={selectedLead.first_name} required />
                </div>
                <div>
                  <Label htmlFor="edit_last_name">Last Name</Label>
                  <Input id="edit_last_name" name="last_name" defaultValue={selectedLead.last_name} required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_email">Email</Label>
                  <Input id="edit_email" name="email" type="email" defaultValue={selectedLead.email || ''} />
                </div>
                <div>
                  <Label htmlFor="edit_phone">Phone</Label>
                  <Input id="edit_phone" name="phone" defaultValue={selectedLead.phone || ''} />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input id="edit_company_name" name="company_name" defaultValue={selectedLead.company_name || ''} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select name="status" defaultValue={selectedLead.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_priority">Priority</Label>
                  <Select name="priority" defaultValue={selectedLead.priority}>
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
                <div>
                  <Label htmlFor="edit_assigned_to">Assigned To</Label>
                  <Select name="assigned_to" defaultValue={selectedLead.assigned_to || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {companyUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.profiles?.full_name || user.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea id="edit_notes" name="notes" defaultValue={selectedLead.notes || ''} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLeadMutation.isPending}>
                  {updateLeadMutation.isPending ? "Updating..." : "Update Lead"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}