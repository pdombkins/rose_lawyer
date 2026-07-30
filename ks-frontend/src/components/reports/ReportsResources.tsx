import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Clock, 
  TrendingUp,
  Filter
} from "lucide-react";
import { 
  getBillableTarget, 
  UtilizationData
} from "@/utils/utilizationCalculator";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, addMonths } from "date-fns";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';

// Import staff headshot images
import aishaRahmanHeadshot from '@/assets/staff/aisha-rahman-headshot.jpg';
import danielParkHeadshot from '@/assets/staff/daniel-park-headshot.jpg';
import davidOconnellHeadshot from '@/assets/staff/david-oconnell-headshot.jpg';
import jamesBentleyHeadshot from '@/assets/staff/james-bentley-headshot.jpg';
import lilyChenHeadshot from '@/assets/staff/lily-chen-headshot.jpg';
import miaRossiHeadshot from '@/assets/staff/mia-rossi-headshot.jpg';
import priyaIyerHeadshot from '@/assets/staff/priya-iyer-headshot.jpg';
import tomNguyenHeadshot from '@/assets/staff/tom-nguyen-headshot.jpg';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant';
  chargeRate: number;
  costRate: number;
  avatar: string;
  isActive: boolean;
}

interface PivotRow {
  userId: string;
  userName: string;
  role: string;
  months: { [monthKey: string]: { historical: number; projected: number; type: 'historical' | 'projected' | 'mixed' } };
}

interface ChartData {
  month: string;
  [key: string]: string | number;
}

export function ReportsResources() {
  const [users, setUsers] = useState<User[]>([]);
  const [billableTarget, setBillableTarget] = useState(6);
  const [loading, setLoading] = useState(true);
  
  // Filtering state - only role filter
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Utilization type state
  const [utilizationType, setUtilizationType] = useState<'actual' | 'projected'>('actual');

  useEffect(() => {
    loadResourceData();
  }, []);

  const loadResourceData = async () => {
    try {
      setLoading(true);
      
      // Load billable target
      const target = await getBillableTarget();
      setBillableTarget(target);
      
      // Load user data from Supabase profiles table (filter out Peter Dombkins)
      console.log('Fetching profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, hourly_rate, cost_rate, avatar_url')
        .neq('role', 'inactive')
        .neq('id', '8bba6096-1be7-4cc9-bccd-98b5da79e41a') // Hide Peter Dombkins
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles fetched successfully:', profilesData?.length, 'profiles');

      const formattedUsers: User[] = (profilesData || []).map(profile => {
        // Fix role mapping to handle database role formats
        let mappedRole: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant' = 'Legal Assistant';
        const roleStr = (profile.role || '').toString().toLowerCase().trim();
        
        if (roleStr === 'partner') mappedRole = 'Partner';
        else if (roleStr === 'senior_associate') mappedRole = 'Senior Associate';
        else if (roleStr === 'junior_associate' || roleStr === 'associate') mappedRole = 'Junior Associate';
        else if (roleStr === 'paralegal' || roleStr === 'legal_assistant') mappedRole = 'Legal Assistant';
        
        console.log('Mapping user:', profile.full_name, 'role:', profile.role, '->', mappedRole);
        
        // Map names to their headshot images
        const getAvatarUrl = (fullName: string) => {
          const nameMap: { [key: string]: string } = {
            'Aisha Rahman': aishaRahmanHeadshot,
            'Daniel Park': danielParkHeadshot,
            'David O\'Connell': davidOconnellHeadshot,
            'James Bentley': jamesBentleyHeadshot,
            'Lily Chen': lilyChenHeadshot,
            'Mia Rossi': miaRossiHeadshot,
            'Priya Iyer': priyaIyerHeadshot,
            'Tom Nguyen': tomNguyenHeadshot
          };
          return nameMap[fullName] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';
        };
        
        return {
          id: profile.id,
          name: profile.full_name || 'Unknown User',
          email: profile.email || '',
          role: mappedRole,
          chargeRate: profile.hourly_rate || 0,
          costRate: profile.cost_rate || 0,
          avatar: getAvatarUrl(profile.full_name || ''),
          isActive: true
        };
      });

      console.log('Users formatted:', formattedUsers.length, 'users processed');
      setUsers(formattedUsers);
      
    } catch (error) {
      console.error('Error loading resource data:', error);
      // Don't set fallback users - let the error state show
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Partner':
        return 'bg-primary-burgundy text-primary-foreground';
      case 'Senior Associate':
        return 'bg-gold/20 text-gold-foreground';
      case 'Junior Associate':
        return 'bg-blue-500/20 text-blue-700';
      case 'Legal Assistant':
        return 'bg-green-500/20 text-green-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-green-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Create pivot data based on utilization type selection
  const createPivotData = async (): Promise<{ pivotData: PivotRow[], monthColumns: string[] }> => {
      console.log('Creating pivot data for utilization type:', utilizationType);
      const userMap = new Map<string, PivotRow>();
      const monthsSet = new Set<string>();

      // Initialize user rows with correct roles
      users.forEach(user => {
        console.log('Initializing user:', user.name, 'with role:', user.role);
        userMap.set(user.id, {
          userId: user.id,
          userName: user.name,
          role: user.role,
          months: {}
        });
      });

      console.log('Initialized user map with', userMap.size, 'users');

    // Generate month columns for 6 months before and 6 months after current date
    const currentDate = new Date();
    for (let i = -6; i <= 6; i++) {
      const monthDate = addMonths(currentDate, i);
      const monthKey = format(monthDate, 'MMM yyyy');
      monthsSet.add(monthKey);
    }

    console.log('Generated months:', Array.from(monthsSet));

    try {
      const startDate = subMonths(new Date(), 6);
      const endDate = addMonths(new Date(), 6);
      const currentMonth = format(new Date(), 'MMM yyyy');

      if (utilizationType === 'actual') {
        // Actual utilization: use recorded time for historical months only
        const { data: timeEntries, error: timeError } = await supabase
          .from('time_entries')
          .select('user_id, date, hours')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        console.log('Time entries query result:', {
          timeEntriesCount: timeEntries?.length || 0,
          error: timeError,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          sampleEntries: timeEntries?.slice(0, 3)
        });

        if (!timeError && timeEntries) {
          const userMonthlyHours = new Map<string, Map<string, number>>();
          
          console.log('Processing time entries...');
          timeEntries.forEach(entry => {
            if (entry.user_id) {
              const entryDate = new Date(entry.date);
              const monthKey = format(entryDate, 'MMM yyyy');
              console.log('Processing entry:', { user_id: entry.user_id, date: entry.date, hours: entry.hours, monthKey });
              
              if (!userMonthlyHours.has(entry.user_id)) {
                userMonthlyHours.set(entry.user_id, new Map());
              }
              
              const userMonthMap = userMonthlyHours.get(entry.user_id)!;
              const currentHours = userMonthMap.get(monthKey) || 0;
              userMonthMap.set(monthKey, currentHours + (entry.hours || 0));
            }
          });

          console.log('User monthly hours aggregated:', Array.from(userMonthlyHours.entries()).map(([userId, monthMap]) => 
            [userId, Array.from(monthMap.entries())]
          ));

          // Calculate utilization for historical months only
          userMonthlyHours.forEach((monthHours, userId) => {
            const userRow = userMap.get(userId);
            if (userRow) {
              monthHours.forEach((totalHours, monthKey) => {
                // Only show data for historical months (up to and including current month)
                if (monthKey <= currentMonth) {
                  const [monthName, yearStr] = monthKey.split(' ');
                  const year = parseInt(yearStr);
                  const month = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
                  const businessDays = getBusinessDaysInMonth(year, month);
                  const targetHours = businessDays * billableTarget;
                  
                  const utilizationPercent = (totalHours / targetHours) * 100;
                  
                  userRow.months[monthKey] = {
                    historical: utilizationPercent,
                    projected: 0,
                    type: 'historical'
                  };
                }
              });
            }
          });
        }
      } else {
        // Projected utilization: use estimated hours for all months
        const { data: taskAssignments, error: taskError } = await supabase
          .from('task_assignments')
          .select(`
            user_id,
            estimated_hours,
            task:tasks!inner(
              title,
              commencement_date,
              due_date,
              matter:matters!inner(status)
            )
          `)
          .eq('tasks.matters.status', 'active');

        console.log('Task assignments query result:', {
          taskAssignmentsCount: taskAssignments?.length || 0,
          error: taskError
        });

        if (!taskError && taskAssignments) {
          taskAssignments.forEach(assignment => {
            const { user_id, estimated_hours, task } = assignment;
            if (user_id && task.commencement_date && estimated_hours > 0) {
              const taskStart = new Date(task.commencement_date);
              const taskEnd = task.due_date ? new Date(task.due_date) : addMonths(taskStart, 1);
              
              // Distribute hours across months between task start and end
              let currentTaskDate = new Date(taskStart);
              while (currentTaskDate <= taskEnd && currentTaskDate <= endDate) {
                const monthKey = format(currentTaskDate, 'MMM yyyy');
                const userRow = userMap.get(user_id);
                
                if (userRow) {
                  if (!userRow.months[monthKey]) {
                    userRow.months[monthKey] = { 
                      historical: 0, 
                      projected: 0, 
                      type: monthKey <= currentMonth ? 'historical' : 'projected' 
                    };
                  }
                  
                  // Estimate monthly hours (divide by number of months)
                  const totalMonths = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                  const monthlyHours = estimated_hours / totalMonths;
                  
                  const year = currentTaskDate.getFullYear();
                  const month = currentTaskDate.getMonth() + 1;
                  const businessDays = getBusinessDaysInMonth(year, month);
                  const targetHours = businessDays * billableTarget;
                  
                  const estimatedUtilization = (monthlyHours / targetHours) * 100;
                  
                  if (monthKey <= currentMonth) {
                    userRow.months[monthKey].historical += estimatedUtilization;
                  } else {
                    userRow.months[monthKey].projected += estimatedUtilization;
                  }
                }
                
                currentTaskDate = addMonths(currentTaskDate, 1);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error creating pivot data:', error);
    }

    const monthColumns = Array.from(monthsSet).sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });

    const pivotData = Array.from(userMap.values());
    return { pivotData, monthColumns };
  };

  // Helper function to calculate business days in a month
  const getBusinessDaysInMonth = (year: number, month: number): number => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let businessDays = 0;
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        businessDays++;
      }
    }
    
    return businessDays;
  };

  // Filter pivot data by role only
  const filterPivotData = (data: PivotRow[]): PivotRow[] => {
    return data.filter(row => {
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      return matchesRole;
    });
  };

  // State for pivot data
  const [pivotData, setPivotData] = useState<PivotRow[]>([]);
  const [monthColumns, setMonthColumns] = useState<string[]>([]);

  // Load pivot data
  const loadPivotData = async () => {
    console.log('Loading pivot data...');
    const { pivotData: newPivotData, monthColumns: newMonthColumns } = await createPivotData();
    console.log('Pivot data loaded:', { 
      pivotDataLength: newPivotData.length, 
      monthColumnsLength: newMonthColumns.length,
      monthColumns: newMonthColumns,
      utilizationType 
    });
    setPivotData(newPivotData);
    setMonthColumns(newMonthColumns);
  };

  // Load pivot data when users, billable target, or utilization type changes
  useEffect(() => {
    if (users.length > 0) {
      loadPivotData();
    }
  }, [users, billableTarget, utilizationType]);

  const filteredPivotData = filterPivotData(pivotData);

  // Create chart data based on pivot data and utilization type
  const createChartData = (): ChartData[] => {
    const monthsData = new Map<string, ChartData>();
    
    // Initialize months data from pivot data
    filteredPivotData.forEach(row => {
      monthColumns.forEach(month => {
        if (!monthsData.has(month)) {
          monthsData.set(month, { month });
        }
        
        const monthData = monthsData.get(month)!;
        const rowData = row.months[month];
        
        if (rowData) {
          let utilization = 0;
          if (utilizationType === 'actual') {
            utilization = rowData.type === 'historical' ? rowData.historical : 0;
          } else {
            utilization = rowData.type === 'historical' ? rowData.historical : rowData.projected;
          }
          
          if (utilization > 0) {
            monthData[row.userName] = utilization;
          }
        }
      });
    });

    // Convert to array and filter to only include months with data + buffer
    const allChartData = Array.from(monthsData.values()).sort((a, b) => {
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [monthA, yearA] = a.month.split(' ');
      const [monthB, yearB] = b.month.split(' ');
      
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });

    // Find months with non-zero utilization data
    const nonZeroMonths = allChartData.filter(monthData => 
      users.some(user => {
        const value = monthData[user.name];
        return value && typeof value === 'number' && value > 0;
      })
    );

    if (nonZeroMonths.length === 0) {
      return [];
    }

    // Find the date range of non-zero months
    const nonZeroIndices = nonZeroMonths.map(nonZeroRow => 
      allChartData.findIndex(row => row.month === nonZeroRow.month)
    );
    
    const minIndex = Math.min(...nonZeroIndices);
    const maxIndex = Math.max(...nonZeroIndices);
    
    // Add buffer months (one before and after)
    const startIndex = Math.max(0, minIndex - 1);
    const endIndex = Math.min(allChartData.length - 1, maxIndex + 1);
    
    // Return the filtered data with buffer months
    return allChartData.slice(startIndex, endIndex + 1);
  };

  const chartData = createChartData();

  // Generate colors for each lawyer
  const generateLawyerColors = () => {
    const colors = [
      'hsl(var(--primary-burgundy))',
      'hsl(var(--gold))', 
      '#8B5CF6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#3B82F6',
      '#84CC16',
      '#F97316',
      '#06B6D4'
    ];
    
    const lawyerColors: { [key: string]: string } = {};
    users.forEach((user, index) => {
      lawyerColors[user.name] = colors[index % colors.length];
    });
    
    return lawyerColors;
  };

  const lawyerColors = generateLawyerColors();

  return (
    <div className="space-y-6">
      {/* Billable Target Display - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Current Billable Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary-burgundy">
            {billableTarget} hours per day
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This target is used for all utilization calculations.
          </p>
        </CardContent>
      </Card>

      {/* Team Members Display - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Team Members & Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Charge: ${user.chargeRate.toFixed(2)}/hr
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cost: ${user.costRate.toFixed(2)}/hr
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Utilization Overview - Read Only Pivot Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Resource Utilization Matrix
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={utilizationType} onValueChange={(value: 'actual' | 'projected') => setUtilizationType(value)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual">Actual utilisation (based on recorded time)</SelectItem>
                  <SelectItem value="projected">Projected utilisation (based on estimated time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter - Role only */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <Label>Filter by role:</Label>
            </div>
            <div className="w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Senior Associate">Senior Associate</SelectItem>
                  <SelectItem value="Junior Associate">Junior Associate</SelectItem>
                  <SelectItem value="Legal Assistant">Legal Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading utilization data...</div>
          ) : filteredPivotData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No utilization data found for the selected filters.
              <div className="text-xs mt-2">
                Debug: {pivotData.length} total users, {monthColumns.length} months, filter: {roleFilter}
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background min-w-48">Resource</TableHead>
                    <TableHead className="sticky left-48 bg-background min-w-32">Role</TableHead>
                    {monthColumns.map(month => (
                      <TableHead key={month} className="text-center min-w-24">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPivotData.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="sticky left-0 bg-background font-medium border-r">
                        {row.userName}
                      </TableCell>
                      <TableCell className="sticky left-48 bg-background border-r">
                        <Badge className={getRoleColor(row.role)} variant="secondary">
                          {row.role}
                        </Badge>
                      </TableCell>
                      {monthColumns.map(month => {
                        const monthData = row.months[month];
                        return (
                          <TableCell key={month} className="text-center">
                            {monthData ? (
                              <div className="space-y-1">
                                {monthData.type === 'mixed' ? (
                                  <>
                                    <div className={`text-xs ${getUtilizationColor(monthData.historical)}`}>
                                      H: {monthData.historical.toFixed(1)}%
                                    </div>
                                    <div className={`text-xs ${getUtilizationColor(monthData.projected)}`}>
                                      P: {monthData.projected.toFixed(1)}%
                                    </div>
                                  </>
                                ) : (
                                  <div className={`text-sm ${getUtilizationColor(
                                    monthData.type === 'historical' ? monthData.historical : monthData.projected
                                  )}`}>
                                    {monthData.type === 'historical' 
                                      ? monthData.historical.toFixed(1) 
                                      : monthData.projected.toFixed(1)
                                    }%
                                    <div className="text-xs text-muted-foreground">
                                      {monthData.type === 'historical' ? '(H)' : '(P)'}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="mt-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>(H) = Historical</span>
              <span>(P) = Projected</span>
              <span className="text-green-600">≥90% = Excellent</span>
              <span className="text-yellow-600">70-89% = Good</span>
              <span className="text-red-600">&lt;70% = Below Target</span>
              {utilizationType === 'actual' && <span className="font-medium">Showing only historical data for current calculation type</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Utilization Line Graph - Read Only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Monthly Utilization Trends
            </CardTitle>
            <Select value={utilizationType} onValueChange={(value: 'actual' | 'projected') => setUtilizationType(value)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Actual utilisation (based on recorded time)</SelectItem>
                <SelectItem value="projected">Projected utilisation (based on estimated time)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading chart data...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, name]}
                />
                <Legend />
                {users.map((user) => (
                  <Line 
                    key={user.id}
                    type="monotone" 
                    dataKey={user.name} 
                    stroke={lawyerColors[user.name]}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No utilization data available for chart
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}