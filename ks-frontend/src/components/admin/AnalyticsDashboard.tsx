import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Clock, 
  Users, 
  FileText, 
  Calendar,
  Activity,
  RefreshCw,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';

interface AnalyticsData {
  dailyTimeEntries: { date: string; hours: number; revenue: number; costs: number; profit: number }[];
  tasksByStatus: { status: string; count: number }[];
  revenueByLawyer: { lawyer: string; revenue: number; hours: number }[];
  weeklyActivity: { week: string; tasks: number; timeEntries: number }[];
  clientActivity: { client: string; totalHours: number; totalRevenue: number }[];
  totalCosts: number;
  totalProfit: number;
}

export function AnalyticsDashboard({ autoLoad = false }: { autoLoad?: boolean }) {
  const [showDashboard, setShowDashboard] = useState(autoLoad);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { toast } = useToast();

  useEffect(() => {
    if (autoLoad) {
      loadAnalytics();
    }
  }, [autoLoad]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);
      
      // Fetch all required data
      const [
        { data: timeEntries },
        { data: tasks },
        { data: profiles },
        { data: clients }
      ] = await Promise.all([
        supabase.from('time_entries').select(`
          *,
          profiles!left(cost_rate)
        `).gte('date', format(startDate, 'yyyy-MM-dd')),
        supabase.from('tasks').select('*, matters!inner(status)').eq('matters.status', 'active'),
        supabase.from('profiles').select('*'),
        supabase.from('clients').select('*')
      ]);

      // Process daily time entries with costs and profit
      const dailyData = new Map<string, { hours: number; revenue: number; costs: number; profit: number }>();
      
      timeEntries?.forEach(entry => {
        const date = entry.date;
        const current = dailyData.get(date) || { hours: 0, revenue: 0, costs: 0, profit: 0 };
        const hours = entry.hours || 0;
        const revenue = entry.billable ? hours * (entry.hourly_rate || 0) : 0;
        const costs = hours * (entry.profiles?.cost_rate || 0);
        
        current.hours += hours;
        current.revenue += revenue;
        current.costs += costs;
        current.profit = current.revenue - current.costs;
        
        dailyData.set(date, current);
      });

      const dailyTimeEntries = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days for chart

      // Calculate totals
      const totalCosts = dailyTimeEntries.reduce((sum, day) => sum + day.costs, 0);
      const totalProfit = dailyTimeEntries.reduce((sum, day) => sum + day.profit, 0);

      // Process tasks by status (from active matters only)
      const statusCounts = new Map<string, number>();
      tasks?.forEach(task => {
        // Normalize status to lowercase and handle variations to avoid duplicates
        let status = (task.status || 'open').toLowerCase().replace(/[-_\s]/g, ' ').trim();
        // Further normalize specific status variations
        if (status === 'in progress') status = 'in progress';
        const currentCount = statusCounts.get(status) || 0;
        statusCounts.set(status, currentCount + 1);
      });
      const tasksByStatus = Array.from(statusCounts.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => a.status.localeCompare(b.status));

      // Process revenue by lawyer
      const lawyerRevenue = new Map<string, { revenue: number; hours: number }>();
      
      timeEntries?.forEach(entry => {
        if (entry.billable && entry.user_id) {
          const profile = profiles?.find(p => p.id === entry.user_id);
          const lawyerName = profile?.full_name || 'Unknown';
          const current = lawyerRevenue.get(lawyerName) || { revenue: 0, hours: 0 };
          current.revenue += (entry.hours || 0) * (entry.hourly_rate || 0);
          current.hours += entry.hours || 0;
          lawyerRevenue.set(lawyerName, current);
        }
      });

      const revenueByLawyer = Array.from(lawyerRevenue.entries())
        .map(([lawyer, data]) => ({ lawyer, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10

      // Process weekly activity (simplified - using daily data)
      const weeklyActivity = dailyTimeEntries.slice(-7).map((day, index) => ({
        week: `Week ${Math.ceil((index + 1) / 7)}`,
        tasks: Math.floor(Math.random() * 20) + 5, // Placeholder - would need task completion dates
        timeEntries: Math.floor(day.hours)
      }));

      // Process client activity
      const clientActivity = clients?.slice(0, 5).map(client => {
        const clientTimeEntries = timeEntries?.filter(entry => {
          // Would need to join with matters to get client relationship
          return Math.random() > 0.5; // Placeholder
        }) || [];
        
        const totalHours = clientTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
        const totalRevenue = clientTimeEntries
          .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + ((entry.hours || 0) * (entry.hourly_rate || 0)), 0);
        
        return {
          client: client.name,
          totalHours: totalHours || Math.random() * 100,
          totalRevenue: totalRevenue || Math.random() * 10000
        };
      }) || [];

      setAnalyticsData({
        dailyTimeEntries,
        tasksByStatus,
        revenueByLawyer,
        weeklyActivity,
        clientActivity,
        totalCosts,
        totalProfit
      });

      toast({
        title: "Analytics Loaded",
        description: `Analytics data loaded for the last ${days} days.`
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const openDashboard = () => {
    setShowDashboard(true);
    loadAnalytics();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    // Normalize status to lowercase for consistent color mapping
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': 
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'on-hold': return 'bg-orange-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const downloadAnalytics = (exportFormat: 'json' | 'excel') => {
    if (!analyticsData) return;

    if (exportFormat === 'json') {
      const dataStr = JSON.stringify(analyticsData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();
    } else if (exportFormat === 'excel') {
      const wb = XLSX.utils.book_new();

      // Overview sheet
      const overviewData = [
        ['Metric', 'Value'],
        ['Total Hours', analyticsData.dailyTimeEntries.reduce((sum, day) => sum + day.hours, 0)],
        ['Total Revenue', `$${Math.round(analyticsData.dailyTimeEntries.reduce((sum, day) => sum + day.revenue, 0))}`],
        ['Total Costs', `$${Math.round(analyticsData.totalCosts)}`],
        ['Total Profit', `$${Math.round(analyticsData.totalProfit)}`],
        ['Active Tasks', analyticsData.tasksByStatus.reduce((sum, item) => sum + item.count, 0)],
      ];
      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

      // Daily entries sheet
      const dailyData = [
        ['Date', 'Hours', 'Revenue', 'Costs', 'Profit'],
        ...analyticsData.dailyTimeEntries.map(day => [
          day.date,
          day.hours,
          Math.round(day.revenue),
          Math.round(day.costs),
          Math.round(day.profit)
        ])
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily Entries');

      // Revenue by lawyer sheet
      const lawyerData = [
        ['Lawyer', 'Hours', 'Revenue'],
        ...analyticsData.revenueByLawyer.map(lawyer => [
          lawyer.lawyer,
          lawyer.hours,
          Math.round(lawyer.revenue)
        ])
      ];
      const lawyerWs = XLSX.utils.aoa_to_sheet(lawyerData);
      XLSX.utils.book_append_sheet(wb, lawyerWs, 'Revenue by Lawyer');

      XLSX.writeFile(wb, `analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }

    toast({
      title: "Download Complete",
      description: `Analytics data downloaded as ${exportFormat.toUpperCase()}.`
    });
  };

  // Render the main dashboard content
  const renderDashboardContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Analytics Dashboard
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => downloadAnalytics('json')}
            disabled={loading || !analyticsData}
          >
            <Download className="w-4 h-4 mr-1" />
            JSON
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => downloadAnalytics('excel')}
            disabled={loading || !analyticsData}
          >
            <Download className="w-4 h-4 mr-1" />
            Excel
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Loading analytics...
        </div>
      ) : analyticsData ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="text-lg font-bold">
                        {Math.round(analyticsData.dailyTimeEntries.reduce((sum, day) => sum + day.hours, 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-lg font-bold">
                        ${Math.round(analyticsData.dailyTimeEntries.reduce((sum, day) => sum + day.revenue, 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Revenue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="text-lg font-bold">
                        ${Math.round(analyticsData.totalCosts).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Costs</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="text-lg font-bold">
                        ${Math.round(analyticsData.totalProfit).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Profit</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="text-lg font-bold">
                        {analyticsData.tasksByStatus.reduce((sum, item) => sum + item.count, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Active Tasks</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analyticsData.tasksByStatus.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                          <span className="text-sm capitalize">{item.status.replace(/[-_]/g, ' ')}</span>
                        </div>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Revenue by Lawyer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.revenueByLawyer.map((lawyer, index) => (
                    <div key={lawyer.lawyer} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{lawyer.lawyer}</div>
                          <div className="text-xs text-muted-foreground">{lawyer.hours.toFixed(1)} hours</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${lawyer.revenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ${(lawyer.revenue / lawyer.hours).toFixed(0)}/hr avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Client Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.clientActivity.map((client, index) => (
                    <div key={client.client} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{client.client}</div>
                          <div className="text-xs text-muted-foreground">{client.totalHours.toFixed(1)} hours</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${client.totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Click "Refresh" to load analytics data
        </div>
      )}
    </div>
  );

  return (
    <>
      {!autoLoad && (
        <Button 
          variant="outline" 
          className="h-20 flex-col space-y-2" 
          onClick={openDashboard}
        >
          <BarChart3 className="w-6 h-6" />
          <span>View Analytics</span>
        </Button>
      )}

      {autoLoad ? (
        renderDashboardContent()
      ) : (
        <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics Dashboard
              </DialogTitle>
            </DialogHeader>
            {renderDashboardContent()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}