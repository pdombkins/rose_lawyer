import React, { useMemo } from 'react';
import { format, eachDayOfInterval, isWeekend, addDays, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GanttExportImport from '@/components/GanttExportImport';

interface TaskAssignment {
  user_id: string;
  profiles: {
    full_name: string;
  } | null;
}

interface Task {
  id: string;
  title: string;
  workstream: string;
  status: string;
  assigned_to: string;
  commencement_date: string | null;
  due_date: string | null;
  estimated_total_hours: number;
  actual_hours: number;
  order_position?: number;
  task_assignments?: TaskAssignment[];
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface GanttChartProps {
  tasks: Task[];
  profiles: Profile[];
  matterTitle: string;
  matterId: string;
  onDataUpdated: () => void;
}

const getWorkstreamColor = (workstream: string) => {
  const colors = {
    Corporate: 'bg-blue-500',
    Commercial: 'bg-green-500',
    Employment: 'bg-purple-500',
    Data: 'bg-orange-500',
    'Real Estate': 'bg-red-500',
  };
  return colors[workstream as keyof typeof colors] || 'bg-gray-500';
};

const getStatusColor = (status: string) => {
  const normalizedStatus = status;
  
  const colors = {
    'open': 'bg-blue-100 text-blue-800',
    'in_progress': 'bg-yellow-100 text-yellow-800', 
    'completed': 'bg-green-100 text-green-800',
    'paused': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800',
  };
  return colors[normalizedStatus as keyof typeof colors] || 'bg-blue-100 text-blue-800';
};

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, profiles, matterTitle, matterId, onDataUpdated }) => {
  const { processedTasks, dateRange, totalDays } = useMemo(() => {
    // Filter tasks with valid dates and sort by order_position
    const validTasks = tasks
      .filter(task => task.commencement_date && task.due_date)
      .sort((a, b) => (a.order_position || 0) - (b.order_position || 0));

    if (validTasks.length === 0) {
      return { processedTasks: [], dateRange: [], totalDays: 0 };
    }

    // Find date range - use parseISO for consistent timezone handling
    const startDates = validTasks.map(task => parseISO(task.commencement_date!));
    const endDates = validTasks.map(task => parseISO(task.due_date!));
    
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));

    // Generate date range (business days only)
    const allDates = eachDayOfInterval({ start: minDate, end: maxDate });
    const businessDays = allDates.filter(date => !isWeekend(date));

    // Process tasks with positioning
    const processed = validTasks.map(task => {
      const taskStart = parseISO(task.commencement_date!);
      const taskEnd = parseISO(task.due_date!);
      
      const startOffset = businessDays.findIndex(date => 
        date >= taskStart
      );
      const endOffset = businessDays.findIndex(date => 
        date >= taskEnd
      );
      
      const duration = Math.max(1, endOffset - startOffset + 1);
      
      // Get assigned users from task_assignments or fall back to assigned_to
      let assigneeNames: string[] = [];
      if (task.task_assignments && task.task_assignments.length > 0) {
        // Map through task assignments to get user names and estimated/actual hours
        const assignmentDetails = task.task_assignments.map(assignment => {
          const userName = assignment.profiles?.full_name || 'Unknown User';
          return userName;
        }).filter(name => name !== 'Unknown User');
        
        assigneeNames = assignmentDetails;
      } else if (task.assigned_to) {
        const assigneeName = profiles.find(p => p.id === task.assigned_to)?.full_name;
        if (assigneeName) {
          assigneeNames = [assigneeName];
        }
      }
      
      const assigneeName = assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned';

      return {
        ...task,
        startOffset: Math.max(0, startOffset),
        duration,
        assigneeName,
        taskStart,
        taskEnd,
      };
    });

    return {
      processedTasks: processed,
      dateRange: businessDays,
      totalDays: businessDays.length,
    };
  }, [tasks, profiles]);


  if (processedTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gantt Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tasks with valid dates available for Gantt chart display.</p>
        </CardContent>
      </Card>
    );
  }

  const dayWidth = Math.max(20, Math.min(40, 800 / totalDays));
  const chartWidth = totalDays * dayWidth;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gantt Chart</CardTitle>
        <GanttExportImport 
          tasks={tasks}
          profiles={profiles}
          matterTitle={matterTitle}
          matterId={matterId}
          onDataUpdated={onDataUpdated}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Date headers */}
          <div className="flex mb-4" style={{ width: chartWidth + 200 }}>
            <div className="w-48 flex-shrink-0"></div>
            <div className="flex">
              {dateRange.map((date, index) => (
                <div
                  key={index}
                  className="text-xs text-center border-r border-gray-200 flex-shrink-0"
                  style={{ width: dayWidth }}
                >
                  <div className="font-semibold">{format(date, 'MMM')}</div>
                  <div>{format(date, 'd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {processedTasks.map((task) => (
              <div key={task.id} className="flex items-center" style={{ width: chartWidth + 200 }}>
                {/* Task info */}
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="text-sm font-medium truncate" title={task.title}>
                    {task.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {task.assigneeName}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {task.workstream}
                    </Badge>
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>

                {/* Gantt bar */}
                <div className="relative flex-1 h-8">
                  <div
                    className={`absolute h-6 rounded ${getWorkstreamColor(task.workstream)} opacity-80 flex items-center justify-center`}
                    style={{
                      left: task.startOffset * dayWidth,
                      width: task.duration * dayWidth,
                      minWidth: dayWidth,
                    }}
                  >
                    <span className="text-xs text-white font-medium truncate px-1">
                      {task.estimated_total_hours}h
                    </span>
                  </div>
                  
                  {/* Progress overlay */}
                  {task.actual_hours > 0 && (
                    <div
                      className="absolute h-6 rounded bg-green-600 opacity-90"
                      style={{
                        left: task.startOffset * dayWidth,
                        width: (task.duration * dayWidth) * (task.actual_hours / task.estimated_total_hours),
                        minWidth: Math.min(dayWidth / 4, task.duration * dayWidth),
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Corporate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Commercial</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>Employment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Real Estate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Completed Hours</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};