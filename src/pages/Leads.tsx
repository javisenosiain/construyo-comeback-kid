import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Filter,
  Edit,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import AddLeadDialog from "@/components/AddLeadDialog";

interface Lead {
  id: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  project_type?: string;
  description?: string;
  location?: string;
  budget_min?: number;
  budget_max?: number;
  source: string;
  status: string;
  priority?: string;
  created_at: string;
  updated_at?: string;
}

const Leads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    whatsapp: 0,
    website: 0,
    planning: 0,
    conversionRate: 0
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leadsData: Lead[]) => {
    const whatsapp = leadsData.filter(lead => lead.source === 'whatsapp_referral').length;
    const website = leadsData.filter(lead => lead.source === 'website_form').length;
    const planning = leadsData.filter(lead => lead.source === 'planning_alert').length;
    const converted = leadsData.filter(lead => lead.status === 'converted').length;
    const conversionRate = leadsData.length > 0 ? Math.round((converted / leadsData.length) * 100) : 0;

    setStats({ whatsapp, website, planning, conversionRate });
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      toast({
        title: "Lead updated",
        description: `Lead status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status.",
        variant: "destructive",
      });
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast({
        title: "Lead deleted",
        description: "Lead has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-primary text-primary-foreground";
      case "contacted": return "bg-accent text-accent-foreground";
      case "qualified": return "bg-success text-success-foreground";
      case "converted": return "bg-success text-success-foreground";
      case "lost": return "bg-secondary text-secondary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-accent text-accent-foreground";
      case "low": return "bg-secondary text-secondary-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`;
    if (min) return `From £${min.toLocaleString()}`;
    if (max) return `Up to £${max.toLocaleString()}`;
    return "Budget not specified";
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.project_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading leads...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lead Management</h1>
            <p className="text-muted-foreground">Capture, track, and convert leads into customers</p>
          </div>
          <AddLeadDialog onLeadAdded={fetchLeads} />
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="whatsapp_referral">WhatsApp Referral</SelectItem>
                  <SelectItem value="website_form">Website Form</SelectItem>
                  <SelectItem value="planning_alert">Planning Alert</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setSourceFilter("all");
              }}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.whatsapp}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Website Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent-foreground">{stats.website}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Planning Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.planning}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">Total leads converted</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads List */}
        <div className="grid gap-6">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      {lead.name || 'Unnamed Lead'}
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      {lead.priority && (
                        <Badge className={getPriorityColor(lead.priority)} variant="outline">
                          {lead.priority} priority
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-lg font-medium mt-1">
                      {lead.project_type?.replace(/_/g, ' ') || 'Project type not specified'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-success">
                      {formatBudget(lead.budget_min, lead.budget_max)}
                    </div>
                    <div className="text-sm text-muted-foreground">Estimated value</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {lead.description && (
                  <p className="text-sm text-muted-foreground mb-4">{lead.description}</p>
                )}
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{lead.source.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Select 
                      value={lead.status}
                      onValueChange={(value) => updateLeadStatus(lead.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteLead(lead.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLeads.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-muted-foreground mb-4">
                {leads.length === 0 ? "No leads found. Start by adding your first lead!" : "No leads match your current filters."}
              </div>
              {leads.length === 0 ? (
                <AddLeadDialog onLeadAdded={fetchLeads} />
              ) : (
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setSourceFilter("all");
                }}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leads;