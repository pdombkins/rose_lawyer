import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/ProfileHeader";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/hooks/useAuth";
import MattersList from "@/components/dashboard/MattersList";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  Users, 
  Clock, 
  FileText, 
  BarChart3, 
  Settings,
  Plus,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedProfile } = useProfile();
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeMatters: 0,
    timeLoggedThisWeek: 0,
    revenueThisMonth: 0,
    openTasks: 0
  });
  const [tasks, setTasks] = useState([]);

  const displayName = selectedProfile?.name || 'User';

  // Quick actions data
  const quickActions = [
    {
      title: "Client Management",
      description: "Manage clients and matters",
      icon: Users,
      path: "/dashboard/crm",
      color: "bg-blue-500"
    },
    {
      title: "Time Entry",
      description: "Record billable hours",
      icon: Clock,
      path: "/dashboard/time-entry",
      color: "bg-green-500"
    },
    {
      title: "Calendar",
      description: "Schedule and appointments",
      icon: Calendar,
      path: "/dashboard/calendar",
      color: "bg-purple-500"
    },
    {
      title: "Knowledge Library",
      description: "Legal resources and documents",
      icon: FileText,
      path: "/dashboard/knowledge",
      color: "bg-orange-500"
    },
    {
      title: "Reports",
      description: "Analytics and insights",
      icon: BarChart3,
      path: "/dashboard/reports",
      color: "bg-indigo-500"
    },
    {
      title: "Admin Controls",
      description: "System administration",
      icon: Settings,
      path: "/dashboard/admin",
      color: "bg-red-500"
    }
  ];

  useEffect(() => {
    fetchDashboardStats();
    fetchUserTasks();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch active matters count - Administrator sees all matters
      const { count: matterCount } = await supabase
        .from('matters')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch this week's time entries
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('hours')
        .gte('date', oneWeekAgo.toISOString().split('T')[0]);

      const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;

      // Fetch this month's revenue
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: monthlyEntries } = await supabase
        .from('matter_time_ledger')
        .select('cost')
        .gte('date', firstDayOfMonth.toISOString().split('T')[0]);

      const monthlyRevenue = monthlyEntries?.reduce((sum, entry) => sum + (entry.cost || 0), 0) || 0;

      // Fetch pending tasks count
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      setStats({
        activeMatters: matterCount || 0,
        timeLoggedThisWeek: totalHours,
        revenueThisMonth: monthlyRevenue,
        openTasks: tasksCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchUserTasks = async () => {
    try {
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('due_date', { ascending: true })
        .limit(5);

      // Fetch matter details separately
      const matterIds = [...new Set(userTasks?.map(t => t.matter_id).filter(Boolean) || [])];
      const { data: mattersData } = await supabase
        .from('matters')
        .select('id, title, client_id')
        .in('id', matterIds);

      // Fetch client names separately
      const clientIds = [...new Set(mattersData?.map(m => m.client_id).filter(Boolean) || [])];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      // Create lookup maps
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.name]) || []);
      const mattersMap = new Map(mattersData?.map(m => [m.id, { title: m.title, client: { name: clientsMap.get(m.client_id) } }]) || []);

      // Transform tasks with matter/client info
      const tasksWithDetails = userTasks?.map(task => ({
        ...task,
        matter: mattersMap.get(task.matter_id) || { title: 'Unknown Matter', client: { name: 'Unknown Client' } }
      })) || [];

      setTasks(tasksWithDetails);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    }
  };

  const statsData = [
    {
      title: "Active Matters",
      value: stats.activeMatters.toString(),
      description: "Currently handling",
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Time Logged",
      value: `${stats.timeLoggedThisWeek.toFixed(1)}h`,
      description: "This week",
      icon: Clock,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Revenue Generated",
      value: `$${(stats.revenueThisMonth / 1000).toFixed(1)}K`,
      description: "This month",
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Open Tasks",
      value: stats.openTasks.toString(),
      description: "Require attention",
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <ProfileHeader />

        <div className="mb-8">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            Welcome back, {displayName.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">
            Here's an overview of your practice management system
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.title}</div>
                    <div className="text-xs text-muted-foreground">{stat.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions - Shorter Height */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions
              .filter(action => action.title !== "Admin Controls" || isAdmin)
              .map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-12 px-3 flex items-center justify-start space-x-2 hover:shadow-md transition-all hover:border-primary/20"
                onClick={() => navigate(action.path)}
              >
                <div className={`w-6 h-6 ${action.color}/10 rounded flex items-center justify-center flex-shrink-0`}>
                  <action.icon className={`w-3 h-3 text-${action.color.split('-')[1]}-500`} />
                </div>
                <span className="font-medium text-xs truncate">{action.title}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Matters - Left Side */}
          <div>
            <MattersList />
          </div>

          {/* Open Tasks - Right Side */}
          <div>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-xl text-foreground">
                  My Open Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.length > 0 ? tasks.map((task) => (
                    <Card 
                      key={task.id} 
                      className="cursor-pointer transition-all hover:shadow-md border-border/50 hover:border-primary/20"
                      onClick={() => navigate(`/dashboard/matter/${task.matter_id}?tab=tasks&editTask=${task.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center mt-1">
                              <FileText className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-foreground text-sm">
                                  {task.title}
                                </h4>
                                <Badge variant="secondary" className="text-xs">
                                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {task.description}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>Matter: {task.matter?.title || 'Unknown'}</span>
                                <span>•</span>
                                <span>{task.priority || 'Medium'} Priority</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No open tasks assigned to you.</p>
                    </div>
                  )}
                </div>

                {/* Quick Create Task Button */}
                <div className="mt-6 pt-4 border-t border-border">
                  <Button 
                    className="w-full" 
                    onClick={() => navigate('/dashboard/tasks')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Task
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}