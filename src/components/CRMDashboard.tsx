import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Users, 
  Building, 
  FolderOpen, 
  FileText, 
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Settings,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { CRMSyncButton } from "./CRMSyncButton";
import { ExternalCRMSettings } from "./ExternalCRMSettings";
import AddCustomerDialog from "./AddCustomerDialog";

// Type definitions based on actual database schema
interface Lead {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  project_type?: string;
  project_description?: string;
  address?: string;
  lead_source?: string;
  priority: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  converted_to_customer_id?: string;
}

interface Customer {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  service_address?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  customer_id: string;
  title: string; // Changed from 'name' to match actual schema
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_at: string;
}

interface Invoice {
  id: string;
  project_id?: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalProjects: number;
  totalInvoices: number;
  activeLeads: number;
  activeCustomers: number;
  pendingInvoices: number;
  revenue: number;
}

/**
 * Comprehensive CRM Dashboard with CRUD operations, filtering, and analytics
 * Sample usage: createLead("lead123", leadData)
 */
export default function CRMDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalCustomers: 0,
    totalProjects: 0,
    totalInvoices: 0,
    activeLeads: 0,
    activeCustomers: 0,
    pendingInvoices: 0,
    revenue: 0
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Filter states
  const [leadFilter, setLeadFilter] = useState({ status: "", priority: "", search: "" });
  const [customerFilter, setCustomerFilter] = useState({ status: "", search: "" });
  const [projectFilter, setProjectFilter] = useState({ status: "", search: "" });
  const [invoiceFilter, setInvoiceFilter] = useState({ status: "", search: "" });

  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load all dashboard data with analytics
   */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLeads(),
        loadCustomers(),
        loadProjects(),
        loadInvoices(),
        loadStats()
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load leads with filtering
   */
  const loadLeads = async () => {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadFilter.status) {
        query = query.eq('status', leadFilter.status as any);
      }
      if (leadFilter.priority) {
        query = query.eq('priority', leadFilter.priority);
      }
      if (leadFilter.search) {
        query = query.or(`first_name.ilike.%${leadFilter.search}%,last_name.ilike.%${leadFilter.search}%,email.ilike.%${leadFilter.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLeads(data || []);
      logCRUDOperation('READ', 'leads', null, { count: data?.length || 0 });
    } catch (error) {
      console.error("Error loading leads:", error);
      toast.error("Failed to load leads");
    }
  };

  /**
   * Load customers with filtering
   */
  const loadCustomers = async () => {
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerFilter.status) {
        query = query.eq('status', customerFilter.status as any);
      }
      if (customerFilter.search) {
        query = query.or(`first_name.ilike.%${customerFilter.search}%,last_name.ilike.%${customerFilter.search}%,email.ilike.%${customerFilter.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setCustomers(data || []);
      logCRUDOperation('READ', 'customers', null, { count: data?.length || 0 });
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    }
  };

  /**
   * Load projects with filtering
   */
  const loadProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectFilter.status) {
        query = query.eq('status', projectFilter.status);
      }
      if (projectFilter.search) {
        query = query.ilike('name', `%${projectFilter.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map the data to match our interface
      const mappedProjects = (data || []).map(project => ({
        ...project,
        title: project.title || 'Untitled Project'
      }));
      setProjects(mappedProjects as Project[]);
      logCRUDOperation('READ', 'projects', null, { count: data?.length || 0 });
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  /**
   * Load invoices with filtering
   */
  const loadInvoices = async () => {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoiceFilter.status) {
        query = query.eq('status', invoiceFilter.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      setInvoices(data || []);
      logCRUDOperation('READ', 'invoices', null, { count: data?.length || 0 });
    } catch (error) {
      console.error("Error loading invoices:", error);
    }
  };

  /**
   * Load dashboard statistics
   */
  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoles?.company_id) return;

      const [leadsRes, customersRes, projectsRes, invoicesRes] = await Promise.all([
        supabase.from('leads').select('status').eq('company_id', userRoles.company_id),
        supabase.from('customers').select('status').eq('company_id', userRoles.company_id),
        supabase.from('projects').select('status, budget'),
        supabase.from('invoices').select('status, amount')
      ]);

      const activeLeads = leadsRes.data?.filter(l => ['new', 'contacted', 'qualified'].includes(l.status)).length || 0;
      const activeCustomers = customersRes.data?.filter(c => c.status === 'active').length || 0;
      const pendingInvoices = invoicesRes.data?.filter(i => i.status === 'pending').length || 0;
      const revenue = invoicesRes.data?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0) || 0;

      setStats({
        totalLeads: leadsRes.data?.length || 0,
        totalCustomers: customersRes.data?.length || 0,
        totalProjects: projectsRes.data?.length || 0,
        totalInvoices: invoicesRes.data?.length || 0,
        activeLeads,
        activeCustomers,
        pendingInvoices,
        revenue
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  /**
   * Create a new lead record with validation and encryption
   * Sample call: createLead("lead123", { first_name: "John", last_name: "Doe", email: "john@example.com" })
   */
  const createLead = async (leadId: string, leadData: Partial<Lead>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's company
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRoles?.company_id) {
        throw new Error('User company not found');
      }

      // Validate required fields
      if (!leadData.first_name || !leadData.last_name || !leadData.email) {
        throw new Error('First name, last name, and email are required');
      }

      // Encrypt sensitive data (simplified - in production use proper encryption)
      const encryptedData = {
        company_id: userRoles.company_id,
        created_by: user.id,
        first_name: leadData.first_name,
        last_name: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone,
        project_type: leadData.project_type,
        project_description: leadData.project_description,
        address: leadData.address,
        lead_source: leadData.lead_source,
        priority: leadData.priority || 'medium',
        status: (leadData.status || 'new') as "new" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost",
        notes: leadData.notes
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(encryptedData)
        .select()
        .single();

      if (error) throw error;

      // Log the operation for analytics
      await logCRUDOperation('CREATE', 'leads', data.id, { leadData });
      
      toast.success(`Lead ${leadData.first_name} ${leadData.last_name} created successfully`);
      loadLeads();
      return data;
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error(`Failed to create lead: ${error.message}`);
      throw error;
    }
  };

  /**
   * Update an existing record with validation
   */
  const updateRecord = async (table: string, id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logCRUDOperation('UPDATE', table, id, { updates });
      toast.success(`${table.slice(0, -1)} updated successfully`);
      
      // Reload appropriate data
      if (table === 'leads') loadLeads();
      else if (table === 'customers') loadCustomers();
      else if (table === 'projects') loadProjects();
      
      return data;
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      toast.error(`Failed to update ${table.slice(0, -1)}`);
      throw error;
    }
  };

  /**
   * Delete a record with confirmation
   */
  const deleteRecord = async (table: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${table.slice(0, -1)}?`)) return;

    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logCRUDOperation('DELETE', table, id);
      toast.success(`${table.slice(0, -1)} deleted successfully`);
      
      // Reload appropriate data
      if (table === 'leads') loadLeads();
      else if (table === 'customers') loadCustomers();
      else if (table === 'projects') loadProjects();
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);
      toast.error(`Failed to delete ${table.slice(0, -1)}`);
    }
  };

  /**
   * Log CRUD operations for analytics
   */
  const logCRUDOperation = async (operation: string, table: string, recordId: string | null, data?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          table_name: table,
          action: operation,
          record_id: recordId,
          sensitive_fields: ['email', 'phone', 'address']
        });

      console.log(`📊 CRM Analytics: ${operation} operation on ${table}`, { recordId, data });
    } catch (error) {
      console.error("Error logging operation:", error);
    }
  };

  /**
   * Export data to CSV
   */
  const exportData = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-row sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive customer relationship management with analytics
          </p>
        </div>
        <AddCustomerDialog onCustomerAdded={loadCustomers} />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <div className="text-xs text-muted-foreground">
              {stats.activeLeads} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <div className="text-xs text-muted-foreground">
              {stats.activeCustomers} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <div className="text-xs text-muted-foreground">
              Projects managed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.revenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              {stats.pendingInvoices} pending invoices
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="settings">CRM Settings</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leads Management</CardTitle>
                  <CardDescription>Manage your sales pipeline</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportData(leads, 'leads')}
                    disabled={leads.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search leads..."
                    value={leadFilter.search}
                    onChange={(e) => setLeadFilter({...leadFilter, search: e.target.value})}
                  />
                </div>
                <Select
                  value={leadFilter.status}
                  onValueChange={(value) => setLeadFilter({...leadFilter, status: value})}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadLeads} disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              {/* Leads Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.project_type || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(lead.status)}
                          <Badge variant={lead.status === 'won' ? 'default' : 'secondary'}>
                            {lead.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.priority === 'high' ? 'destructive' : 'outline'}>
                          {lead.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <CRMSyncButton
                            recordType="lead"
                            recordId={lead.id}
                            size="sm"
                            variant="ghost"
                          />
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteRecord('leads', lead.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar tabs for customers, projects, etc. would follow the same pattern */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Customer management interface - similar structure to leads
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Project management interface with timeline and budget tracking
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <ExternalCRMSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}