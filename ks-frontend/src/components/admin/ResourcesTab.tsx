import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useProfiles";
import { 
  Users, 
  Clock, 
  Edit, 
  Save, 
  FileDown, 
  Settings, 
  TrendingUp,
  Filter,
  Plus,
  UserPlus,
  Trash2
} from "lucide-react";
import { 
  getBillableTarget, 
  updateBillableTarget
} from "@/utils/utilizationCalculator";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, addMonths } from "date-fns";
import * as XLSX from 'xlsx';
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
import { useProfile } from "@/contexts/ProfileContext";
import aishaRahmanHeadshot from "@/assets/staff/aisha-rahman-headshot.jpg";
import danielParkHeadshot from "@/assets/staff/daniel-park-headshot.jpg";
import davidOconnellHeadshot from "@/assets/staff/david-oconnell-headshot.jpg";
import jamesBentleyHeadshot from "@/assets/staff/james-bentley-headshot.jpg";
import lilyChenHeadshot from "@/assets/staff/lily-chen-headshot.jpg";
import miaRossiHeadshot from "@/assets/staff/mia-rossi-headshot.jpg";
import priyaIyerHeadshot from "@/assets/staff/priya-iyer-headshot.jpg";
import tomNguyenHeadshot from "@/assets/staff/tom-nguyen-headshot.jpg";

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

export function ResourcesTab() {
  const { toast } = useToast();
  const { refreshProfiles } = useProfile();
  const [users, setUsers] = useState<User[]>([]);
  const [billableTarget, setBillableTarget] = useState(6);
  const [newBillableTarget, setNewBillableTarget] = useState(6);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  
  // New user form state
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'Legal Assistant' as 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant',
    chargeRate: 0,
    costRate: 0
  });
  
  // Filtering state - only role filter now
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
      setNewBillableTarget(target);
      
      // Load user data from Supabase profiles table (filter out Peter Dombkins)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, hourly_rate, cost_rate, avatar_url')
        .neq('role', 'inactive')
        .neq('id', '8bba6096-1be7-4cc9-bccd-98b5da79e41a') // Hide Peter Dombkins
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

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

      const formattedUsers: User[] = (profilesData || []).map(profile => {
        // Fix role mapping to handle database role formats
        let mappedRole: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant' = 'Legal Assistant';
        const roleStr = (profile.role || '').toString().toLowerCase().trim();
        
        if (roleStr === 'partner') mappedRole = 'Partner';
        else if (roleStr === 'senior_associate') mappedRole = 'Senior Associate';
        else if (roleStr === 'junior_associate' || roleStr === 'associate') mappedRole = 'Junior Associate';
        else if (roleStr === 'paralegal' || roleStr === 'legal_assistant') mappedRole = 'Legal Assistant';
        
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

      setUsers(formattedUsers);
      
      // Skipping heavy client-side utilization prefetch; pivot data uses RPC per user/month
      // This keeps the UI responsive and avoids long loading on initial render.
      
    } catch (error) {
      console.error('Error loading resource data:', error);
      toast({
        title: "Error",
        description: "Failed to load resource data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBillableTarget = async () => {
    try {
      const success = await updateBillableTarget(newBillableTarget);
      if (success) {
        setBillableTarget(newBillableTarget);
        toast({
          title: "Success",
          description: `Billable target updated to ${newBillableTarget} hours per day.`,
        });
        
        // Reload utilization data with new target
        loadResourceData();
      } else {
        toast({
          title: "Error",
          description: "Failed to update billable target.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating billable target:', error);
      toast({
        title: "Error",
        description: "Failed to update billable target.",
        variant: "destructive"
      });
    }
  };

  const handleSaveUser = async (updatedUser: User) => {
    try {
      // Convert role to database format
      let dbRole = 'staff';
      switch (updatedUser.role) {
        case 'Partner':
          dbRole = 'partner';
          break;
        case 'Senior Associate':
          dbRole = 'senior_associate';
          break;
        case 'Junior Associate':
          dbRole = 'junior_associate';
          break;
        case 'Legal Assistant':
          dbRole = 'paralegal';
          break;
      }

      // Update user in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          role: dbRole,
          hourly_rate: updatedUser.chargeRate,
          cost_rate: updatedUser.costRate
        })
        .eq('id', updatedUser.id);

      if (error) {
        throw error;
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
      
      toast({
        title: "User Updated",
        description: `${updatedUser.name}'s profile has been successfully updated.`,
      });
      
      setShowUserDialog(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user profile.",
        variant: "destructive"
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserData.name || !newUserData.email) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      // Insert new user into Supabase profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          full_name: newUserData.name,
          email: newUserData.email,
          role: newUserData.role,
          hourly_rate: newUserData.chargeRate,
          cost_rate: newUserData.costRate
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Team Member Added",
        description: `${newUserData.name} has been successfully added to the team.`,
      });
      
      // Reset form and reload data
      setNewUserData({
        name: '',
        email: '',
        role: 'Legal Assistant',
        chargeRate: 0,
        costRate: 0
      });
      setShowNewUserDialog(false);
      loadResourceData(); // Refresh the users list
      
      // Also refresh profiles in ProfileContext so new member appears everywhere
      await refreshProfiles();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create team member. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      // Special handling for Mia Rossi duplication - transfer tasks to the correct profile
      if (userId === '550e8400-e29b-41d4-a716-446655440007') { // mia.rossi@mcr.com.au
        const correctMiaProfileId = '550e8400-e29b-41d4-a716-446655440006'; // m.rossi@mcrlaw.com.au
        
        // Transfer tasks to correct Mia profile
        const { error: tasksUpdateError } = await supabase
          .from('tasks')
          .update({ assigned_to: correctMiaProfileId })
          .eq('assigned_to', userId);
          
        if (tasksUpdateError) {
          console.error('Error transferring tasks:', tasksUpdateError);
        }
        
        // Transfer task assignments
        const { error: assignmentsUpdateError } = await supabase
          .from('task_assignments')
          .update({ user_id: correctMiaProfileId })
          .eq('user_id', userId);
          
        if (assignmentsUpdateError) {
          console.error('Error transferring task assignments:', assignmentsUpdateError);
        }
        
        // Transfer time entries
        const { error: timeEntriesUpdateError } = await supabase
          .from('time_entries')
          .update({ user_id: correctMiaProfileId })
          .eq('user_id', userId);
          
        if (timeEntriesUpdateError) {
          console.error('Error transferring time entries:', timeEntriesUpdateError);
        }
      }
      
      // Set profile to inactive instead of deleting
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'inactive' })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      toast({
        title: "Team Member Removed",
        description: `${userName} has been successfully removed from the team.`,
      });
      
      loadResourceData(); // Refresh the users list
      await refreshProfiles(); // Also refresh profiles in ProfileContext
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportUtilizationReport = () => {
    try {
      // Export current team list (lightweight, avoids heavy prefetch)
      const excelData = users.map(user => ({
        'User Name': user.name,
        'Email': user.email,
        'Role': user.role,
        'Charge Rate ($/hr)': user.chargeRate,
        'Cost Rate ($/hr)': user.costRate,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Team List');

      const filename = `team-list-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: "Team list has been downloaded as Excel file.",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export team list.",
        variant: "destructive"
      });
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
    const userMap = new Map<string, PivotRow>();
    const monthsSet = new Set<string>();

    // Initialize user rows with correct roles
    users.forEach(user => {
      userMap.set(user.id, {
        userId: user.id,
        userName: user.name,
        role: user.role,
        months: {}
      });
    });

    // Generate month columns for past 6 months and future 6 months
    const currentDate = new Date();
    const startDate = subMonths(currentDate, 6);
    const endDate = addMonths(currentDate, 6);
    
    let current = startDate;
    while (current <= endDate) {
      const monthKey = format(current, 'MMM yyyy');
      monthsSet.add(monthKey);
      current = addMonths(current, 1);
    }

    try {
      // Batch all RPC calls for better performance
      const rpcCalls = [];
      const callMap = new Map();

      // Prepare all RPC calls
      for (const user of users) {
        let currentMonth = startDate;
        while (currentMonth <= endDate) {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1;
          const monthKey = format(currentMonth, 'MMM yyyy');
          const callKey = `${user.id}-${monthKey}`;
          
          const rpcCall = supabase.rpc('calculate_monthly_utilization', {
            user_uuid: user.id,
            target_year: year,
            target_month: month
          });
          
          rpcCalls.push(rpcCall);
          callMap.set(rpcCalls.length - 1, { user, monthKey, currentMonth });
          
          currentMonth = addMonths(currentMonth, 1);
        }
      }

      // Execute all RPC calls in parallel with batching to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < rpcCalls.length; i += batchSize) {
        const batch = rpcCalls.slice(i, i + batchSize);
        const results = await Promise.allSettled(batch);
        
        results.forEach((result, batchIndex) => {
          const callIndex = i + batchIndex;
          const callInfo = callMap.get(callIndex);
          
          if (!callInfo) return;
          
          const { user, monthKey, currentMonth } = callInfo;
          const userRow = userMap.get(user.id);
          
          if (!userRow) return;
          
          if (result.status === 'fulfilled' && result.value.data && result.value.data.length > 0) {
            const data = result.value.data[0];
            const isHistorical = currentMonth <= new Date();
            
            userRow.months[monthKey] = {
              historical: isHistorical ? (data.actual_utilization || 0) : 0,
              projected: !isHistorical ? (data.projected_utilization || 0) : 0,
              type: isHistorical ? 'historical' : 'projected'
            };
          } else {
            // Fallback for failed calls
            userRow.months[monthKey] = {
              historical: 0,
              projected: 0,
              type: 'historical'
            };
          }
        });
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

  // State for pivot data
  const [pivotData, setPivotData] = useState<PivotRow[]>([]);
  const [monthColumns, setMonthColumns] = useState<string[]>([]);
  const [pivotLoading, setPivotLoading] = useState(false);

  // Load pivot data with batched RPC calls
  const loadPivotData = async () => {
    if (users.length === 0) return;
    
    try {
      setPivotLoading(true);
      const { pivotData: newPivotData, monthColumns: newMonthColumns } = await createPivotData();
      setPivotData(newPivotData);
      setMonthColumns(newMonthColumns);
    } catch (error) {
      console.error('Error loading pivot data:', error);
      toast({
        title: "Warning",
        description: "Some utilization data could not be loaded.",
        variant: "destructive"
      });
    } finally {
      setPivotLoading(false);
    }
  };

  // Load pivot data when users, billable target, or utilization type changes
  useEffect(() => {
    if (users.length > 0) {
      loadPivotData();
    }
  }, [users, billableTarget, utilizationType]);

  const filteredPivotData = filterPivotData(pivotData);
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

  // Export pivot format
  const exportPivotUtilizationReport = () => {
    try {
      const excelData = filteredPivotData.map(row => {
        const rowData: any = {
          'User Name': row.userName,
          'Role': row.role,
        };
        
        monthColumns.forEach(month => {
          const monthData = row.months[month];
          if (monthData) {
            if (monthData.type === 'mixed') {
              rowData[`${month} (Historical)`] = `${monthData.historical.toFixed(1)}%`;
              rowData[`${month} (Projected)`] = `${monthData.projected.toFixed(1)}%`;
            } else if (monthData.type === 'historical') {
              rowData[month] = `${monthData.historical.toFixed(1)}%`;
            } else {
              rowData[month] = `${monthData.projected.toFixed(1)}%`;
            }
          } else {
            rowData[month] = '-';
          }
        });
        
        return rowData;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Utilization Pivot Report');
      
      const filename = `utilization-pivot-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Export Successful",
        description: "Utilization pivot report has been downloaded as Excel file.",
      });
    } catch (error) {
      console.error('Error exporting pivot report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export utilization report.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Billable Target Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Billable Target Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="billableTarget">Target Billable Hours per Day</Label>
              <Input
                id="billableTarget"
                type="number"
                value={newBillableTarget}
                onChange={(e) => setNewBillableTarget(parseFloat(e.target.value) || 6)}
                min="1"
                max="24"
                step="0.5"
                className="mt-1"
              />
            </div>
            <div className="flex items-end pb-2">
              <Button onClick={handleUpdateBillableTarget}>
                <Save className="w-4 h-4 mr-2" />
                Update Target
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Current target: {billableTarget} hours per day. This affects all utilization calculations.
          </p>
        </CardContent>
      </Card>

      {/* User Management - Removed View Utilization buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Members & Rates
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
                <DialogTrigger asChild>
                  <Button variant="default">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newUserName">Full Name</Label>
                      <Input
                        id="newUserName"
                        placeholder="Enter full name"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newUserEmail">Email</Label>
                      <Input
                        id="newUserEmail"
                        type="email"
                        placeholder="Enter email address"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newUserRole">Role</Label>
                      <Select value={newUserData.role} onValueChange={(value: any) => setNewUserData({ ...newUserData, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Senior Associate">Senior Associate</SelectItem>
                          <SelectItem value="Junior Associate">Junior Associate</SelectItem>
                          <SelectItem value="Legal Assistant">Legal Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="newUserChargeRate">Charge Rate ($/hr)</Label>
                      <Input
                        id="newUserChargeRate"
                        type="number"
                        value={newUserData.chargeRate}
                        onChange={(e) => setNewUserData({ ...newUserData, chargeRate: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newUserCostRate">Cost Rate ($/hr)</Label>
                      <Input
                        id="newUserCostRate"
                        type="number"
                        value={newUserData.costRate}
                        onChange={(e) => setNewUserData({ ...newUserData, costRate: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>
                        Add Team Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={exportUtilizationReport}>
                <FileDown className="w-4 h-4 mr-2" />
                Export List Report
              </Button>
            </div>
          </div>
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
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Charge: ${user.chargeRate.toFixed(2)}/hr
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cost: ${user.costRate.toFixed(2)}/hr
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog open={showUserDialog && editingUser?.id === user.id} onOpenChange={setShowUserDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
                      </DialogHeader>
                       <div className="space-y-4">
                         <div>
                           <Label htmlFor="editUserRole">Role</Label>
                           <Select 
                             value={editingUser?.role} 
                             onValueChange={(value: any) => setEditingUser(editingUser ? {
                               ...editingUser,
                               role: value
                             } : null)}
                           >
                             <SelectTrigger>
                               <SelectValue placeholder="Select role" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Partner">Partner</SelectItem>
                               <SelectItem value="Senior Associate">Senior Associate</SelectItem>
                               <SelectItem value="Junior Associate">Junior Associate</SelectItem>
                               <SelectItem value="Legal Assistant">Legal Assistant</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div>
                           <Label htmlFor="chargeRate">Charge Rate ($/hr)</Label>
                           <Input
                             id="chargeRate"
                             type="number"
                             value={editingUser?.chargeRate || 0}
                             onChange={(e) => setEditingUser(editingUser ? {
                               ...editingUser,
                               chargeRate: parseFloat(e.target.value) || 0
                             } : null)}
                             step="0.01"
                           />
                         </div>
                         <div>
                           <Label htmlFor="costRate">Cost Rate ($/hr)</Label>
                           <Input
                             id="costRate"
                             type="number"
                             value={editingUser?.costRate || 0}
                             onChange={(e) => setEditingUser(editingUser ? {
                               ...editingUser,
                               costRate: parseFloat(e.target.value) || 0
                             } : null)}
                             step="0.01"
                           />
                         </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => editingUser && handleSaveUser(editingUser)}
                          >
                            Save Changes
                          </Button>
                         </div>
                       </div>
                       </DialogContent>
                     </Dialog>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleDeleteUser(user.id, user.name)}
                       className="text-destructive hover:text-destructive"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>

      {/* Utilization Overview - Always visible Pivot Table */}
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
              <Button variant="outline" onClick={exportPivotUtilizationReport}>
                <FileDown className="w-4 h-4 mr-2" />
                Export Pivot Report
              </Button>
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

          {pivotLoading ? (
            <div className="text-center py-8">Loading utilization data...</div>
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

      {/* Monthly Utilization Line Graph - Always visible for all lawyers */}
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
          {pivotLoading ? (
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