import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Clock, DollarSign } from "lucide-react";
import { differenceInBusinessDays } from "date-fns";
import { MatterGanttChart } from "./MatterGanttChart";

interface WorkstreamAnalytics {
  workstream: string;
  totalTasks: number;
  avgDurationDaysPerTask: number;
  avgEstimatedEffortPerTask: number;
  avgEstimatedCostPerTask: number;
  avgEstimatedCostPerMatter: number;
  avgDurationDaysPerMatter: number;
}

interface PhaseAnalytics {
  phase: string;
  totalTasks: number;
  avgDurationDaysPerTask: number;
  avgEstimatedEffortPerTask: number;
  avgEstimatedCostPerTask: number;
  avgEstimatedCostPerMatter: number;
  avgDurationDaysPerMatter: number;
}

export function LPMTab() {
  const [workstreamData, setWorkstreamData] = useState<WorkstreamAnalytics[]>([]);
  const [phaseData, setPhaseData] = useState<PhaseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWorkstreamAnalytics(),
        loadPhaseAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkstreamAnalytics = async () => {
    try {
      // Get all tasks with their workstreams and related data
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          matter_id,
          workstream,
          status,
          commencement_date,
          completed_at,
          due_date,
          created_at,
          estimated_total_hours,
          actual_hours,
          task_assignments(estimated_hours, actual_hours, user_id, profiles(cost_rate))
        `)
        .not('workstream', 'is', null);

      if (tasksError) {
        console.error('Error fetching tasks for workstreams:', tasksError);
        return;
      }

      // Group tasks by workstream and calculate analytics
      const workstreamMap = new Map<string, {
        tasks: any[];
        completedTasks: any[];
        startedTasks: any[];
      }>();

      tasksData?.forEach(task => {
        const workstream = task.workstream || 'Unassigned';
        if (!workstreamMap.has(workstream)) {
          workstreamMap.set(workstream, { tasks: [], completedTasks: [], startedTasks: [] });
        }
        
        const workstreamGroup = workstreamMap.get(workstream)!;
        workstreamGroup.tasks.push(task);
        
        if (task.status === 'completed' && task.completed_at) {
          workstreamGroup.completedTasks.push(task);
        }
        
        if (task.commencement_date && new Date(task.commencement_date) <= new Date()) {
          workstreamGroup.startedTasks.push(task);
        }
      });

      // Calculate analytics for each workstream
      const workstreamAnalytics = calculateAnalytics(workstreamMap, 'workstream');
      setWorkstreamData(workstreamAnalytics);
    } catch (error) {
      console.error('Error loading workstream analytics:', error);
    }
  };

  const loadPhaseAnalytics = async () => {
    try {
      // Get all tasks with their phases and related data
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          matter_id,
          phase,
          status,
          commencement_date,
          completed_at,
          due_date,
          created_at,
          estimated_total_hours,
          actual_hours,
          task_assignments(estimated_hours, actual_hours, user_id, profiles(cost_rate))
        `)
        .not('phase', 'is', null);

      if (tasksError) {
        console.error('Error fetching tasks for phases:', tasksError);
        return;
      }

      // Group tasks by phase and calculate analytics
      const phaseMap = new Map<string, {
        tasks: any[];
        completedTasks: any[];
        startedTasks: any[];
      }>();

      tasksData?.forEach(task => {
        const phase = task.phase || 'Unassigned';
        if (!phaseMap.has(phase)) {
          phaseMap.set(phase, { tasks: [], completedTasks: [], startedTasks: [] });
        }
        
        const phaseGroup = phaseMap.get(phase)!;
        phaseGroup.tasks.push(task);
        
        if (task.status === 'completed' && task.completed_at) {
          phaseGroup.completedTasks.push(task);
        }
        
        if (task.commencement_date && new Date(task.commencement_date) <= new Date()) {
          phaseGroup.startedTasks.push(task);
        }
      });

      // Calculate analytics for each phase
      const phaseAnalytics = calculateAnalytics(phaseMap, 'phase');
      setPhaseData(phaseAnalytics);
    } catch (error) {
      console.error('Error loading phase analytics:', error);
    }
  };

  const calculateAnalytics = (dataMap: Map<string, any>, type: 'workstream' | 'phase') => {
    const analytics: any[] = [];
    
    // Sort alphabetically
    const sortedKeys = Array.from(dataMap.keys()).sort();
    
    sortedKeys.forEach((key) => {
      const group = dataMap.get(key)!;
      const { tasks, completedTasks, startedTasks } = group;
      
      // Calculate average duration in business days for tasks that have actually started
      const avgDurationDaysPerTask = startedTasks.length > 0 ? 
        startedTasks.reduce((sum, task) => {
          const start = new Date(task.commencement_date);
          const end = task.completed_at ? new Date(task.completed_at) : new Date();
          const duration = differenceInBusinessDays(end, start);
          return sum + Math.max(0, duration);
        }, 0) / startedTasks.length : 0;

      // Calculate average estimated effort per task
      const avgEstimatedEffortPerTask = tasks.length > 0 ?
        tasks.reduce((sum, task) => {
          const taskEstimated = task.task_assignments?.reduce((taskSum: number, assignment: any) => 
            taskSum + (assignment.estimated_hours || 0), 0) || task.estimated_total_hours || 0;
          return sum + taskEstimated;
        }, 0) / tasks.length : 0;

      // Calculate average estimated cost per task
      const avgEstimatedCostPerTask = tasks.length > 0 ?
        tasks.reduce((sum, task) => {
          const taskCost = task.task_assignments?.reduce((taskSum: number, assignment: any) => {
            const estimatedHours = assignment.estimated_hours || 0;
            const costRate = assignment.profiles?.cost_rate || 0;
            return taskSum + (estimatedHours * costRate);
          }, 0) || 0;
          return sum + taskCost;
        }, 0) / tasks.length : 0;

      // Group tasks by matter and calculate per-matter metrics
      const matterGroups = new Map();
      tasks.forEach(task => {
        if (!matterGroups.has(task.matter_id)) {
          matterGroups.set(task.matter_id, []);
        }
        matterGroups.get(task.matter_id).push(task);
      });

      // Calculate average estimated cost per matter
      const avgEstimatedCostPerMatter = matterGroups.size > 0 ?
        Array.from(matterGroups.values()).reduce((sum, matterTasks) => {
          const matterCost = matterTasks.reduce((matterSum: number, task: any) => {
            const taskCost = task.task_assignments?.reduce((taskSum: number, assignment: any) => {
              const estimatedHours = assignment.estimated_hours || 0;
              const costRate = assignment.profiles?.cost_rate || 0;
              return taskSum + (estimatedHours * costRate);
            }, 0) || 0;
            return matterSum + taskCost;
          }, 0);
          return sum + matterCost;
        }, 0) / matterGroups.size : 0;

      // Calculate average duration per matter
      const avgDurationDaysPerMatter = matterGroups.size > 0 ?
        Array.from(matterGroups.values()).reduce((sum, matterTasks) => {
          const startedMatterTasks = matterTasks.filter((task: any) => 
            task.commencement_date && new Date(task.commencement_date) <= new Date()
          );
          
          const dates = startedMatterTasks
            .map((task: any) => ({
              start: new Date(task.commencement_date),
              end: task.completed_at ? new Date(task.completed_at) : new Date()
            }));
          
          if (dates.length === 0) return sum;
          
          const earliestStart = new Date(Math.min(...dates.map(d => d.start.getTime())));
          const latestEnd = new Date(Math.max(...dates.map(d => d.end.getTime())));
          const duration = differenceInBusinessDays(latestEnd, earliestStart);
          
          return sum + Math.max(0, duration);
        }, 0) / matterGroups.size : 0;

      const analyticsItem = {
        [type]: key,
        totalTasks: tasks.length,
        avgDurationDaysPerTask: Math.round(isNaN(avgDurationDaysPerTask) ? 0 : avgDurationDaysPerTask),
        avgEstimatedEffortPerTask: Math.round((isNaN(avgEstimatedEffortPerTask) ? 0 : avgEstimatedEffortPerTask) * 10) / 10,
        avgEstimatedCostPerTask: Math.round(isNaN(avgEstimatedCostPerTask) ? 0 : avgEstimatedCostPerTask),
        avgEstimatedCostPerMatter: Math.round(isNaN(avgEstimatedCostPerMatter) ? 0 : avgEstimatedCostPerMatter),
        avgDurationDaysPerMatter: Math.round(isNaN(avgDurationDaysPerMatter) ? 0 : avgDurationDaysPerMatter)
      };

      analytics.push(analyticsItem);
    });

    return analytics;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Legal Practice Management (LPM)</h3>
      </div>

      {/* Matter Timeline Gantt Chart */}
      <MatterGanttChart />

      {/* Workstream Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workstream Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading workstream analytics...</div>
            </div>
          ) : workstreamData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No workstream data available</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Workstream</TableHead>
                  <TableHead className="text-center font-semibold">Total Tasks</TableHead>
                  <TableHead className="text-center font-semibold">Avg Duration (Days) per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Effort (hrs) per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Cost per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Cost per Matter</TableHead>
                  <TableHead className="text-center font-semibold">Avg Duration (Days) per Matter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workstreamData.map((workstream, index) => (
                  <TableRow key={workstream.workstream} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">
                      {workstream.workstream}
                    </TableCell>
                    <TableCell className="text-center">
                      {workstream.totalTasks}
                    </TableCell>
                    <TableCell className="text-center">
                      {workstream.avgDurationDaysPerTask}
                    </TableCell>
                    <TableCell className="text-center">
                      {workstream.avgEstimatedEffortPerTask}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(workstream.avgEstimatedCostPerTask)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(workstream.avgEstimatedCostPerMatter)}
                    </TableCell>
                    <TableCell className="text-center">
                      {workstream.avgDurationDaysPerMatter}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Phase Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading phase analytics...</div>
            </div>
          ) : phaseData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No phase data available</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Phase</TableHead>
                  <TableHead className="text-center font-semibold">Total Tasks</TableHead>
                  <TableHead className="text-center font-semibold">Avg Duration (Days) per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Effort (hrs) per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Cost per Task</TableHead>
                  <TableHead className="text-center font-semibold">Avg Estimated Cost per Matter</TableHead>
                  <TableHead className="text-center font-semibold">Avg Duration (Days) per Matter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseData.map((phase, index) => (
                  <TableRow key={phase.phase} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">
                      {phase.phase}
                    </TableCell>
                    <TableCell className="text-center">
                      {phase.totalTasks}
                    </TableCell>
                    <TableCell className="text-center">
                      {phase.avgDurationDaysPerTask}
                    </TableCell>
                    <TableCell className="text-center">
                      {phase.avgEstimatedEffortPerTask}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(phase.avgEstimatedCostPerTask)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(phase.avgEstimatedCostPerMatter)}
                    </TableCell>
                    <TableCell className="text-center">
                      {phase.avgDurationDaysPerMatter}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}