import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, CheckCircle2, Clock, Pause, AlertTriangle, X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  workstream: string;
  phase: string;
  priority: string;
  assignedTo: string;
  assignedToName: string;
  status: 'open' | 'in_progress' | 'completed' | 'paused' | 'late' | 'cancelled';
  dueDate: string;
  commencementDate: string;
  completedDate?: string;
  estimatedTotalHours: number;
  actualHours: number;
}

interface TasksTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'in_progress':
    case 'in progress':
      return <Clock className="w-4 h-4 text-blue-500" />;
    case 'open':
      return <Clock className="w-4 h-4 text-blue-600" />;
    case 'paused':
      return <Pause className="w-4 h-4 text-yellow-500" />;
    case 'late':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-gray-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-500 text-white';
    case 'in_progress':
    case 'in progress':
      return 'bg-blue-500 text-white';
    case 'open':
      return 'bg-blue-600 text-white';
    case 'paused':
      return 'bg-yellow-500 text-white';
    case 'late':
      return 'bg-red-500 text-white';
    case 'cancelled':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getWorkstreamColor = (workstream: string) => {
  switch (workstream) {
    case 'Corporate':
      return 'bg-blue-600 text-white';
    case 'Commercial':
      return 'bg-green-600 text-white';
    case 'Employment':
      return 'bg-purple-600 text-white';
    case 'Data':
      return 'bg-orange-600 text-white';
    case 'Real Estate':
      return 'bg-teal-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};

const getProgressPercentage = (task: Task) => {
  if (task.status === 'completed') return 100;
  if (task.estimatedTotalHours === 0) return 0;
  return Math.min((task.actualHours / task.estimatedTotalHours) * 100, 100);
};

// Auto-status function based on actual vs estimated hours
const getAutoTaskStatus = (actualHours: number, estimatedHours: number, currentStatus: string) => {
  // Don't auto-update if task is manually set to Paused or Cancelled
  if (currentStatus?.toLowerCase() === 'paused' || currentStatus?.toLowerCase() === 'cancelled') {
    return currentStatus;
  }
  
  if (actualHours === 0) return 'open';
  if (actualHours > 0 && actualHours < estimatedHours) return 'in_progress';
  if (actualHours >= estimatedHours) return 'completed';
  
  return 'open';
};

export function TasksTable({ tasks, onEditTask }: TasksTableProps) {
  // Apply auto-status logic to tasks before displaying
  const tasksWithAutoStatus = tasks.map(task => ({
    ...task,
    status: getAutoTaskStatus(task.actualHours, task.estimatedTotalHours, task.status) as Task['status']
  }));
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="p-2 text-xs font-medium">Task</TableHead>
            <TableHead className="p-2 text-xs font-medium">Work.</TableHead>
            <TableHead className="p-2 text-xs font-medium">Phase</TableHead>
            <TableHead className="p-2 text-xs font-medium max-w-[120px]">Description</TableHead>
            <TableHead className="p-2 text-xs font-medium">Assignee</TableHead>
            <TableHead className="p-2 text-xs font-medium">Start</TableHead>
            <TableHead className="p-2 text-xs font-medium">Due</TableHead>
            <TableHead className="p-2 text-xs font-medium">Actual</TableHead>
            <TableHead className="p-2 text-xs font-medium">Est. Total</TableHead>
            <TableHead className="p-2 text-xs font-medium">Status</TableHead>
            <TableHead className="p-2 text-xs font-medium w-16">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasksWithAutoStatus.map((task) => (
            <TableRow key={task.id} className="text-xs">
              <TableCell className="p-2 font-medium max-w-[150px]">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(task.status)}
                  <span className="truncate text-xs" title={task.title}>{task.title}</span>
                </div>
              </TableCell>
              <TableCell className="p-2">
                <Badge className={`${getWorkstreamColor(task.workstream)} text-xs px-1 py-0`}>
                  {task.workstream.substring(0, 4)}
                </Badge>
              </TableCell>
              <TableCell className="p-2">
                <span className="text-xs">{task.phase || '-'}</span>
              </TableCell>
              <TableCell className="p-2 max-w-[120px]">
                <div className="truncate text-xs" title={task.description}>
                  {task.description}
                </div>
              </TableCell>
              <TableCell className="p-2 text-xs max-w-[100px]">
                <div className="truncate" title={task.assignedToName}>
                  {task.assignedToName}
                </div>
              </TableCell>
              <TableCell className="p-2 text-xs">{new Date(task.commencementDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</TableCell>
              <TableCell className="p-2 text-xs">{new Date(task.dueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</TableCell>
              <TableCell className="p-2 text-xs">{task.actualHours}h</TableCell>
              <TableCell className="p-2 text-xs">{task.estimatedTotalHours}h</TableCell>
              <TableCell className="p-2">
                <div className="space-y-1 min-w-[80px]">
                 <Badge className={`${getStatusColor(task.status)} text-xs px-1 py-0`}>
                   {task.status === 'open' ? 'Open' : 
                    task.status === 'in_progress' ? 'In Progress' :
                    task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                 </Badge>
                  <Progress value={getProgressPercentage(task)} className="h-1" />
                  <div className="text-xs text-muted-foreground text-center">
                    {Math.round(getProgressPercentage(task))}%
                  </div>
                </div>
              </TableCell>
              <TableCell className="p-2">
                <Button variant="ghost" size="sm" onClick={() => onEditTask(task)} className="h-6 w-6 p-0">
                  <Edit className="w-3 h-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}