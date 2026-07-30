import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Clock, Calendar, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  estimated_hours: number;
  actual_hours: number;
  user_name?: string;
  user_role?: string;
}

interface MultiResourceTask {
  id: string;
  title: string;
  description?: string;
  workstream?: string;
  status: string;
  due_date?: string;
  commencement_date?: string;
  estimated_total_hours: number;
  actual_hours: number;
  assignments: TaskAssignment[];
}

interface MultiResourceTasksTableProps {
  tasks: MultiResourceTask[];
  onEditTask?: (task: MultiResourceTask) => void;
  onTasksUpdate?: () => void;
  matterId: string;
  refreshSignal?: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <Clock className="w-4 h-4 text-green-600" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'open':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'paused':
      return <Clock className="w-4 h-4 text-gray-600" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    case 'open':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100';
    case 'paused':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};

const getWorkstreamColor = (workstream?: string) => {
  switch (workstream) {
    case 'Corporate':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
    case 'Commercial':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    case 'Employment':
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    case 'Data/Privacy':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
    case 'Real Estate':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};

const getRoleColor = (role?: string) => {
  switch (role) {
    case 'partner':
      return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
    case 'senior associate':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
    case 'junior associate':
      return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    case 'paralegal':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
  }
};

const getProgressPercentage = (task: MultiResourceTask) => {
  if (task.estimated_total_hours === 0) return 0;
  return Math.min(Math.round((task.actual_hours / task.estimated_total_hours) * 100), 100);
};

// Auto-status function based on actual vs estimated hours
const getAutoTaskStatus = (actualHours: number, estimatedHours: number, currentStatus: string): string => {
  // Don't auto-update if task is manually set to Paused or Cancelled
  if (currentStatus?.toLowerCase() === 'paused' || currentStatus?.toLowerCase() === 'cancelled') {
    return currentStatus;
  }
  
  if (actualHours === 0) return 'open';
  if (actualHours > 0 && actualHours < estimatedHours) return 'in_progress';
  if (actualHours >= estimatedHours) return 'completed';
  
  return 'open';
};

export function MultiResourceTasksTable({ 
  tasks, 
  onEditTask, 
  onTasksUpdate, 
  matterId,
  refreshSignal,
}: MultiResourceTasksTableProps) {
  const [tasksWithAssignments, setTasksWithAssignments] = useState<MultiResourceTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasksWithAssignments();
  }, [matterId, refreshSignal]);

  // Debounced live-update table when tasks or task_assignments change
  useEffect(() => {
    if (!matterId) return;

    // Debounce subscription callbacks to prevent rapid reloads
    const DEBOUNCE_DELAY = 300;
    let debounceTimer: NodeJS.Timeout | null = null;
    let pendingRefresh = false;

    const debouncedFetch = () => {
      if (pendingRefresh) return;
      pendingRefresh = true;
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        fetchTasksWithAssignments();
        pendingRefresh = false;
      }, DEBOUNCE_DELAY);
    };

    const channel = supabase
      .channel(`mrtt-${matterId}`)
      .on('postgres_changes', { event: '*', schema: 'ks', table: 'tasks', filter: `matter_id=eq.${matterId}` }, () => {
        debouncedFetch();
      })
      .on('postgres_changes', { event: '*', schema: 'ks', table: 'task_assignments' }, () => {
        // Any assignment change could affect our sums; refetch
        debouncedFetch();
      })
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [matterId]);

  const fetchTasksWithAssignments = async () => {
    if (!matterId) return;

    try {
      setLoading(true);

      // Fetch tasks with their assignments and user profiles
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          workstream,
          phase,
          status,
          due_date,
          commencement_date,
          estimated_total_hours,
          actual_hours
        `)
        .eq('matter_id', matterId)
        .order('order_position');

      if (tasksError) throw tasksError;

      console.log('[MRTT] Fetched tasks for matter', matterId, 'count:', tasksData?.length || 0);
      if (!tasksData || tasksData.length === 0) {
        setTasksWithAssignments([]);
        setLoading(false);
        return;
      }

      // Fetch assignments for all tasks
      const taskIds = tasksData.map(task => task.id);
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select(`
          id,
          task_id,
          user_id,
          estimated_hours,
          actual_hours
        `)
        .in('task_id', taskIds);

      console.log('[MRTT] Fetched assignments count:', assignmentsData?.length || 0);
      // Fetch user profiles separately to avoid relation issues
      const userIds = [...new Set(assignmentsData?.map(a => a.user_id) || [])];
      console.log('[MRTT] Unique userIds for profiles:', userIds.length);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', userIds);

      if (assignmentsError || profilesError) throw assignmentsError || profilesError;

      // Create profile lookup map
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Combine tasks with their assignments and apply auto-status
      const tasksWithAssignments = tasksData.map(task => {
        const assignmentsForTask = (assignmentsData || []).filter(a => a.task_id === task.id);
        const estimatedSum = assignmentsForTask.reduce((sum, a) => sum + Number(a.estimated_hours || 0), 0);
        const actualSum = assignmentsForTask.reduce((sum, a) => sum + Number(a.actual_hours || 0), 0);

        // Apply auto-status logic
        const autoStatus = getAutoTaskStatus(actualSum, estimatedSum, task.status);

        return {
          ...task,
          // Always reflect latest sums from assignments for UI accuracy
          estimated_total_hours: estimatedSum,
          actual_hours: actualSum,
          status: autoStatus,
          assignments: assignmentsForTask.map(assignment => {
            const profile = profilesMap.get(assignment.user_id);
            return {
              id: assignment.id,
              task_id: assignment.task_id,
              user_id: assignment.user_id,
              estimated_hours: assignment.estimated_hours,
              actual_hours: assignment.actual_hours,
              user_name: profile?.full_name,
              user_role: profile?.role,
            };
          })
        };
      });

      setTasksWithAssignments(tasksWithAssignments);
    } catch (error) {
      console.error('Error fetching tasks with assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks with assignments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading tasks...</div>;
  }

  if (tasksWithAssignments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tasks found for this matter.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Workstream</TableHead>
            <TableHead>Resource Assignments</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasksWithAssignments.map((task) => {
            const progress = getProgressPercentage(task);
            
            return (
              <TableRow key={task.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-semibold">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  {task.workstream && (
                    <Badge className={getWorkstreamColor(task.workstream)}>
                      {task.workstream}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    {task.assignments.length > 0 ? (
                      task.assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-2 text-sm">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{assignment.user_name}</span>
                          {assignment.user_role && (
                            <Badge variant="outline" className={`text-xs ${getRoleColor(assignment.user_role)}`}>
                              {assignment.user_role}
                            </Badge>
                          )}
                          <span className="text-muted-foreground">
                            (Est: <span className="font-medium">{assignment.estimated_hours}h</span> / Actual: <span className="font-medium">{assignment.actual_hours}h</span>)
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>No assignments</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1 text-sm">
                    {task.commencement_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Start: {new Date(task.commencement_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>Est. Total: {task.estimated_total_hours}h</div>
                    <div>Actual: {task.actual_hours}h</div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {onEditTask && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTask(task)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default MultiResourceTasksTable;