import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Plus, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  ChevronDown
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  matterId: string;
  matterTitle: string;
  client: string;
  assignedTo: string;
  assignedToName: string;
  workstream: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'Paused';
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  createdDate: string;
}

interface Matter {
  id: string;
  title: string;
  client: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export default function TaskCreation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allWorkstreams, setAllWorkstreams] = useState<string[]>([]);
  const [allPhases, setAllPhases] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    matterId: '',
    assignedTo: '',
    workstream: '',
    phase: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    startDate: '',
    dueDate: '',
    completionDate: '',
    estimatedHours: ''
  });

  useEffect(() => {
    fetchMatters();
    fetchTeamMembers();
    fetchTasks();
    fetchWorkstreams();
    fetchPhases();
  }, []);

  const fetchMatters = async () => {
    try {
      const { data } = await supabase
        .from('matters')
        .select('id, title, client_id')
        .eq('status', 'active');
      
      // Fetch client names separately
      const clientIds = [...new Set(data?.map(m => m.client_id).filter(Boolean) || [])];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      // Create lookup map
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.name]) || []);

      setMatters(data?.map(matter => ({
        id: matter.id,
        title: matter.title,
        client: clientsMap.get(matter.client_id) || 'Unknown Client'
      })) || []);
    } catch (error) {
      console.error('Error fetching matters:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name');
      
      setTeamMembers(data?.map(profile => ({
        id: profile.id,
        name: profile.full_name || 'Unknown',
        role: profile.role || 'staff'
      })) || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchWorkstreams = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('workstream, matters!inner(status)')
        .eq('matters.status', 'active')
        .not('workstream', 'is', null)
        .neq('workstream', '');
      
      const uniqueWorkstreams = [...new Set(data?.map(t => t.workstream).filter(Boolean) || [])];
      setAllWorkstreams(uniqueWorkstreams.sort());
    } catch (error) {
      console.error('Error fetching workstreams:', error);
    }
  };

  const fetchPhases = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('phase, matters!inner(status)')
        .eq('matters.status', 'active')
        .not('phase', 'is', null)
        .neq('phase', '');
      
      const uniquePhases = [...new Set(data?.map(t => t.phase).filter(Boolean) || [])];
      setAllPhases(uniquePhases.sort());
    } catch (error) {
      console.error('Error fetching phases:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch matter details separately
      const matterIds = [...new Set(data?.map(t => t.matter_id).filter(Boolean) || [])];
      const { data: mattersData } = await supabase
        .from('matters')
        .select('id, title, client_id')
        .in('id', matterIds);

      // Fetch client names separately
      const clientIds = [...new Set(mattersData?.map(m => m.client_id).filter(Boolean) || [])];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      // Create lookup maps
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.name]) || []);
      const mattersMap = new Map(mattersData?.map(m => [m.id, { title: m.title, clientName: clientsMap.get(m.client_id) }]) || []);
      
      setTasks(data?.map(task => {
        const matterInfo = mattersMap.get(task.matter_id);
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          matterId: task.matter_id,
          matterTitle: matterInfo?.title || 'Unknown Matter',
          client: matterInfo?.clientName || 'Unknown Client',
          assignedTo: task.assigned_to,
          assignedToName: 'Unassigned', // Simplified for now
          workstream: task.workstream,
          priority: (task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)) as 'High' | 'Medium' | 'Low' || 'Medium',
          status: (task.status?.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')) as 'Open' | 'In Progress' | 'Completed' | 'Paused',
          dueDate: task.due_date,
          estimatedHours: 0, // No estimated_hours field in database
          actualHours: task.actual_hours || 0,
          createdDate: task.created_at
        };
      }) || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMatter = matters.find(m => m.id === formData.matterId);
    const selectedAssignee = teamMembers.find(tm => tm.id === formData.assignedTo);
    
    if (!selectedMatter || !selectedAssignee) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        matter_id: formData.matterId,
        assigned_to: formData.assignedTo,
        workstream: formData.workstream,
        phase: formData.phase,
        priority: formData.priority.toLowerCase(),
        status: editingTask ? editingTask.status : 'open',
        due_date: formData.dueDate,
        commencement_date: formData.startDate,
        completed_at: formData.completionDate ? new Date(formData.completionDate).toISOString() : null
      };

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        
        toast({
          title: "Task Updated",
          description: "The task has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        
        toast({
          title: "Task Created", 
          description: `Task assigned to ${selectedAssignee.name}.`,
        });
      }

      fetchTasks(); // Refresh tasks list
      resetForm();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      matterId: '',
      assignedTo: '',
      workstream: '',
      phase: '',
      priority: 'Medium',
      startDate: '',
      dueDate: '',
      completionDate: '',
      estimatedHours: ''
    });
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      matterId: task.matterId,
      assignedTo: task.assignedTo,
      workstream: task.workstream,
      phase: '', // Will be populated when we have this data in the Task interface
      priority: task.priority,
      startDate: task.createdDate, // Using createdDate as startDate for existing tasks
      dueDate: task.dueDate,
      completionDate: '',
      estimatedHours: task.estimatedHours.toString()
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks(); // Refresh tasks list
      toast({
        title: "Task Deleted",
        description: "The task has been removed.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-500';
      case 'In Progress': return 'bg-yellow-500';
      case 'Completed': return 'bg-green-500';
      case 'Paused': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'In Progress': return <Clock className="w-4 h-4" />;
      case 'Open': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  Task Management
                </h1>
                <p className="text-sm text-muted-foreground">Create and manage legal tasks</p>
              </div>
            </div>
            
            <Button className="elegant-button" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {tasks.filter(t => t.status === 'Open').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Open Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {tasks.filter(t => t.status === 'In Progress').length}
                  </div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {tasks.filter(t => t.status === 'Completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{tasks.length}</div>
                  <div className="text-sm text-muted-foreground">Total Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Creation Form */}
          {isFormOpen && (
            <div className="lg:col-span-1">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="font-serif text-xl text-foreground">
                    {editingTask ? 'Edit Task' : 'Create New Task'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Task Title</Label>
                      <Input
                        id="title"
                        placeholder="Enter task title..."
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the task requirements..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="matter">Matter</Label>
                      <Select value={formData.matterId} onValueChange={(value) => setFormData({...formData, matterId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a matter" />
                        </SelectTrigger>
                        <SelectContent>
                          {matters.map(matter => (
                            <SelectItem key={matter.id} value={matter.id}>
                              {matter.client} - {matter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="assignee">Assign To</Label>
                      <Select value={formData.assignedTo} onValueChange={(value) => setFormData({...formData, assignedTo: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="workstream">Workstream</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               role="combobox"
                               className="w-full justify-between bg-background border-border hover:bg-background"
                             >
                               {formData.workstream || "Select or type workstream..."}
                               <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-full p-0 bg-background border border-border z-50" align="start">
                             <Command className="bg-background">
                               <CommandInput 
                                 placeholder="Search or type new workstream..." 
                                 value={formData.workstream}
                                 onValueChange={(value) => setFormData({...formData, workstream: value})}
                                 className="border-0 focus:ring-0"
                               />
                               <CommandList className="max-h-60 overflow-auto">
                                 <CommandEmpty>
                                   <div className="p-2 text-sm text-muted-foreground">
                                     Press Enter to create "{formData.workstream}"
                                   </div>
                                 </CommandEmpty>
                                 <CommandGroup>
                                   {allWorkstreams.map((ws) => (
                                     <CommandItem
                                       key={ws}
                                       onSelect={() => setFormData({...formData, workstream: ws})}
                                       className="cursor-pointer hover:bg-muted"
                                     >
                                       {ws}
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                       </div>

                       <div>
                         <Label htmlFor="phase">Phase</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               role="combobox"
                               className="w-full justify-between bg-background border-border hover:bg-background"
                             >
                               {formData.phase || "Select or type phase..."}
                               <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-full p-0 bg-background border border-border z-50" align="start">
                             <Command className="bg-background">
                               <CommandInput 
                                 placeholder="Search or type new phase..." 
                                 value={formData.phase}
                                 onValueChange={(value) => setFormData({...formData, phase: value})}
                                 className="border-0 focus:ring-0"
                               />
                               <CommandList className="max-h-60 overflow-auto">
                                 <CommandEmpty>
                                   <div className="p-2 text-sm text-muted-foreground">
                                     Press Enter to create "{formData.phase}"
                                   </div>
                                 </CommandEmpty>
                                 <CommandGroup>
                                   {allPhases.map((phase) => (
                                     <CommandItem
                                       key={phase}
                                       onSelect={() => setFormData({...formData, phase: phase})}
                                       className="cursor-pointer hover:bg-muted"
                                     >
                                       {phase}
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                       </div>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value: 'High' | 'Medium' | 'Low') => setFormData({...formData, priority: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="startDate">Start Date</Label>
                         <Input
                           id="startDate"
                           type="date"
                           value={formData.startDate}
                           onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                           required
                         />
                       </div>
                       <div>
                         <Label htmlFor="dueDate">Due Date</Label>
                         <Input
                           id="dueDate"
                           type="date"
                           value={formData.dueDate}
                           onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                           required
                         />
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="completionDate">Completion Date</Label>
                         <Input
                           id="completionDate"
                           type="date"
                           value={formData.completionDate}
                           onChange={(e) => setFormData({...formData, completionDate: e.target.value})}
                         />
                       </div>
                       <div>
                         <Label htmlFor="estimatedHours">Est. Hours</Label>
                         <Input
                           id="estimatedHours"
                           type="number"
                           step="0.5"
                           placeholder="0.0"
                           value={formData.estimatedHours}
                           onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                           required
                         />
                       </div>
                     </div>

                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tasks List */}
          <div className={isFormOpen ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-foreground">
                  All Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="p-4 border border-border rounded-lg hover:bg-accent/20 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-foreground">{task.title}</h3>
                            <Badge className={`text-white text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                            <Badge className={`text-white text-xs ${getStatusColor(task.status)}`}>
                              <span className="flex items-center space-x-1">
                                {getStatusIcon(task.status)}
                                <span>{task.status}</span>
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{task.client} - {task.matterTitle}</p>
                          <p className="text-sm text-foreground mb-2">{task.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Assigned to: {task.assignedToName}</span>
                            <span>Workstream: {task.workstream}</span>
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          {task.actualHours}h / {task.estimatedHours}h estimated
                        </div>
                        <div className="text-muted-foreground">
                          Created: {new Date(task.createdDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}