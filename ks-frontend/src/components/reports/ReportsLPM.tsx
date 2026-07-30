import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { differenceInBusinessDays, format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

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

interface Matter {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name?: string;
}

interface GanttData {
  matter: Matter;
  startDate: Date;
  endDate: Date;
  duration: number;
  position: number;
  width: number;
}

export function ReportsLPM() {
  const [workstreamData, setWorkstreamData] = useState<WorkstreamAnalytics[]>([]);
  const [phaseData, setPhaseData] = useState<PhaseAnalytics[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [ganttData, setGanttData] = useState<GanttData[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLPMData();
  }, []);

  const loadLPMData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWorkstreamAnalytics(),
        loadPhaseAnalytics(),
        loadMatters()
      ]);
    } catch (error) {
      console.error('Error loading LPM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkstreamAnalytics = async () => {
    try {
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
        console.error('Error fetching tasks:', tasksError);
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
      const analytics: WorkstreamAnalytics[] = [];
      
      // Sort workstreams alphabetically
      const sortedWorkstreams = Array.from(workstreamMap.keys()).sort();
      
      sortedWorkstreams.forEach((workstream) => {
        const group = workstreamMap.get(workstream)!;
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

        // Calculate average estimated cost per matter for this workstream
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

        analytics.push({
          workstream,
          totalTasks: tasks.length,
          avgDurationDaysPerTask: Math.round(isNaN(avgDurationDaysPerTask) ? 0 : avgDurationDaysPerTask),
          avgEstimatedEffortPerTask: Math.round((isNaN(avgEstimatedEffortPerTask) ? 0 : avgEstimatedEffortPerTask) * 10) / 10,
          avgEstimatedCostPerTask: Math.round(isNaN(avgEstimatedCostPerTask) ? 0 : avgEstimatedCostPerTask),
          avgEstimatedCostPerMatter: Math.round(isNaN(avgEstimatedCostPerMatter) ? 0 : avgEstimatedCostPerMatter),
          avgDurationDaysPerMatter: Math.round(isNaN(avgDurationDaysPerMatter) ? 0 : avgDurationDaysPerMatter)
        });
      });

      // Sort alphabetically by workstream name
      analytics.sort((a, b) => a.workstream.localeCompare(b.workstream));
      setWorkstreamData(analytics);
    } catch (error) {
      console.error('Error loading workstream analytics:', error);
    }
  };

  const loadPhaseAnalytics = async () => {
    try {
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
      const analytics: PhaseAnalytics[] = [];
      
      // Sort phases alphabetically
      const sortedPhases = Array.from(phaseMap.keys()).sort();
      
      sortedPhases.forEach((phase) => {
        const group = phaseMap.get(phase)!;
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

        // Calculate average estimated cost per matter for this phase
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

        analytics.push({
          phase,
          totalTasks: tasks.length,
          avgDurationDaysPerTask: Math.round(isNaN(avgDurationDaysPerTask) ? 0 : avgDurationDaysPerTask),
          avgEstimatedEffortPerTask: Math.round((isNaN(avgEstimatedEffortPerTask) ? 0 : avgEstimatedEffortPerTask) * 10) / 10,
          avgEstimatedCostPerTask: Math.round(isNaN(avgEstimatedCostPerTask) ? 0 : avgEstimatedCostPerTask),
          avgEstimatedCostPerMatter: Math.round(isNaN(avgEstimatedCostPerMatter) ? 0 : avgEstimatedCostPerMatter),
          avgDurationDaysPerMatter: Math.round(isNaN(avgDurationDaysPerMatter) ? 0 : avgDurationDaysPerMatter)
        });
      });

      // Sort alphabetically by phase name
      analytics.sort((a, b) => a.phase.localeCompare(b.phase));
      setPhaseData(analytics);
    } catch (error) {
      console.error('Error loading phase analytics:', error);
    }
  };

  const loadMatters = async () => {
    try {
      const { data: mattersData, error } = await supabase
        .from('matters')
        .select(`
          id,
          title,
          status,
          start_date,
          end_date,
          clients!inner(name)
        `)
        .eq('status', 'active')
        .not('start_date', 'is', null)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching matters:', error);
        return;
      }

      const processedMatters: Matter[] = mattersData?.map(matter => ({
        ...matter,
        client_name: (matter.clients as any)?.name
      })) || [];

      setMatters(processedMatters);
      
      if (processedMatters.length > 0) {
        calculateGanttData(processedMatters);
      }
    } catch (error) {
      console.error('Error loading matters:', error);
    }
  };

  const calculateGanttData = (mattersData: Matter[]) => {
    const validMatters = mattersData.filter(matter => matter.start_date);
    
    if (validMatters.length === 0) return;

    // Find the overall date range
    const startDates = validMatters.map(matter => new Date(matter.start_date!));
    const endDates = validMatters.map(matter => 
      matter.end_date ? new Date(matter.end_date) : new Date()
    );

    const minStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    // Extend range to full months for better visualization
    const rangeStart = startOfMonth(minStart);
    const rangeEnd = endOfMonth(maxEnd);
    const totalDays = differenceInDays(rangeEnd, rangeStart);

    setDateRange({ start: rangeStart, end: rangeEnd });

    // Calculate gantt data for each matter
    const ganttItems: GanttData[] = validMatters.map(matter => {
      const startDate = new Date(matter.start_date!);
      const endDate = matter.end_date ? new Date(matter.end_date) : new Date();
      
      const daysFromStart = differenceInDays(startDate, rangeStart);
      const duration = differenceInDays(endDate, startDate);
      
      const position = (daysFromStart / totalDays) * 100;
      const width = (duration / totalDays) * 100;

      return {
        matter,
        startDate,
        endDate,
        duration: Math.max(1, duration),
        position: Math.max(0, position),
        width: Math.max(1, width)
      };
    });

    setGanttData(ganttItems);
  };

  const getMonthHeaders = () => {
    if (!dateRange) return [];
    
    const months = eachMonthOfInterval({
      start: dateRange.start,
      end: dateRange.end
    });

    const totalDays = differenceInDays(dateRange.end, dateRange.start);

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const daysFromStart = differenceInDays(monthStart, dateRange.start);
      const monthDays = differenceInDays(monthEnd, monthStart) + 1;
      
      const position = (daysFromStart / totalDays) * 100;
      const width = (monthDays / totalDays) * 100;

      return {
        month,
        position,
        width,
        label: format(month, 'MMM yyyy')
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'on hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading LPM report data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Legal Practice Management (LPM) Report</h3>
      </div>

      {/* Matter Timeline Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Active Matters Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {matters.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No active matters with start dates found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Month Headers */}
              <div className="relative h-8 border-b border-border">
                {getMonthHeaders().map((header, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-muted-foreground border-r border-border/50"
                    style={{
                      left: `${header.position}%`,
                      width: `${header.width}%`
                    }}
                  >
                    {header.label}
                  </div>
                ))}
              </div>

              {/* Gantt Bars */}
              <div className="space-y-3">
                {ganttData.map((item, index) => (
                  <div key={item.matter.id} className="relative">
                    <div className="flex items-center gap-4 min-h-[40px]">
                      {/* Matter Info */}
                      <div className="w-80 flex-shrink-0">
                        <div className="font-medium text-sm truncate" title={item.matter.title}>
                          {item.matter.title}
                        </div>
                        {item.matter.client_name && (
                          <div className="text-xs text-muted-foreground truncate" title={item.matter.client_name}>
                            {item.matter.client_name}
                          </div>
                        )}
                      </div>

                      {/* Gantt Bar Container */}
                      <div className="flex-1 relative h-6 bg-muted/30 rounded">
                        <div
                          className={`absolute h-full rounded ${getStatusColor(item.matter.status)} opacity-80 hover:opacity-100 transition-opacity`}
                          style={{
                            left: `${item.position}%`,
                            width: `${item.width}%`
                          }}
                          title={`${item.matter.title}: ${format(item.startDate, 'MMM dd, yyyy')} - ${format(item.endDate, 'MMM dd, yyyy')} (${item.duration} days)`}
                        />
                      </div>

                      {/* Duration */}
                      <div className="w-20 flex-shrink-0 text-right">
                        <Badge variant="outline" className="text-xs">
                          {item.duration}d
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <span className="text-sm font-medium">Status:</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-xs">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-xs">On Hold</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workstream Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workstream Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {workstreamData.length === 0 ? (
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