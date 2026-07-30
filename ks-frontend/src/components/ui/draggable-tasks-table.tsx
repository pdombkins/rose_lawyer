import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, CheckCircle2, Clock, Pause, AlertTriangle, X, GripVertical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reorderTasks } from "@/lib/roseBackend";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string;
  workstream: string;
  assignedTo: string;
  assignedToName: string;
  status: 'open' | 'in_progress' | 'completed' | 'paused' | 'late' | 'cancelled';
  dueDate: string;
  commencementDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours: number;
  completedHours: number;
  orderPosition: number;
}

interface DraggableTasksTableProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onTasksReordered: (tasks: Task[]) => void;
  matterId: string;
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
  if (task.estimatedHours === 0) return 0;
  return Math.min((task.completedHours / task.estimatedHours) * 100, 100);
};

function SortableTaskRow({ task, onEditTask }: { task: Task; onEditTask: (task: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={`text-xs ${isDragging ? 'opacity-50' : ''}`}
    >
      <TableCell className="p-2 w-8">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded flex items-center justify-center"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </TableCell>
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
      <TableCell className="p-2 text-xs">{task.completedHours}h</TableCell>
      <TableCell className="p-2 text-xs">{task.estimatedHours}h</TableCell>
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
  );
}

export function DraggableTasksTable({ tasks, onEditTask, onTasksReordered, matterId }: DraggableTasksTableProps) {
  const [isReordering, setIsReordering] = useState(false);
  const { toast } = useToast();
  
  // Debounce timer ref for batch updates
  const batchUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<{ id: string; order_position: number }[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchUpdateTimerRef.current) {
        clearTimeout(batchUpdateTimerRef.current);
      }
    };
  }, []);

  // Batch update function that sends all position changes at once
  const executeBatchUpdate = useCallback(async (positions: { id: string; order_position: number }[]) => {
    if (positions.length === 0) return;
    
    setIsReordering(true);
    
    try {
      // Batch reorder via the Rose backend (authenticated, membership-scoped).
      // Was the `batch-update-tasks` edge function, which ran unauthenticated
      // with the service-role key.
      try {
        await reorderTasks(matterId, positions);
      } catch (fnError) {
        console.warn('Batch reorder failed, falling back to individual updates:', fnError);
        // Fallback goes through the Supabase client, so RLS still applies —
        // a student cannot reorder a matter they are not a member of.
        await Promise.all(
          positions.map(pos =>
            supabase
              .from('tasks')
              .update({ order_position: pos.order_position })
              .eq('id', pos.id)
          )
        );
      }

      toast({
        title: "Tasks Reordered",
        description: "Task order has been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating task order:', error);
      toast({
        title: "Error",
        description: "Failed to save task order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsReordering(false);
      pendingUpdatesRef.current = [];
    }
  }, [toast]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    
    // Update order positions
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      orderPosition: index + 1
    }));

    // Optimistically update the UI immediately
    onTasksReordered(updatedTasks);

    // Collect positions for batch update
    const positions = updatedTasks.map(task => ({
      id: task.id,
      order_position: task.orderPosition
    }));

    // Debounce the database update to handle rapid reordering
    if (batchUpdateTimerRef.current) {
      clearTimeout(batchUpdateTimerRef.current);
    }

    pendingUpdatesRef.current = positions;
    
    batchUpdateTimerRef.current = setTimeout(() => {
      executeBatchUpdate(pendingUpdatesRef.current);
    }, 300); // 300ms debounce for rapid reordering
  }, [tasks, onTasksReordered, executeBatchUpdate]);

  // Sort tasks by orderPosition
  const sortedTasks = [...tasks].sort((a, b) => a.orderPosition - b.orderPosition);

  return (
    <div className="relative rounded-md border overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="p-2 text-xs font-medium w-8"></TableHead>
              <TableHead className="p-2 text-xs font-medium">Task</TableHead>
              <TableHead className="p-2 text-xs font-medium">Work.</TableHead>
              <TableHead className="p-2 text-xs font-medium max-w-[120px]">Description</TableHead>
              <TableHead className="p-2 text-xs font-medium">Assignee</TableHead>
              <TableHead className="p-2 text-xs font-medium">Start</TableHead>
              <TableHead className="p-2 text-xs font-medium">Due</TableHead>
              <TableHead className="p-2 text-xs font-medium">Completed</TableHead>
              <TableHead className="p-2 text-xs font-medium">Total</TableHead>
              <TableHead className="p-2 text-xs font-medium">Status</TableHead>
              <TableHead className="p-2 text-xs font-medium w-16">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext 
              items={sortedTasks.map(task => task.id)} 
              strategy={verticalListSortingStrategy}
            >
              {sortedTasks.map((task) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  onEditTask={onEditTask}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
      
      {isReordering && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving order...
          </div>
        </div>
      )}
    </div>
  );
}
