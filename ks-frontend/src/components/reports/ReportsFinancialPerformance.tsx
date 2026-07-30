import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInBusinessDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialMetrics {
  totalRevenue: number;
  totalCost: number;
  totalEstimatedRevenue: number;
  totalEstimatedCosts: number;
  totalBaseCosts: number;
  netProfit: number;
  profitMargin: number;
  activeMatters: number;
  avgMatterValue: number;
}

interface MonthlyData {
  month: string;
  totalRevenue: number;
  totalCosts: number;
  totalEstimatedRevenue: number;
  totalEstimatedCosts: number;
}

export function ReportsFinancialPerformance() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalCost: 0,
    totalEstimatedRevenue: 0,
    totalEstimatedCosts: 0,
    totalBaseCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    activeMatters: 0,
    avgMatterValue: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    loadFinancialMetrics();
    loadMonthlyData();
  }, []);

  const getDateFilter = () => {
    // Use all-time data by default to match Admin Controls
    return new Date(2020, 0, 1);
  };

  const loadFinancialMetrics = async () => {
    try {
      setLoading(true);
      const startDate = getDateFilter();
      
      const { data: matters, error: matterError } = await supabase
        .from('matters')
        .select('*')
        .eq('status', 'active');
      
      if (matterError) {
        console.error('Error fetching matters:', matterError);
        return;
      }

      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          tasks!inner(matter_id, assigned_to),
          profiles!left(cost_rate)
        `)
        .gte('date', format(startDate, 'yyyy-MM-dd'));

      if (timeError) {
        console.error('Error fetching time entries:', timeError);
        return;
      }

      const totalRevenue = timeEntries?.reduce((sum, entry) => {
        if (entry.billable) {
          return sum + (entry.hours * (entry.hourly_rate || 0));
        }
        return sum;
      }, 0) || 0;

      const totalCost = timeEntries?.reduce((sum, entry) => {
        const costRate = entry.profiles?.cost_rate || 0;
        return sum + (entry.hours * costRate);
      }, 0) || 0;

      const { data: taskAssignments } = await supabase
        .from('task_assignments')
        .select(`
          estimated_hours,
          tasks!inner(matter_id, matters!inner(status, hourly_rate)),
          profiles!left(cost_rate)
        `)
        .eq('tasks.matters.status', 'active');

      const totalEstimatedRevenue = taskAssignments?.reduce((sum, assignment) => {
        const hourlyRate = assignment.tasks?.matters?.hourly_rate || 0;
        return sum + (assignment.estimated_hours * hourlyRate);
      }, 0) || 0;

      const totalEstimatedCosts = taskAssignments?.reduce((sum, assignment) => {
        const costRate = assignment.profiles?.cost_rate || 0;
        return sum + (assignment.estimated_hours * costRate);
      }, 0) || 0;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('cost_rate, created_at')
        .neq('role', 'inactive');

      const now = new Date();
      const periodStartDate = getDateFilter();
      let totalBaseCosts = 0;

      profiles?.forEach(profile => {
        const costRate = profile.cost_rate || 0;
        const profileCreatedAt = new Date(profile.created_at || periodStartDate);
        
        const actualStartDate = profileCreatedAt > periodStartDate ? profileCreatedAt : periodStartDate;
        const businessDays = differenceInBusinessDays(now, actualStartDate);
        
        totalBaseCosts += costRate * 7.5 * Math.max(0, businessDays);
      });

      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalCost > 0 ? (totalRevenue / totalCost) : 0;
      const activeMatters = matters?.length || 0;
      const avgMatterValue = activeMatters > 0 ? totalRevenue / activeMatters : 0;
      
      setMetrics({
        totalRevenue,
        totalCost,
        totalEstimatedRevenue,
        totalEstimatedCosts,
        totalBaseCosts,
        netProfit,
        profitMargin,
        activeMatters,
        avgMatterValue
      });
    } catch (error) {
      console.error('Error loading financial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const loadMonthlyData = async () => {
    try {
      // Use the new Supabase function to get monthly financial report
      const { data, error } = await supabase.rpc('get_monthly_financial_report', {
        months_back: 12
      });

      if (error) {
        console.error('Error loading monthly financial data:', error);
        return;
      }

      if (data) {
        const allMonthlyData: MonthlyData[] = data
          .map((row: any) => ({
            month: row.month_year,
            totalRevenue: row.total_revenue || 0,
            totalCosts: row.total_costs || 0,
            totalEstimatedRevenue: row.total_estimated_revenue || 0,
            totalEstimatedCosts: row.total_estimated_costs || 0
          }));

        // Find months with non-zero values
        const nonZeroMonths = allMonthlyData.filter((row: MonthlyData) => 
          row.totalRevenue > 0 || 
          row.totalCosts > 0 || 
          row.totalEstimatedRevenue > 0 || 
          row.totalEstimatedCosts > 0
        );

        if (nonZeroMonths.length === 0) {
          setMonthlyData([]);
          return;
        }

        // Find the date range of non-zero months
        const nonZeroIndices = nonZeroMonths.map(nonZeroRow => 
          allMonthlyData.findIndex(row => row.month === nonZeroRow.month)
        );
        
        const minIndex = Math.min(...nonZeroIndices);
        const maxIndex = Math.max(...nonZeroIndices);
        
        // Add buffer months (one before and after)
        const startIndex = Math.max(0, minIndex - 1);
        const endIndex = Math.min(allMonthlyData.length - 1, maxIndex + 1);
        
        // Extract the filtered data with buffer months
        const filteredData = allMonthlyData.slice(startIndex, endIndex + 1);
        
        // Reverse to show oldest to newest
        setMonthlyData(filteredData.reverse());
      }
    } catch (error) {
      console.error('Error loading monthly data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Financial Performance Report</h3>
      </div>

      {/* Financial Overview Cards - Read Only */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-burgundy" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : formatCurrency(metrics.totalRevenue)}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : formatCurrency(metrics.totalEstimatedRevenue)}
                </div>
                <div className="text-sm text-muted-foreground">Total Estimated Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : formatCurrency(metrics.netProfit)}
                </div>
                <div className="text-sm text-muted-foreground">Net Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : `${metrics.profitMargin.toFixed(2)}x`}
                </div>
                <div className="text-sm text-muted-foreground">Profit Margin (Revenue/Cost)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Cost Metrics - Read Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : formatCurrency(metrics.totalEstimatedCosts)}
                </div>
                <div className="text-sm text-muted-foreground">Total Estimated Costs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : formatCurrency(metrics.totalBaseCosts)}
                </div>
                <div className="text-sm text-muted-foreground">Total Base Costs (Current Resource Profile)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Financial Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Financial Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="hsl(var(--primary-burgundy))" 
                  strokeWidth={2}
                  name="Total Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCosts" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Total Costs"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalEstimatedRevenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Total Est. Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalEstimatedCosts" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Total Est. Costs"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dashboard - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsDashboard autoLoad={true} />
        </CardContent>
      </Card>
    </div>
  );
}