import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, isAfter, isBefore } from "date-fns";

export interface UtilizationData {
  userId: string;
  userName: string;
  role: string;
  month: string;
  year: number;
  historicalHours: number;
  projectedHours: number;
  targetHours: number;
  historicalUtilization: number;
  projectedUtilization: number;
  projectedRevenue: number;
  type: 'historical' | 'projected';
}

export interface MonthlyUtilization {
  month: string;
  year: number;
  targetHours: number;
  actualHours: number;
  utilization: number;
}

// Calculate business days in a month (excluding weekends)
export const getBusinessDaysInMonth = (year: number, month: number): number => {
  const start = new Date(year, month - 1, 1);
  const end = endOfMonth(start);
  let businessDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
  }
  
  return businessDays;
};

// Get billable target hours per day from settings
export const getBillableTarget = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('category', 'resources')
      .eq('name', 'billable_target_hours_per_day')
      .single();
    
    if (error) {
      console.error('Error fetching billable target:', error);
      return 6; // Default fallback
    }
    
    return parseFloat(data.value) || 6;
  } catch (error) {
    console.error('Error getting billable target:', error);
    return 6; // Default fallback
  }
};

// Update billable target setting
export const updateBillableTarget = async (newTarget: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('system_settings')
      .update({ value: newTarget.toString() })
      .eq('category', 'resources')
      .eq('name', 'billable_target_hours_per_day');
    
    if (error) {
      console.error('Error updating billable target:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error updating billable target:', error);
    return false;
  }
};

// Calculate historical utilization for a user in a specific month
export const calculateHistoricalUtilization = async (
  userId: string, 
  year: number, 
  month: number
): Promise<{ hours: number; utilization: number; targetHours: number }> => {
  try {
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    
    // Get time entries for the month
    const { data: timeEntries, error } = await supabase
      .from('time_entries')
      .select('hours')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) {
      console.error('Error fetching time entries:', error);
      return { hours: 0, utilization: 0, targetHours: 0 };
    }
    
    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;
    const businessDays = getBusinessDaysInMonth(year, month);
    const billableTarget = await getBillableTarget();
    const targetHours = businessDays * billableTarget;
    const utilization = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;
    
    return {
      hours: totalHours,
      utilization: Math.round(utilization * 100) / 100,
      targetHours
    };
  } catch (error) {
    console.error('Error calculating historical utilization:', error);
    return { hours: 0, utilization: 0, targetHours: 0 };
  }
};

// Calculate projected utilization for a user based on all allocated tasks using proportional allocation
export const calculateProjectedUtilization = async (
  userId: string, 
  year: number, 
  month: number
): Promise<{ hours: number; utilization: number; targetHours: number; revenue: number }> => {
  try {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    
    let totalProportionalHours = 0;
    let totalEstimatedRevenue = 0;
    
    // Get task assignments with task and matter details for proportional calculation
    const { data: assignments, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select(`
        estimated_hours,
        user_id,
        tasks!inner(
          id,
          commencement_date,
          due_date,
          status,
          matters!inner(
            status,
            hourly_rate
          )
        ),
        profiles!left(hourly_rate)
      `)
      .eq('user_id', userId)
      .eq('tasks.matters.status', 'active');
    
    if (assignmentsError) {
      console.error('Error fetching task assignments:', assignmentsError);
    } else if (assignments) {
      assignments.forEach(assignment => {
        const task = assignment.tasks;
        if (task && task.commencement_date && task.due_date) {
          const commencementDate = new Date(task.commencement_date);
          const dueDate = new Date(task.due_date);
          
          // Only include tasks that span into this month
          if (commencementDate <= endDate && dueDate >= startDate) {
            // Calculate how many months this task spans (minimum 1)
            const taskDurationMs = dueDate.getTime() - commencementDate.getTime();
            const taskMonths = Math.max(1, Math.round(taskDurationMs / (30 * 24 * 60 * 60 * 1000)));
            
            // Calculate proportional hours for this month
            const monthlyHours = (assignment.estimated_hours || 0) / taskMonths;
            totalProportionalHours += monthlyHours;
            
            // Calculate proportional revenue for this month
            const hourlyRate = assignment.profiles?.hourly_rate || task.matters?.hourly_rate || 0;
            const monthlyRevenue = monthlyHours * hourlyRate;
            totalEstimatedRevenue += monthlyRevenue;
          }
        }
      });
    }
    
    // Also handle legacy single assignments for backward compatibility
    const { data: legacyTasks, error: legacyError } = await supabase
      .from('tasks')
      .select(`
        id,
        estimated_total_hours,
        commencement_date,
        due_date,
        status,
        assigned_to,
        matters!inner(
          status,
          hourly_rate
        )
      `)
      .eq('assigned_to', userId)
      .eq('matters.status', 'active');
    
    if (!legacyError && legacyTasks) {
      // Check which legacy tasks already have assignments in the new system
      const taskIds = legacyTasks.map(t => t.id);
      const { data: existingAssignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .in('task_id', taskIds);
      
      const assignedTaskIds = new Set(existingAssignments?.map(a => a.task_id) || []);
      
      legacyTasks.forEach(task => {
        // Only include if not already in new assignment system
        if (!assignedTaskIds.has(task.id) && task.commencement_date && task.due_date) {
          const commencementDate = new Date(task.commencement_date);
          const dueDate = new Date(task.due_date);
          
          // Only include tasks that span into this month
          if (commencementDate <= endDate && dueDate >= startDate) {
            // Calculate how many months this task spans (minimum 1)
            const taskDurationMs = dueDate.getTime() - commencementDate.getTime();
            const taskMonths = Math.max(1, Math.round(taskDurationMs / (30 * 24 * 60 * 60 * 1000)));
            
            // Calculate proportional hours for this month
            const monthlyHours = (task.estimated_total_hours || 0) / taskMonths;
            totalProportionalHours += monthlyHours;
            
            // Calculate proportional revenue for this month
            const hourlyRate = task.matters?.hourly_rate || 0;
            const monthlyRevenue = monthlyHours * hourlyRate;
            totalEstimatedRevenue += monthlyRevenue;
          }
        }
      });
    }
    
    const businessDays = getBusinessDaysInMonth(year, month);
    const billableTarget = await getBillableTarget();
    const targetHours = businessDays * billableTarget;
    const utilization = targetHours > 0 ? (totalProportionalHours / targetHours) * 100 : 0;
    
    return {
      hours: totalProportionalHours,
      utilization: Math.round(utilization * 100) / 100,
      targetHours,
      revenue: totalEstimatedRevenue
    };
  } catch (error) {
    console.error('Error calculating projected utilization:', error);
    return { hours: 0, utilization: 0, targetHours: 0, revenue: 0 };
  }
};

// Get utilization data for all users across multiple months
export const getUtilizationReport = async (
  startDate: Date,
  endDate: Date
): Promise<UtilizationData[]> => {
  try {
    // Get all active profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'inactive');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }
    
    if (!profiles || profiles.length === 0) {
      return [];
    }
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const utilizationData: UtilizationData[] = [];
    const today = new Date();
    
    for (const profile of profiles) {
      for (const monthDate of months) {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth() + 1;
        const monthStr = format(monthDate, 'MMM yyyy');
        
        // Determine if this is historical or projected
        const isHistorical = isBefore(endOfMonth(monthDate), today) || 
                           (monthDate.getFullYear() === today.getFullYear() && 
                            monthDate.getMonth() === today.getMonth());
        
        if (isHistorical) {
          const historical = await calculateHistoricalUtilization(profile.id, year, month);
          utilizationData.push({
            userId: profile.id,
            userName: profile.full_name || 'Unknown',
            role: profile.role || 'staff',
            month: monthStr,
            year,
            historicalHours: historical.hours,
            projectedHours: 0,
            targetHours: historical.targetHours,
            historicalUtilization: historical.utilization,
            projectedUtilization: 0,
            projectedRevenue: 0,
            type: 'historical'
          });
        } else {
          const projected = await calculateProjectedUtilization(profile.id, year, month);
          if (projected.hours > 0) { // Only include months with projected work
            utilizationData.push({
              userId: profile.id,
              userName: profile.full_name || 'Unknown',
              role: profile.role || 'staff',
              month: monthStr,
              year,
              historicalHours: 0,
              projectedHours: projected.hours,
              targetHours: projected.targetHours,
              historicalUtilization: 0,
              projectedUtilization: projected.utilization,
              projectedRevenue: projected.revenue,
              type: 'projected'
            });
          }
        }
      }
    }
    
    return utilizationData;
  } catch (error) {
    console.error('Error generating utilization report:', error);
    return [];
  }
};

// Get monthly utilization summary for a specific user
export const getUserMonthlyUtilization = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MonthlyUtilization[]> => {
  try {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyData: MonthlyUtilization[] = [];
    const today = new Date();
    
    for (const monthDate of months) {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const monthStr = format(monthDate, 'MMM yyyy');
      
      // Determine if this is historical or projected
      const isHistorical = isBefore(endOfMonth(monthDate), today) || 
                         (monthDate.getFullYear() === today.getFullYear() && 
                          monthDate.getMonth() === today.getMonth());
      
      if (isHistorical) {
        const historical = await calculateHistoricalUtilization(userId, year, month);
        monthlyData.push({
          month: monthStr,
          year,
          targetHours: historical.targetHours,
          actualHours: historical.hours,
          utilization: historical.utilization
        });
      } else {
        const projected = await calculateProjectedUtilization(userId, year, month);
        if (projected.hours > 0) {
          monthlyData.push({
            month: monthStr,
            year,
            targetHours: projected.targetHours,
            actualHours: projected.hours,
            utilization: projected.utilization
          });
        }
      }
    }
    
    return monthlyData;
  } catch (error) {
    console.error('Error getting user monthly utilization:', error);
    return [];
  }
};