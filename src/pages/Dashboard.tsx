import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  CreditCard, 
  Star, 
  Share2, 
  Calendar,
  Bell,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeLeads: 0,
    pendingPayments: 0,
    last7DaysRevenue: 0,
    averageRating: 0
  });
  const [recentActivity, setRecentActivity] = useState<Array<{type: string, message: string, time: string}>>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Array<{message: string, dueDate: string}>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
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

      // Fetch active leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('status')
        .in('status', ['new', 'contacted', 'qualified']);

      // Fetch pending payments
      const { data: invoicesData } = await supabase
        .from('construyo_invoices')
        .select('amount, status')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // Calculate last 7 days revenue
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: revenueData } = await supabase
        .from('construyo_invoices')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .gte('paid_date', sevenDaysAgo.toISOString());

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('construyo_reviews')
        .select('rating')
        .eq('user_id', user.id)
        .eq('status', 'published');

      // Fetch recent activity (lead activities, customer interactions, etc)
      const { data: leadActivities } = await supabase
        .from('lead_activities')
        .select('activity_type, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      const activeLeads = leadsData?.length || 0;
      const pendingPayments = invoicesData?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const last7DaysRevenue = revenueData?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
      const avgRating = reviewsData?.length > 0
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
        : 0;

      setStats({
        activeLeads,
        pendingPayments,
        last7DaysRevenue,
        averageRating: Number(avgRating.toFixed(1))
      });

      // Set recent activity with fallback dummy data
      if (leadActivities && leadActivities.length > 0) {
        setRecentActivity(leadActivities.map(activity => ({
          type: activity.activity_type,
          message: activity.description,
          time: getTimeAgo(activity.created_at)
        })));
      } else {
        setRecentActivity([
          { type: "lead", message: "New lead from WhatsApp referral", time: "2 hours ago" },
          { type: "payment", message: "Payment received from client", time: "4 hours ago" },
          { type: "review", message: "5-star review received", time: "1 day ago" },
          { type: "social", message: "Project photos posted", time: "2 days ago" }
        ]);
      }

      // Set upcoming tasks with dummy data for now
      setUpcomingTasks([
        { message: "Follow up with kitchen extension lead", dueDate: "Tomorrow" },
        { message: "Send invoice to completed project", dueDate: "Friday" },
        { message: "Request review from satisfied customer", dueDate: "Next week" }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  const quickActions = [
    { label: "Create Invoice", icon: FileText, href: "/invoices" },
    { label: "Add Lead", icon: Users, href: "/leads" },
    { label: "Request Review", icon: Star, href: "/reviews" },
    { label: "Schedule Post", icon: Share2, href: "/social" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your business.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLeads}</div>
              <p className="text-xs text-muted-foreground">Current pipeline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <FileText className="w-4 h-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.pendingPayments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Outstanding invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days Revenue</CardTitle>
              <CreditCard className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{stats.last7DaysRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Recent income</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">Customer reviews</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions - Moved up */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks to keep your business running smoothly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <Link key={index} to={action.href}>
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 flex flex-col items-center gap-2"
                      >
                        <action.icon className="w-6 h-6" />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-accent-foreground' : 
                      index === 1 ? 'bg-success' : 'bg-primary'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm">{task.message}</p>
                      <p className="text-xs text-muted-foreground">{task.dueDate}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;