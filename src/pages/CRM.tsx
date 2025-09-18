import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building, TrendingUp, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CRMDashboard from "@/components/CRMDashboard";

export default function CRM() {
  // Fetch CRM stats
  const { data: stats } = useQuery({
    queryKey: ['crm-stats'],
    queryFn: async () => {
      const [leadsResult, customersResult] = await Promise.all([
        supabase
          .from('leads')
          .select('status, priority', { count: 'exact' }),
        supabase
          .from('customers')
          .select('status', { count: 'exact' })
      ]);

      const leadsByStatus = leadsResult.data?.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const customersByStatus = customersResult.data?.reduce((acc, customer) => {
        acc[customer.status] = (acc[customer.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalLeads: leadsResult.count || 0,
        totalCustomers: customersResult.count || 0,
        leadsByStatus,
        customersByStatus,
        conversionRate: leadsResult.count ? Math.round(((leadsByStatus.won || 0) / leadsResult.count) * 100) : 0
      };
    }
  });

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">CRM Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your leads and customers with complete tenant isolation and role-based access.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.leadsByStatus?.new || 0} new leads
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            <div className="text-xs text-muted-foreground">
              {stats?.customersByStatus?.active || 0} active customers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <div className="text-xs text-muted-foreground">
              Leads to customers
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Leads</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.leadsByStatus?.won || 0}</div>
            <div className="text-xs text-muted-foreground">
              Successfully converted
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Breakdown</CardTitle>
            <CardDescription>Current status of all leads in your pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.leadsByStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`
                        ${status === 'new' ? 'bg-blue-500' : ''}
                        ${status === 'contacted' ? 'bg-yellow-500' : ''}
                        ${status === 'qualified' ? 'bg-green-500' : ''}
                        ${status === 'proposal_sent' ? 'bg-purple-500' : ''}
                        ${status === 'won' ? 'bg-emerald-500' : ''}
                        ${status === 'lost' ? 'bg-red-500' : ''}
                        text-white
                      `}
                    >
                      {status}
                    </Badge>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Status Overview</CardTitle>
            <CardDescription>Status distribution of your customer base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.customersByStatus || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`
                        ${status === 'active' ? 'bg-green-500' : ''}
                        ${status === 'inactive' ? 'bg-yellow-500' : ''}
                        ${status === 'archived' ? 'bg-gray-500' : ''}
                        text-white
                      `}
                    >
                      {status}
                    </Badge>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Dashboard */}
      <CRMDashboard />
    </div>
  );
}