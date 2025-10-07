import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Plus, Eye, MessageSquare, Calendar, FileText, DollarSign, TrendingUp } from "lucide-react";
import PlanningDataScraper from "./PlanningDataScraper";
import CalendlyIntegration from "./CalendlyIntegration";
import AutoResponderSystem from "./AutoResponderSystem";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  lead_source?: string;
  status: string;
  priority: string;
  last_contact_date?: string;
  notes?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  lead_name: string;
  amount: number;
  status: string;
  created_at: string;
  stripe_payment_id?: string;
}

const LeadsDashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    fetchLeads();
    fetchInvoices();
  }, []);

  useEffect(() => {
    let filtered = leads;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLeads(filtered);
  }, [leads, statusFilter, searchTerm]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('construyo_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data?.map(inv => ({
        id: inv.id,
        lead_name: inv.customer_name || 'Unknown',
        amount: inv.amount,
        status: inv.status,
        created_at: inv.created_at,
        stripe_payment_id: inv.stripe_payment_intent_id
      })) || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const addNoteToLead = async () => {
    if (!selectedLead || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          notes: `${selectedLead.notes || ''}\n\n[${new Date().toLocaleString()}] ${newNote}`.trim()
        })
        .eq('id', selectedLead.id);

      if (error) throw error;
      
      toast.success('Note added successfully');
      setNewNote("");
      fetchLeads();
      setSelectedLead(null);
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const saveLeadFromPlanningData = (planningData: any) => {
    // This would be called from PlanningDataScraper component
    // Implementation would extract applicant data and create a new lead
    toast.success('Lead saved from planning data');
  };

  const generateInvoice = async (leadId: string) => {
    try {
      // Basic invoice generation - in real app would use PDF library
      toast.success('Invoice generation would be implemented with jsPDF');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Capturing Leads</h1>
          <p className="text-muted-foreground">Manage your leads, planning data, and client interactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {leads.length} Total Leads
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {leads.filter(l => l.status === 'converted').length} Converted
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="current-leads" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current-leads">Current Leads</TabsTrigger>
          <TabsTrigger value="planning-data">Planning Data</TabsTrigger>
          <TabsTrigger value="calendly">Calendly Meetings</TabsTrigger>
          <TabsTrigger value="lead-engagement">Lead Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="current-leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Leads Dashboard
              </CardTitle>
              <CardDescription>
                View and manage your current leads with filters and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search leads by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Leads Table */}
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Source</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Last Contact</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-muted/25">
                          <td className="p-3">
                            <div className="font-medium">
                              {lead.first_name} {lead.last_name}
                            </div>
                            {lead.phone && (
                              <div className="text-sm text-muted-foreground">{lead.phone}</div>
                            )}
                          </td>
                          <td className="p-3 text-sm">{lead.email}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {lead.lead_source || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {lead.last_contact_date ? 
                              new Date(lead.last_contact_date).toLocaleDateString() : 
                              'Never'
                            }
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedLead(lead)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Lead Details</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-medium">Contact Information</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedLead?.first_name} {selectedLead?.last_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">{selectedLead?.email}</p>
                                      {selectedLead?.phone && (
                                        <p className="text-sm text-muted-foreground">{selectedLead?.phone}</p>
                                      )}
                                    </div>
                                    
                                    {selectedLead?.notes && (
                                      <div>
                                        <h4 className="font-medium">Notes</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                          {selectedLead.notes}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                      <h4 className="font-medium">Add Note</h4>
                                      <Textarea
                                        placeholder="Add a note about this lead..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                      />
                                      <Button onClick={addNoteToLead} disabled={!newNote.trim()}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Add Note
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateInvoice(lead.id)}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Invoice
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planning Data Scraper</CardTitle>
              <CardDescription>
                Search planning applications and convert them to leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanningDataScraper />
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <Button onClick={() => saveLeadFromPlanningData({})}>
                  <Plus className="h-4 w-4 mr-2" />
                  Save Lead from Search Results
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a planning application result to extract applicant details and create a new lead
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendly Meetings
              </CardTitle>
              <CardDescription>
                Schedule and manage client meetings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendlyIntegration />
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-Up
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Schedule follow-up meetings and automatically log them in lead notes
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Engagement</CardTitle>
              <CardDescription>
                Engage with leads via WhatsApp, Email, SMS. Send offers and microsite links.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AutoResponderSystem />
            </CardContent>
          </Card>
        </TabsContent>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoices & Payments
              </CardTitle>
              <CardDescription>
                Manage invoices and payment status for leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Lead Name</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b hover:bg-muted/25">
                          <td className="p-3 font-medium">{invoice.lead_name}</td>
                          <td className="p-3">£{invoice.amount.toFixed(2)}</td>
                          <td className="p-3">
                            <Badge className={`text-xs ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm">
                                <FileText className="h-3 w-3 mr-1" />
                                PDF
                              </Button>
                              {invoice.status === 'pending' && (
                                <Button variant="outline" size="sm">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Pay
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadsDashboard;