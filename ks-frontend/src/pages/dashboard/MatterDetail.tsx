import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ksHealth } from "@/lib/roseBackend";
import { useToast } from "@/hooks/use-toast";
import { generateWIPExcelReport } from "@/utils/wipExcelReport";
import { generatePerformanceReport } from "@/utils/performanceReport";
import { calculateMatterProfitability } from "@/utils/profitabilityCalculator";
import { useProfile } from '@/contexts/ProfileContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useWorkstreams } from '@/hooks/useWorkstreams';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { TasksTable } from "@/components/ui/tasks-table";
import { GroupedTasksTable } from "@/components/ui/grouped-tasks-table";
import { MultiResourceTasksTable } from "@/components/ui/multi-resource-tasks-table";
import { GanttChart } from "@/components/GanttChart";
import { TaskAssignments } from "@/components/TaskAssignments";
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  FileText, 
  Users, 
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Download,
  Upload,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Pause,
  X,
  Trash2,
  Activity,
  Wifi,
  WifiOff,
  MoreHorizontal,
  ChevronDown,
  Loader2
} from "lucide-react";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { RosePanelButton } from "@/components/rose/RosePanel";

interface TaskAssignment {
  user_id: string;
  estimated_hours: number;
  actual_hours: number;
  profile?: {
    id: string;
    full_name: string;
    role: string;
    hourly_rate: number;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  workstream: string;
  phase: string;
  priority: string;
  assignedTo: string;
  assignedToName: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Paused' | 'Late' | 'Cancelled';
  dueDate: string;
  commencementDate: string;
  completedDate?: string;
  estimatedTotalHours: number;
  actualHours: number;
  orderPosition: number;
  task_assignments?: TaskAssignment[];
}

interface Document {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  version: number;
}

interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userRole: string;
  userName: string;
  hours: number;
  description: string;
  rate: number;
  totalFee: number;
  date: string;
  createdAt: string;
  source: string;
}

interface Matter {
  id: string;
  title: string;
  client: string;
  description: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  startDate: string;
  estimatedCompletionDate: string;
  actualCompletionDate?: string;
  estimatedTotalFees: number;
  actualTotalFees: number;
  primaryPartner: string;
  primaryPartnerName: string;
  fee_type?: string;
  fixed_fee?: number;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// Status normalization functions with auto-update logic
const getAutoStatus = (actualHours: number, estimatedHours: number, currentStatus: string): Task['status'] => {
  // Don't auto-update if task is manually set to Paused or Cancelled
  if (currentStatus?.toLowerCase() === 'paused' || currentStatus?.toLowerCase() === 'cancelled') {
    return normalizeTaskStatus(currentStatus);
  }
  
  if (actualHours === 0) return 'Open';
  if (actualHours > 0 && actualHours < estimatedHours) return 'In Progress';
  if (actualHours >= estimatedHours) return 'Completed';
  
  return 'Open';
};

const normalizeTaskStatus = (dbStatus: string): Task['status'] => {
  const statusMap: Record<string, Task['status']> = {
    'open': 'Open',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'paused': 'Paused',
    'late': 'Late',
    'cancelled': 'Cancelled'
  };
  return statusMap[dbStatus?.toLowerCase()] || 'Open';
};

const denormalizeTaskStatus = (uiStatus: Task['status']): string => {
  const statusMap: Record<Task['status'], string> = {
    'Open': 'open',
    'In Progress': 'in_progress',
    'Completed': 'completed',
    'Paused': 'paused',
    'Late': 'late',
    'Cancelled': 'cancelled'
  };
  return statusMap[uiStatus] || 'open';
};

const normalizeMatterStatus = (dbStatus: string): Matter['status'] => {
  const statusMap: Record<string, Matter['status']> = {
    'active': 'Active',
    'completed': 'Completed',
    'on_hold': 'On Hold',
    'cancelled': 'Cancelled'
  };
  return statusMap[dbStatus?.toLowerCase()] || 'Active';
};

const denormalizeMatterStatus = (uiStatus: Matter['status']): string => {
  const statusMap: Record<Matter['status'], string> = {
    'Active': 'active',
    'Completed': 'completed',
    'On Hold': 'on_hold',
    'Cancelled': 'cancelled'
  };
  return statusMap[uiStatus] || 'active';
};

export default function MatterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedProfile } = useProfile();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Tab and URL parameter handling
  const [activeTab, setActiveTab] = useState("tasks");
  
  const [matter, setMatter] = useState<Matter | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
const [documents, setDocuments] = useState<Document[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]); // All team members for dropdowns
  const [assignmentsByUser, setAssignmentsByUser] = useState<Record<string, string[]>>({});
  const [allWorkstreams, setAllWorkstreams] = useState<string[]>([]);
  const [allPhases, setAllPhases] = useState<string[]>([]);
  const [showTimeEntryDialog, setShowTimeEntryDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);
  
  // Time entry form state
  const [timeEntryForm, setTimeEntryForm] = useState({
    taskId: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const matterId = id;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });
  const [showEditMatterDialog, setShowEditMatterDialog] = useState(false);
  const [editMatterForm, setEditMatterForm] = useState({
    title: '',
    client: '',
    description: '',
    status: '',
    startDate: '',
    estimatedCompletionDate: '',
    primaryPartner: '',
    feeType: 'hourly_rates',
    fixedFee: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [matterDocuments, setMatterDocuments] = useState<any[]>([]);
  const [documentUploadMode, setDocumentUploadMode] = useState(false);
  const [editTaskForm, setEditTaskForm] = useState({
    title: '',
    description: '',
    workstream: '',
    phase: '',
    priority: '',
    assignedTo: '',
    status: '',
    dueDate: '',
    commencementDate: '',
    estimatedHours: '',
    completedHours: '',
    linkedDocumentId: '',
    newDocumentFile: null as File | null,
    newDocumentTitle: '',
    newDocumentDescription: '',
  });
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    workstream: '',
    phase: '',
    priority: '',
    assignedTo: '',
    estimatedHours: '',
  });

  const runDiagnostics = async () => {
    console.log('🔍 Starting comprehensive diagnostics...');
    const results: any = {};

    // Test 1: Direct Supabase connection
    console.log('📡 Testing direct Supabase connection...');
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('time_entries')
        .select('id')
        .limit(1);
      const duration = Date.now() - startTime;
      
      if (error) {
        results.supabaseConnection = { 
          status: 'error', 
          error: error.message,
          duration 
        };
        console.error('❌ Supabase connection failed after', duration, 'ms:', error);
      } else {
        results.supabaseConnection = { 
          status: 'success', 
          recordCount: data?.length || 0,
          duration 
        };
        console.log('✅ Supabase connection successful after', duration, 'ms');
      }
    } catch (e: any) {
      results.supabaseConnection = { 
        status: 'error', 
        error: e.message 
      };
      console.error('❌ Supabase connection exception:', e);
    }

    // Test 2: Edge Function connectivity
    console.log('🚀 Testing Edge Function connectivity...');
    try {
      const startTime = Date.now();
      // Was a ping to the unauthenticated `webhook-time-entry` edge
      // function. Now checks the Rose backend, which also reports how many
      // K&S matters this user can actually see — more useful than a pong.
      let data: unknown = null;
      let error: Error | null = null;
      try {
        data = await ksHealth();
      } catch (e) {
        error = e as Error;
      }
      const duration = Date.now() - startTime;
      
      if (error) {
        results.edgeFunction = { 
          status: 'error', 
          error: error.message,
          duration 
        };
        console.error('❌ Edge function failed after', duration, 'ms:', error);
      } else {
        results.edgeFunction = { 
          status: 'success', 
          response: data,
          duration 
        };
        console.log('✅ Edge function successful after', duration, 'ms:', data);
      }
    } catch (e: any) {
      results.edgeFunction = { 
        status: 'error', 
        error: e.message 
      };
      console.error('❌ Edge function exception:', e);
    }

    // Test 3: Authentication status
    console.log('🔐 Checking authentication status...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      results.authentication = {
        status: user ? 'authenticated' : 'anonymous',
        userId: user?.id || null,
        email: user?.email || null,
        error: error?.message || null
      };
      console.log('🔐 Auth status:', results.authentication);
    } catch (e: any) {
      results.authentication = { 
        status: 'error', 
        error: e.message 
      };
      console.error('❌ Auth check exception:', e);
    }

    // Test 4: Network connectivity (basic fetch test)
    console.log('🌐 Testing basic network connectivity...');
    try {
      const startTime = Date.now();
      const response = await fetch('https://httpbin.org/json', { method: 'GET' });
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        results.networkConnectivity = { 
          status: 'success', 
          duration,
          statusCode: response.status 
        };
        console.log('✅ Network connectivity successful in', duration, 'ms');
      } else {
        results.networkConnectivity = { 
          status: 'error', 
          statusCode: response.status,
          duration 
        };
        console.error('❌ Network connectivity failed:', response.status);
      }
    } catch (e: any) {
      results.networkConnectivity = { 
        status: 'error', 
        error: e.message 
      };
      console.error('❌ Network connectivity exception:', e);
    }

    console.log('🔍 Diagnostics complete:', results);
    
    toast({
      title: "Diagnostics Complete",
      description: `Tested ${Object.keys(results).length} connections. Check console for details.`,
    });
  };

  const loadTimeEntries = async () => {
    console.log('📊 Loading time entries for matter:', matterId);
    try {
      let data: any[] = [];

      // Read the ledger through the Supabase client. This used to try the
      // unauthenticated `webhook-time-entry` edge function first and fall back
      // here; the fallback is now the only path, and the better one — it runs
      // as the student, so RLS scopes it to their own matter.
      {
        const startTime = Date.now();
        const { data: result, error } = await supabase
          .from('time_entries')
          .select(`
            *,
            profiles!inner(
              id,
              full_name,
              role
            ),
            tasks(
              title
            )
          `)
          .eq('matter_id', matterId)
          .order('date', { ascending: false });
        const duration = Date.now() - startTime;

        if (error) {
          console.error('❌ Direct query failed after', duration, 'ms:', error);
          throw error;
        }
        
        data = result || [];
        console.log('✅ Time entries loaded in', duration, 'ms:', data.length, 'entries');
      }

      // Transform data to match TimeEntry interface
      console.log('Raw time entries data:', data.map(d => ({ user_id: d.user_id, profiles: d.profiles, user_name: d.user_name })));
      
      const timeEntries: TimeEntry[] = data.map((entry, index) => ({
        id: entry.id || `temp-${index}`,
        taskId: entry.task_id || '',
        taskTitle: entry.tasks?.title || entry.task_title || 'Unknown Task',
        userId: entry.user_id || '',
        userRole: entry.profiles?.role || entry.user_role || 'Staff',
        userName: entry.profiles?.full_name || entry.user_name || `Unknown User (ID: ${entry.user_id})`,
        hours: parseFloat(entry.hours) || 0,
        description: entry.description || '',
        rate: parseFloat(entry.hourly_rate || entry.rate) || 0,
        totalFee: parseFloat(entry.total_fee) || (parseFloat(entry.hours) || 0) * (parseFloat(entry.hourly_rate || entry.rate) || 0),
        date: entry.date || new Date().toISOString().split('T')[0],
        createdAt: entry.created_at || new Date().toISOString(),
        source: entry.source || 'manual'
      }));

      console.log('📊 Time entries loaded and transformed:', timeEntries.length);
      setTimeEntries(timeEntries);

    } catch (error) {
      console.error('🚨 All time entry loading methods failed:', error);
      
      // Fallback to empty array with a single demo entry
      const fallbackEntries: TimeEntry[] = [{
        id: 'demo-1',
        taskId: '850e8400-e29b-41d4-a716-446655440001',
        taskTitle: 'Demo Task',
        userId: 'demo-user',
        userRole: 'Partner',
        userName: 'Demo User',
        hours: 2.5,
        description: 'Demo time entry - data loading failed',
        rate: 850,
        totalFee: 2125,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        source: 'manual'
      }];
      
      setTimeEntries(fallbackEntries);
      console.log('⚠️ Using fallback time entries');
    }
  };

  const loadMatterDocuments = async () => {
    if (!matterId) return;
    
    let attempts = 0;
    try {
      let maxAttempts = 3;
      let documentsData = null;
      
      while (attempts < maxAttempts && !documentsData) {
        attempts++;
        console.log(`Document loading attempt ${attempts}/${maxAttempts}`);
        
        try {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('matter_id', matterId)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error(`Attempt ${attempts} failed:`, error);
            if (attempts === maxAttempts) {
              throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
          
          documentsData = data || [];
          break;
        } catch (err) {
          console.error(`Network error on attempt ${attempts}:`, err);
          if (attempts === maxAttempts) {
            throw err;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
      
      console.log('Documents loaded successfully:', documentsData?.length || 0);
      setMatterDocuments(documentsData || []);
      
      // Also update the main documents display to keep them in sync
      const formattedDocs: Document[] = (documentsData || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description || '',
        fileType: doc.file_type,
        fileSize: doc.file_size,
        uploadedBy: doc.uploaded_by || 'Unknown',
        uploadedByName: 'Demo User',
        uploadedAt: doc.created_at,
        version: doc.version || 1,
      }));
      
      setDocuments(formattedDocs);
      
    } catch (err) {
      console.error('All document loading attempts failed:', err);
      // Use existing documents state as fallback if available
      const fallbackDocs = documents.length > 0 ? 
        documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          description: doc.description,
          file_name: doc.title,
          file_type: doc.fileType,
          created_at: doc.uploadedAt,
        })) : [];
      
      setMatterDocuments(fallbackDocs);
      console.log('Using fallback documents:', fallbackDocs.length);
    }
  };

  // Task editing handlers
  const handleEditTask = async (task: Task) => {
    setEditingTask(task);

    // Always fetch the freshest task values from Supabase to pre-populate form
    let dbTask: any = null;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task.id)
        .single();
      if (error) {
        console.warn('Could not fetch task from DB, falling back to local task:', error);
      }
      dbTask = data || null;
    } catch (e) {
      console.warn('DB task fetch exception, using local task:', e);
    }

    // Helper to format dates for date inputs (YYYY-MM-DD)
    const formatDateForInput = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };

    // Prefer DB values when available, fallback to local task
    const uiStatus = dbTask ? normalizeTaskStatus(dbTask.status) : (task.status || 'Open');
    const dueDate = dbTask ? formatDateForInput(dbTask.due_date) : formatDateForInput(task.dueDate);
    const commencementDate = dbTask ? formatDateForInput(dbTask.commencement_date) : formatDateForInput(task.commencementDate);
    const estimatedHours = dbTask ? Number(dbTask.estimated_total_hours) || 0 : (task.estimatedTotalHours || 0);
    const actualHours = dbTask ? Number(dbTask.actual_hours) || 0 : (task.actualHours || 0);

      setEditTaskForm({
        title: (dbTask?.title ?? task.title) || '',
        description: (dbTask?.description ?? task.description) || '',
        workstream: (dbTask?.workstream ?? task.workstream) || '',
        phase: (dbTask?.phase ?? task.phase) || '',
        priority: (dbTask?.priority ?? task.priority) || '',
        assignedTo: (dbTask?.assigned_to ?? task.assignedTo) || '',
        status: uiStatus,
        dueDate,
        commencementDate,
        estimatedHours: String(estimatedHours),
        completedHours: String(actualHours),
        linkedDocumentId: '',
        newDocumentFile: null,
        newDocumentTitle: '',
        newDocumentDescription: '',
      });

    // Load existing task assignments (pre-populate hours by assignee)
    try {
      const { data: existingAssignments, error } = await supabase
        .from('task_assignments')
        .select('*, profiles(id, full_name, role, hourly_rate)')
        .eq('task_id', task.id);

      if (error) {
        console.error('Error loading task assignments:', error);
        setTaskAssignments([]);
      } else {
        const assignments = (existingAssignments || []).map((assignment: any) => ({
          id: assignment.id,
          user_id: assignment.user_id,
          estimated_hours: Number(assignment.estimated_hours) || 0,
          actual_hours: Number(assignment.actual_hours) || 0,
          profile: assignment.profiles
        }));
        setTaskAssignments(assignments);

        // Also sync totals back into the edit form for display consistency
        const totalEstimated = assignments.reduce((s: number, a: any) => s + (a.estimated_hours || 0), 0);
        const totalActual = assignments.reduce((s: number, a: any) => s + (a.actual_hours || 0), 0);
        setEditTaskForm(prev => ({
          ...prev,
          estimatedHours: String(totalEstimated),
          completedHours: String(totalActual),
        }));
      }
    } catch (error) {
      console.error('Error loading task assignments:', error);
      setTaskAssignments([]);
    }

    setDocumentUploadMode(false);

    // Always reload documents to ensure fresh data for dropdown
    loadMatterDocuments().then(() => {
      console.log('Documents refreshed for task editing');
    });

    setShowEditTaskDialog(true);
  };

  const handleEditTaskSubmit = async () => {
    if (!editTaskForm.title) {
      toast({
        title: "Validation Error",
        description: "Task title is required.",
        variant: "destructive"
      });
      return;
    }

    if (editingTask) {
      let documentId = editTaskForm.linkedDocumentId;
      
      try {
        // Handle new document upload if provided
        if (documentUploadMode && editTaskForm.newDocumentFile && editTaskForm.newDocumentTitle) {
          const file = editTaskForm.newDocumentFile;
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `${matterId}/${fileName}`;
          
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            toast({
              title: "Upload Error",
              description: "Failed to upload document. Please try again.",
              variant: "destructive"
            });
            return;
          }

          // Create document record
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
              matter_id: matterId,
              task_id: editingTask.id,
              title: editTaskForm.newDocumentTitle,
              description: editTaskForm.newDocumentDescription || null,
              file_name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id || null
            })
            .select()
            .single();

          if (docError) {
            console.error('Document creation error:', docError);
            toast({
              title: "Document Error",
              description: "Failed to save document record. Please try again.",
              variant: "destructive"
            });
            return;
          }

          documentId = docData.id;
          
          // Refresh documents list after upload
          await loadMatterDocuments();
        }

        // Get original assignments to compare changes
        const { data: originalAssignments } = await supabase
          .from('task_assignments')
          .select('user_id, actual_hours')
          .eq('task_id', editingTask.id);

        // Calculate totals - prioritize form inputs over task assignments
        const formEstimatedHours = parseFloat(editTaskForm.estimatedHours) || 0;
        const formActualHours = parseFloat(editTaskForm.completedHours) || 0;
        
        // Use form values if entered, otherwise fall back to task assignments totals
        const totalEstimatedHours = formEstimatedHours > 0 ? formEstimatedHours : taskAssignments.reduce((sum, assignment) => sum + assignment.estimated_hours, 0);
        const totalActualHours = formActualHours > 0 ? formActualHours : taskAssignments.reduce((sum, assignment) => sum + assignment.actual_hours, 0);

        console.log('About to update task with data:', {
          title: editTaskForm.title,
          description: editTaskForm.description,
          workstream: editTaskForm.workstream,
          status: denormalizeTaskStatus(editTaskForm.status as Task['status']),
          due_date: editTaskForm.dueDate,
          commencement_date: editTaskForm.commencementDate,
          estimated_total_hours: totalEstimatedHours,
          actual_hours: totalActualHours,
          taskAssignments: taskAssignments
        });

        // Update task record
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            title: editTaskForm.title,
            description: editTaskForm.description,
            workstream: editTaskForm.workstream || null,
            phase: editTaskForm.phase || null,
            priority: editTaskForm.priority || 'medium',
            assigned_to: taskAssignments.length > 0 ? taskAssignments[0].user_id : null, // Keep compatibility with single assignment
            status: denormalizeTaskStatus(editTaskForm.status as Task['status']),
            due_date: editTaskForm.dueDate || null,
            commencement_date: editTaskForm.commencementDate || null,
            estimated_total_hours: totalEstimatedHours,
            actual_hours: totalActualHours,
          })
          .eq('id', editingTask.id);

        if (updateError) {
          console.error('❌ Task update error:', updateError);
          throw updateError;
        }
        console.log('✅ Task updated successfully');

        // Refresh workstreams and phases list to include any new values
        if (editTaskForm.workstream && !allWorkstreams.includes(editTaskForm.workstream)) {
          setAllWorkstreams(prev => [...prev, editTaskForm.workstream].sort());
        }
        if (editTaskForm.phase && !allPhases.includes(editTaskForm.phase)) {
          setAllPhases(prev => [...prev, editTaskForm.phase].sort());
        }

        // Create time entries for actual hours changes
        console.log('🕐 Creating time entries for hours changes...');
        const timeEntriesToCreate = [];
        
        for (const assignment of taskAssignments) {
          if (assignment.user_id && assignment.actual_hours > 0) {
            const originalAssignment = originalAssignments?.find(orig => orig.user_id === assignment.user_id);
            const originalHours = originalAssignment?.actual_hours || 0;
            const hoursDifference = assignment.actual_hours - originalHours;
            const userProfile = profiles.find(p => p.id === assignment.user_id);
            const userRate = userProfile?.hourly_rate || 850;
            
            if (hoursDifference !== 0) {
              const description = hoursDifference > 0 
                ? `Task hours increased: +${hoursDifference} hours` 
                : `Task hours decreased: ${hoursDifference} hours`;
                
              timeEntriesToCreate.push({
                matter_id: matterId,
                task_id: editingTask.id,
                user_id: assignment.user_id,
                hours: hoursDifference, // Keep the sign for positive/negative
                description: description,
                date: new Date().toISOString().split('T')[0],
                billable: true,
                hourly_rate: userRate,
                source: 'task_edit'
              });
            }
          }
        }

        if (timeEntriesToCreate.length > 0) {
          console.log('Creating time entries:', timeEntriesToCreate);
          const { error: timeEntryError } = await supabase
            .from('time_entries')
            .insert(timeEntriesToCreate);

          if (timeEntryError) {
            console.error('❌ Error creating time entries:', timeEntryError);
            // Don't throw here, just log the error as the main task update succeeded
          } else {
            console.log('✅ Time entries created successfully');
          }
        }

        // Delete existing task assignments
        console.log('🗑️ About to delete existing assignments for task:', editingTask.id);
        const { error: deleteError } = await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', editingTask.id);

        if (deleteError) {
          console.error('❌ Error deleting existing assignments:', deleteError);
        } else {
          console.log('✅ Deleted existing assignments');
        }

        // Insert new task assignments
        if (taskAssignments.length > 0) {
          const assignmentsToInsert = taskAssignments
            .filter(a => a.user_id)
            .map(a => ({
              task_id: editingTask.id,
              user_id: a.user_id,
              estimated_hours: Number(a.estimated_hours) || 0,
              actual_hours: Number(a.actual_hours) || 0,
            }));

          console.log('➕ About to insert assignments:', assignmentsToInsert);

          const { error: insertError } = await supabase
            .from('task_assignments')
            .insert(assignmentsToInsert);

          if (insertError) {
            console.error('❌ Error inserting assignments:', insertError);
          } else {
            console.log('✅ Inserted new assignments successfully');
          }
        }

        console.log('Task updated successfully');

        // Link existing document if selected
        if (!documentUploadMode && documentId) {
          await supabase
            .from('documents')
            .update({ task_id: editingTask.id })
            .eq('id', documentId);
        }

        toast({
          title: "Task Updated",
          description: "Task details and assignments have been updated successfully.",
        });

        // Close dialog first to give immediate feedback
        setShowEditTaskDialog(false);
        setEditingTask(null);

        // Wait a moment for database triggers to complete processing
        setTimeout(async () => {
          console.log('🔄 Starting refresh after task edit...');
          
          // Also refresh the parent tasks data for consistency
          if (matterId) {
            const { data: updatedTasksData } = await supabase
              .from('tasks')
              .select(`
                *,
                assigned_user:profiles!assigned_to(full_name)
              `)
              .eq('matter_id', matterId)
              .order('order_position', { ascending: true });

            if (updatedTasksData) {
              const formattedTasks: Task[] = updatedTasksData.map((task: any) => ({
                id: task.id,
                title: task.title,
                description: task.description || '',
                workstream: task.workstream || 'Corporate',
                phase: task.phase || '',
                priority: task.priority || 'medium',
                assignedTo: task.assigned_to,
                assignedToName: task.assigned_user?.full_name || 'Unassigned',
                status: normalizeTaskStatus(task.status),
                dueDate: task.due_date || '',
                commencementDate: task.commencement_date || '',
                completedDate: task.completed_at || undefined,
                estimatedTotalHours: parseFloat(task.estimated_total_hours) || 0,
                actualHours: parseFloat(task.actual_hours) || 0,
                orderPosition: task.order_position || 0
              }));
              setTasks(formattedTasks);
              console.log('✅ Parent tasks data refreshed');
            }
          }

          // Refresh all related data
          await Promise.all([
            loadTimeEntries(),
            loadMatterDocuments()
          ]);
          
          console.log('✅ All data refresh completed');
        }, 500); // Increased delay to ensure database consistency

      } catch (error) {
        console.error('Error updating task:', error);
        toast({
          title: "Error",
          description: "Failed to update task. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleTimeEntrySubmit = async () => {
    const hours = parseFloat(timeEntryForm.hours);
    if (!timeEntryForm.taskId || !hours || hours <= 0) {
      toast({
        title: "Validation Error",
        description: "Please select a task and enter valid hours.",
        variant: "destructive"
      });
      return;
    }

    try {
      let created = null;
      
      console.log('Creating time entry...');
      
      // Insert through the Supabase client. This used to attempt the
      // unauthenticated `webhook-time-entry` edge function first; the client
      // path is now the only one, and correct — the insert runs as the
      // student, so RLS confirms they are a member of the matter, and the
      // ks.time_entries BEFORE trigger stamps performed_by with their real
      // user id (distinct from the fee-earner persona in user_id).
      {
        const { data: inserted, error: insertError } = await supabase
          .from('time_entries')
          .insert({
            matter_id: matterId,
            task_id: timeEntryForm.taskId,
            user_id: selectedProfile?.id || '550e8400-e29b-41d4-a716-446655440001',
            hours: hours,
            description: timeEntryForm.description,
            hourly_rate: selectedProfile?.chargeRate || 850.00,
            date: timeEntryForm.date,
            source: 'manual'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Direct insert error:', insertError);
          throw insertError;
        }
        
        if (inserted) {
          created = inserted;
          console.log('Time entry created:', created);
        } else {
          throw new Error('No data returned from insert');
        }
      }

      if (!created) {
        throw new Error('Failed to create time entry');
      }

      console.log('Time entry created successfully:', created);

      // Reload time entries to get updated data
      await loadTimeEntries();
      
          // Database triggers will automatically update task hours and matter totals
          // No manual update needed - triggers handle this

      // Reset form
      setTimeEntryForm({
        taskId: '',
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowTimeEntryDialog(false);

      toast({
        title: 'Success',
        description: 'Time entry recorded successfully'
      });

    } catch (error) {
      console.error('Failed to create time entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to record time entry. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const generateWIPReportExcel = async () => {
    try {
      const result = await generateWIPExcelReport(id as string);
      
      toast({
        title: "WIP Report Generated",
        description: `Excel report saved as ${result.fileName}`,
      });
    } catch (error) {
      console.error("Error generating WIP report:", error);
      toast({
        title: "Error",
        description: "Failed to generate WIP report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generatePerformanceReportDoc = async () => {
    try {
      const result = await generatePerformanceReport(id as string);
      
      toast({
        title: "Performance Report Generated",
        description: `Report saved as ${result.fileName}`,
      });
    } catch (error) {
      console.error("Error generating performance report:", error);
      toast({
        title: "Error",
        description: "Failed to generate performance report. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadMatterData = async () => {
      if (!id) return;
      
      console.log('🔍 Starting to load matter data for ID:', id);
      
      try {
        // Load matter details from database
        console.log('📡 Fetching matter data from Supabase...');
        const { data: matterData, error: matterError } = await supabase
          .from('matters')
          .select('*')
          .eq('id', id)
          .single();

        console.log('📊 Matter query result:', { data: matterData, error: matterError });

        if (matterError) {
          console.error('❌ Error loading matter:', matterError);
          toast({
            title: "Error",
            description: `Failed to load matter details: ${matterError.message}`,
            variant: "destructive"
          });
          return;
        }

        if (matterData) {
          // Fetch client name separately
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', matterData.client_id)
            .single();

          // Fetch tasks and task assignments with full details
          const { data: tasksData } = await supabase
            .from('tasks')
            .select(`
              *,
              task_assignments(
                user_id,
                estimated_hours,
                actual_hours,
                profiles(
                  full_name
                )
              )
            `)
            .eq('matter_id', id)
            .order('order_position', { ascending: true });

// Fetch task assignments with profile rates to compute estimated cost
          const { data: assignmentsData } = await supabase
            .from('task_assignments')
            .select('user_id, task_id, estimated_hours, actual_hours, profiles(hourly_rate)')
            .in('task_id', tasksData?.map(t => t.id) || []);

          // Compute total estimated cost = sum over all assignments of estimated_hours * charge rate
          const estimatedCostSum = (assignmentsData || []).reduce((sum: number, a: any) => {
            const hours = Number(a.estimated_hours) || 0;
            const rate = Number(a.profiles?.hourly_rate) || 0;
            return sum + hours * rate;
          }, 0);
          setTotalEstimatedCost(estimatedCostSum);

          // Build assignment mapping per user -> task ids
          const userTaskMap: Record<string, string[]> = {};
          (assignmentsData || []).forEach((a: any) => {
            if (!userTaskMap[a.user_id]) userTaskMap[a.user_id] = [];
            if (!userTaskMap[a.user_id].includes(a.task_id)) {
              userTaskMap[a.user_id].push(a.task_id);
            }
          });
          setAssignmentsByUser(userTaskMap);

          // Fetch all profiles that are assigned to tasks
          const uniqueUserIds = [...new Set(assignmentsData?.map(a => a.user_id) || [])];
          const { data: participantProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', uniqueUserIds);

          // Resolve lead partner name and ensure inclusion in participants
          let primaryPartnerName = 'Unassigned';
          if (matterData.lead_partner_id) {
            const { data: leadProfile } = await supabase
              .from('profiles')
              .select('id, full_name, role')
              .eq('id', matterData.lead_partner_id)
              .maybeSingle();
            primaryPartnerName = leadProfile?.full_name || 'Unassigned';
          }

          // Create participants from task assignments and include lead partner if missing
          const baseParticipants = participantProfiles?.map(profile => ({
            id: profile.id,
            name: profile.full_name || 'Unknown User',
            role: profile.role || 'staff'
          })) || [];
          const participants = (matterData.lead_partner_id && !baseParticipants.some(p => p.id === matterData.lead_partner_id))
            ? [...baseParticipants, { id: matterData.lead_partner_id, name: primaryPartnerName, role: 'partner' }]
            : baseParticipants;

          setMatter({
            id: matterData.id,
            title: matterData.title,
            client: clientData?.name || 'Unknown Client',
            description: matterData.description || '',
            status: matterData.status as 'Active' | 'Completed' | 'On Hold' | 'Cancelled',
            startDate: matterData.start_date || '',
            estimatedCompletionDate: matterData.end_date || '',
            estimatedTotalFees: Number(matterData.total_fees) || 0,
            actualTotalFees: Number(matterData.total_fees) || 0,
            primaryPartner: matterData.lead_partner_id || '',
            primaryPartnerName: primaryPartnerName,
            participants: participants
          });

          // Transform tasks data and resolve assignee names
          if (tasksData) {
            const transformedTasks: Task[] = tasksData.map((task: any) => {
              const assigneeName = participantProfiles?.find(p => p.id === task.assigned_to)?.full_name || 'Unassigned';
              const actualHours = parseFloat(task.actual_hours) || 0;
              const estimatedTotalHours = parseFloat(task.estimated_total_hours) || 0;
              const autoStatus = getAutoStatus(actualHours, estimatedTotalHours, task.status);
              
              return {
                id: task.id,
                title: task.title,
                description: task.description || '',
                workstream: task.workstream || '',
                phase: task.phase || '',
                priority: task.priority || 'medium',
                assignedTo: task.assigned_to || '',
                assignedToName: assigneeName,
                status: autoStatus,
                dueDate: task.due_date || '',
                commencementDate: task.commencement_date || '',
                completedDate: task.completed_at || '',
                estimatedTotalHours: estimatedTotalHours,
                actualHours: actualHours,
                orderPosition: task.order_position || 1,
                task_assignments: (task.task_assignments || []).map((assignment: any) => ({
                  user_id: assignment.user_id,
                  estimated_hours: assignment.estimated_hours || 0,
                  actual_hours: assignment.actual_hours || 0,
                  profile: assignment.profiles
                }))
              };
            });
            setTasks(transformedTasks);
          }

          // Load profiles for display
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, role, hourly_rate');
          
          if (profilesData) {
            setProfiles(profilesData.map((p: any) => ({
              id: p.id,
              full_name: p.full_name || 'Unknown User',
              role: p.role || 'staff',
              hourly_rate: p.hourly_rate || 0
            })));
            
          // Set all profiles for dropdowns
          setAllProfiles(profilesData
            .filter((p: any) => p.full_name !== 'Peter Dombkins' && p.id !== '8bba6096-1be7-4cc9-bccd-98b5da79e41a')
            .map((p: any) => ({
              id: p.id,
              full_name: p.full_name || 'Unknown User',
              role: p.role || 'staff',
              hourly_rate: p.hourly_rate || 0
            })));

          // Load all workstreams and phases for the dropdown from active matters only
          const { data: workstreamsData } = await supabase
            .from('tasks')
            .select('workstream, matters!inner(status)')
            .eq('matters.status', 'active')
            .not('workstream', 'is', null)
            .neq('workstream', '');
          
          if (workstreamsData) {
            console.log('🔍 Workstreams data loaded:', workstreamsData.length, 'items');
            const uniqueWorkstreams = [...new Set(workstreamsData.map((item: any) => item.workstream).filter(Boolean))];
            console.log('🔍 Unique workstreams:', uniqueWorkstreams);
            setAllWorkstreams(uniqueWorkstreams.sort());
          }

          const { data: phasesData } = await supabase
            .from('tasks')
            .select('phase, matters!inner(status)')
            .eq('matters.status', 'active')
            .not('phase', 'is', null)
            .neq('phase', '');
          
          if (phasesData) {
            console.log('🔍 Phases data loaded:', phasesData.length, 'items');
            const uniquePhases = [...new Set(phasesData.map((item: any) => item.phase).filter(Boolean))];
            console.log('🔍 Unique phases:', uniquePhases);
            setAllPhases(uniquePhases.sort());
          }
          }
        }

        // Load additional data
        await Promise.all([
          loadTimeEntries(),
          loadMatterDocuments()
        ]);

      } catch (error) {
        console.error('Error loading matter data:', error);
        toast({
          title: "Error",
          description: "Failed to load matter data. Please try again.",
          variant: "destructive"
        });
      }
    };

    // Debounced subscription handler to batch rapid changes
    const SUBSCRIPTION_DEBOUNCE_DELAY = 300;
    let subscriptionDebounceTimer: NodeJS.Timeout | null = null;
    let pendingRefresh = false;

    const debouncedRefresh = () => {
      if (pendingRefresh) return;
      pendingRefresh = true;
      
      if (subscriptionDebounceTimer) {
        clearTimeout(subscriptionDebounceTimer);
      }
      
      subscriptionDebounceTimer = setTimeout(() => {
        loadMatterData();
        pendingRefresh = false;
      }, SUBSCRIPTION_DEBOUNCE_DELAY);
    };

    // Setup real-time subscriptions with debounced callbacks
    const setupRealtimeSubscriptions = () => {
      if (!id) return [];

      // Combine all subscriptions into fewer channels with debounced handlers
      const channel = supabase
        .channel(`matter-${id}-changes`)
        .on('postgres_changes', 
          { event: '*', schema: 'ks', table: 'tasks', filter: `matter_id=eq.${id}` },
          (payload) => {
            console.log('Task changed:', payload);
            debouncedRefresh();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'ks', table: 'task_assignments' },
          (payload) => {
            console.log('Assignment changed:', payload);
            debouncedRefresh();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'ks', table: 'time_entries', filter: `matter_id=eq.${id}` },
          (payload) => {
            console.log('Time entry changed:', payload);
            // For time entries, also reload time entries specifically
            loadTimeEntries();
            debouncedRefresh();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'ks', table: 'matters', filter: `id=eq.${id}` },
          (payload) => {
            console.log('Matter changed:', payload);
            debouncedRefresh();
          }
        )
        .subscribe();

      return [channel];
    };

    loadMatterData();
    const channels = setupRealtimeSubscriptions();

    // Cleanup function
    return () => {
      if (subscriptionDebounceTimer) {
        clearTimeout(subscriptionDebounceTimer);
      }
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [id]);

  // Get mock completion percentage
  const getMockCompletionPercentage = (title: string) => {
    if (title.includes('Early case assessment')) return 100;
    if (title.includes('Due diligence')) return 75;
    if (title.includes('Red flag')) return 10;
    if (title.includes('SPA')) return 18;
    if (title.includes('supplier')) return 22;
    if (title.includes('TSA')) return 15;
    return 0;
  };

  // Initialize edit form when matter is loaded
  useEffect(() => {
    if (matter) {
      setEditMatterForm({
        title: matter.title,
        client: matter.client,
        description: matter.description,
        status: matter.status,
        startDate: matter.startDate,
        estimatedCompletionDate: matter.estimatedCompletionDate,
        primaryPartner: matter.primaryPartner,
        feeType: matter.fee_type || 'hourly_rates',
        fixedFee: matter.fixed_fee?.toString() || ''
      });
    }
  }, [matter]);

  // Handle URL parameters for tab selection and task editing
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const editTaskParam = searchParams.get('editTask');
    
    // Set active tab from URL parameter
    if (tabParam && ['tasks', 'gantt', 'documents', 'time'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    
    // Open edit task dialog if editTask parameter is present
    if (editTaskParam && tasks.length > 0) {
      const taskToEdit = tasks.find(task => task.id === editTaskParam);
      if (taskToEdit) {
        handleEditTask(taskToEdit);
      }
    }
  }, [searchParams, tasks]);

  const getAssignedName = (assignedId: string) => {
    if (!matter) return 'Unknown';
    const participant = matter.participants.find(p => p.id === assignedId);
    return participant?.name || 'Unknown';
  };

  const handleEditMatterSubmit = async () => {
    if (!matter || !id) return;
    
    try {
      // Update matter in database with proper status mapping
      const { error: updateError } = await supabase
        .from('matters')
        .update({
          title: editMatterForm.title,
          description: editMatterForm.description,
          status: denormalizeMatterStatus(editMatterForm.status as Matter['status']),
          start_date: editMatterForm.startDate || null,
          end_date: editMatterForm.estimatedCompletionDate || null,
          fee_type: editMatterForm.feeType,
          fixed_fee: editMatterForm.feeType === 'fixed_fee' ? parseFloat(editMatterForm.fixedFee) || null : null,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Matter update error:', updateError);
        throw updateError;
      }

      // Update local state
      setMatter(prev => prev ? {
        ...prev,
        title: editMatterForm.title,
        description: editMatterForm.description,
        status: editMatterForm.status as Matter['status'],
        startDate: editMatterForm.startDate,
        estimatedCompletionDate: editMatterForm.estimatedCompletionDate,
      } : null);
      
      setShowEditMatterDialog(false);
      
      toast({
        title: "Matter Updated",
        description: "Matter details have been updated successfully.",
      });

    } catch (error) {
      console.error('Error updating matter:', error);
      toast({
        title: "Error",
        description: "Failed to update matter. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add task creation handler with persistence
  const handleNewTaskSubmit = async () => {
    if (!newTaskForm.title) {
      toast({
        title: "Validation Error",
        description: "Task title is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert({
          matter_id: id,
          title: newTaskForm.title,
          description: newTaskForm.description,
          workstream: newTaskForm.workstream || 'Corporate',
          phase: newTaskForm.phase || null,
          priority: newTaskForm.priority || 'medium',
          assigned_to: newTaskForm.assignedTo || null,
          status: 'open', // Default open
          estimated_total_hours: parseFloat(newTaskForm.estimatedHours) || 0,
          commencement_date: new Date().toISOString().split('T')[0],
        })
        .select(`
          *,
          assigned_user:profiles!assigned_to(full_name)
        `)
        .single();

      if (insertError) {
        console.error('Task creation error:', insertError);
        throw insertError;
      }

        // Load profiles for hourly rates
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, hourly_rate');

        if (profilesError) {
          console.error("Profiles fetch error:", profilesError);
        } else {
          setProfiles(profilesData || []);
        }
      const formattedTask: Task = {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description || '',
        workstream: newTask.workstream || 'Corporate',
        phase: newTask.phase || '',
        priority: newTask.priority || 'medium',
        assignedTo: newTask.assigned_to,
        assignedToName: newTask.assigned_user?.full_name || 'Unassigned',
        status: normalizeTaskStatus(newTask.status),
        dueDate: newTask.due_date || '',
        commencementDate: newTask.commencement_date || '',
        completedDate: newTask.completed_at || undefined,
        estimatedTotalHours: parseFloat(newTaskForm.estimatedHours) || 0,
        actualHours: Number(newTask.actual_hours) || 0,
        orderPosition: newTask.order_position || 1
      };

      setTasks(prev => [...prev, formattedTask].sort((a, b) => a.orderPosition - b.orderPosition));
      setShowTaskDialog(false);
      setNewTaskForm({
        title: '',
        description: '',
        workstream: '',
        phase: '',
        priority: '',
        assignedTo: '',
        estimatedHours: '',
      });

      toast({
        title: "Task Created",
        description: "New task has been created successfully.",
      });

    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    }
  };
    if (!matter) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading matter details...</p>
          </div>
        </div>
      );
    }

  const activeTasks = tasks.filter(t => t.status === 'Open' || t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalFees = timeEntries.reduce((sum, entry) => sum + entry.totalFee, 0);
  
// totalEstimatedCost is computed from task assignments (see loadMatterData)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-40">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif text-foreground">{matter.title}</h1>
              <p className="text-sm text-muted-foreground">Client: {matter.client}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Rose, embedded — the AI tools a lawyer would reach for while
                working this matter, without leaving it. */}
            <RosePanelButton matterId={matter?.id} matterTitle={matter?.title} />
            <Button variant="outline" size="sm" onClick={generateWIPReportExcel}>
              <Download className="w-4 h-4 mr-2" />
              WIP Report
            </Button>
            <Button variant="outline" size="sm" onClick={generatePerformanceReportDoc}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEditMatterDialog(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Matter
            </Button>

            {/* Edit Matter Dialog */}
            <Dialog open={showEditMatterDialog} onOpenChange={setShowEditMatterDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Matter Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Matter Title</Label>
                      <Input 
                        value={editMatterForm.title}
                        onChange={(e) => setEditMatterForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Input 
                        value={editMatterForm.client}
                        onChange={(e) => setEditMatterForm(prev => ({ ...prev, client: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Describe the matter..."
                      rows={3}
                      value={editMatterForm.description}
                      onChange={(e) => setEditMatterForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={editMatterForm.status} onValueChange={(value) => setEditMatterForm(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Partner</Label>
                      <Select value={editMatterForm.primaryPartner} onValueChange={(value) => setEditMatterForm(prev => ({ ...prev, primaryPartner: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary partner" />
                        </SelectTrigger>
                        <SelectContent>
                          {matter?.participants.filter(p => p.role.toLowerCase().includes('partner')).map(partner => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={editMatterForm.startDate}
                        onChange={(e) => setEditMatterForm(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedCompletionDate">Estimated Completion Date</Label>
                      <Input
                        id="estimatedCompletionDate"
                        type="date"
                        value={editMatterForm.estimatedCompletionDate}
                        onChange={(e) => setEditMatterForm(prev => ({
                          ...prev,
                          estimatedCompletionDate: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                  
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Fee Type</Label>
                       <Select value={editMatterForm.feeType} onValueChange={(value) => setEditMatterForm(prev => ({ ...prev, feeType: value, fixedFee: value === 'hourly_rates' ? '' : prev.fixedFee }))}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select fee type" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="hourly_rates">Hourly Rates</SelectItem>
                           <SelectItem value="fixed_fee">Fixed Fee</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     {editMatterForm.feeType === 'fixed_fee' && (
                       <div className="space-y-2">
                         <Label>Fixed Fee ($)</Label>
                         <Input 
                           type="number"
                           placeholder="0"
                           value={editMatterForm.fixedFee}
                           onChange={(e) => setEditMatterForm(prev => ({ ...prev, fixedFee: e.target.value }))}
                         />
                       </div>
                      )}
                   </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowEditMatterDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditMatterSubmit}>
                      Update Matter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Matter Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-gold/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">{completedTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-gold/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-gold" />
                </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Actual Fees</p>
                   <p className="text-2xl font-bold text-foreground">${totalFees.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold text-foreground">{matter.participants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-gold/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Estimated Fees</p>
                  <p className="text-2xl font-bold text-foreground">${totalEstimatedCost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tasks">Tasks & Progress</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="time">Time & Billing</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-serif">Tasks & Progress</h2>
              <Button onClick={() => setShowTaskDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {/* Tasks Table */}
            <Card>
              <CardContent className="p-0">
                <GroupedTasksTable 
                  tasks={tasks}
                  onEditTask={(task) => {
                    const originalTask = tasks.find(t => t.id === task.id);
                    if (originalTask) handleEditTask(originalTask);
                  }}
                />
              </CardContent>
            </Card>

            {/* Edit Task Dialog */}
            <Dialog open={showEditTaskDialog} onOpenChange={setShowEditTaskDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Task Title *</Label>
                       <Input 
                         placeholder="Enter task title..." 
                         value={editTaskForm.title}
                         onChange={(e) => setEditTaskForm(prev => ({ ...prev, title: e.target.value }))}
                       />
                     </div>
                       <div className="space-y-2">
                         <Label>Workstream</Label>
                         <Popover>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               role="combobox"
                               className="w-full justify-between bg-background border-border hover:bg-background"
                             >
                               {editTaskForm.workstream || "Select or type workstream..."}
                               <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-full p-0 bg-background border border-border z-50" align="start">
                             <Command className="bg-background">
                               <CommandInput 
                                 placeholder="Search or type new workstream..." 
                                 value={editTaskForm.workstream}
                                 onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, workstream: value }))}
                                 className="border-0 focus:ring-0"
                               />
                               <CommandList className="max-h-60 overflow-auto">
                                 <CommandEmpty>
                                   <div className="p-2 text-sm text-muted-foreground">
                                     Press Enter to create "{editTaskForm.workstream}"
                                   </div>
                                 </CommandEmpty>
                                 <CommandGroup>
                                   {allWorkstreams.map((ws) => (
                                     <CommandItem
                                       key={ws}
                                       onSelect={() => setEditTaskForm(prev => ({ ...prev, workstream: ws }))}
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
                   </div>
                   
                   <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Phase</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between bg-background border-border hover:bg-background"
                              >
                                {editTaskForm.phase || "Select or type phase..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 bg-background border border-border z-50" align="start">
                              <Command className="bg-background">
                                <CommandInput 
                                  placeholder="Search or type new phase..." 
                                  value={editTaskForm.phase}
                                  onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, phase: value }))}
                                  className="border-0 focus:ring-0"
                                />
                                <CommandList className="max-h-60 overflow-auto">
                                  <CommandEmpty>
                                    <div className="p-2 text-sm text-muted-foreground">
                                      Press Enter to create "{editTaskForm.phase}"
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {allPhases.map((phase) => (
                                      <CommandItem
                                        key={phase}
                                        onSelect={() => setEditTaskForm(prev => ({ ...prev, phase: phase }))}
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
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={editTaskForm.priority} onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, priority: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={editTaskForm.status} onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Paused">Paused</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                   {/* Task Assignments Section */}
                   <div className="space-y-4">
                     <div className="space-y-2">
                       <Label className="text-sm font-medium">Resource Assignment</Label>
                       <p className="text-sm text-muted-foreground">Please select your resource first, before inputting their estimated and actual effort</p>
                     </div>
                     <TaskAssignments
                       taskId={editingTask?.id}
                       onAssignmentsChange={setTaskAssignments}
                       initialAssignments={taskAssignments}
                     />
                   </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Commencement Date</Label>
                      <Input 
                        type="date" 
                        value={editTaskForm.commencementDate}
                        onChange={(e) => setEditTaskForm(prev => ({ ...prev, commencementDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="date" 
                        value={editTaskForm.dueDate}
                        onChange={(e) => setEditTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Describe the task requirements..." 
                      rows={3}
                      value={editTaskForm.description}
                      onChange={(e) => setEditTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowEditTaskDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditTaskSubmit}>
                      Update Task
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Task Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Task Title *</Label>
                       <Input 
                         placeholder="Enter task title..." 
                         value={newTaskForm.title}
                         onChange={(e) => setNewTaskForm(prev => ({ ...prev, title: e.target.value }))}
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Workstream</Label>
                       <Select value={newTaskForm.workstream} onValueChange={(value) => setNewTaskForm(prev => ({ ...prev, workstream: value }))}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select workstream" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Corporate">Corporate</SelectItem>
                           <SelectItem value="Commercial">Commercial</SelectItem>
                           <SelectItem value="Employment">Employment</SelectItem>
                           <SelectItem value="Data">Data</SelectItem>
                           <SelectItem value="Real Estate">Real Estate</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>Phase</Label>
                       <Select value={newTaskForm.phase} onValueChange={(value) => setNewTaskForm(prev => ({ ...prev, phase: value }))}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select phase" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Phase 1">Phase 1</SelectItem>
                           <SelectItem value="Phase 2">Phase 2</SelectItem>
                           <SelectItem value="Phase 3">Phase 3</SelectItem>
                           <SelectItem value="Phase 4">Phase 4</SelectItem>
                           <SelectItem value="Due Diligence">Due Diligence</SelectItem>
                           <SelectItem value="Documentation">Documentation</SelectItem>
                           <SelectItem value="Completion">Completion</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Priority</Label>
                       <Select value={newTaskForm.priority} onValueChange={(value) => setNewTaskForm(prev => ({ ...prev, priority: value }))}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select priority" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="low">Low</SelectItem>
                           <SelectItem value="medium">Medium</SelectItem>
                           <SelectItem value="high">High</SelectItem>
                           <SelectItem value="urgent">Urgent</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Assigned To</Label>
                       <Select value={newTaskForm.assignedTo} onValueChange={(value) => setNewTaskForm(prev => ({ ...prev, assignedTo: value }))}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select team member" />
                         </SelectTrigger>
                         <SelectContent>
                           {allProfiles.map(profile => (
                             <SelectItem key={profile.id} value={profile.id}>
                               {profile.full_name} ({profile.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Staff'}) - ${profile.hourly_rate || 0}/hr
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Estimated Hours</Label>
                       <Input 
                         type="number" 
                         step="0.25" 
                         placeholder="0" 
                         value={newTaskForm.estimatedHours}
                         onChange={(e) => setNewTaskForm(prev => ({ ...prev, estimatedHours: e.target.value }))}
                       />
                     </div>
                   </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Describe the task requirements..." 
                      rows={3}
                      value={newTaskForm.description}
                      onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleNewTaskSubmit}>
                      Create Task
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-serif">Team Members</h2>
            </div>

            <div className="grid gap-6">
              {/* Lead Partner Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary-burgundy" />
                    Lead Partner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {matter && (
                    <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                      <div className="w-12 h-12 bg-primary-burgundy rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {matter.primaryPartnerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{matter.primaryPartnerName}</h3>
                        <p className="text-sm text-muted-foreground">Lead Partner</p>
                        <Badge variant="outline" className="mt-1">Primary Contact</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Team Members Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-primary-burgundy" />
                    Assigned Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matter?.participants && matter.participants.length > 0 ? (
                      matter.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-semibold">
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{participant.name}</h4>
                            <p className="text-sm text-muted-foreground">{participant.role}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {(assignmentsByUser[participant.id]?.length || 0)} task(s) assigned
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No team members assigned to tasks yet.</p>
                        <p className="text-sm">Create tasks and assign them to team members to see them here.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Task Assignment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-primary-burgundy" />
                    Task Assignment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matter?.participants && matter.participants.map((participant) => {
                      const assignedTaskIds = assignmentsByUser[participant.id] || [];
                      const assignedTasks = tasks.filter(task => assignedTaskIds.includes(task.id));
                      const completedTasks = assignedTasks.filter(task => task.status === 'Completed');
                      const inProgressTasks = assignedTasks.filter(task => task.status === 'In Progress');
                      const openTasks = assignedTasks.filter(task => task.status === 'Open');
                      const pausedTasks = assignedTasks.filter(task => task.status === 'Paused');
                      const lateTasks = assignedTasks.filter(task => task.status === 'Late');
                      const cancelledTasks = assignedTasks.filter(task => task.status === 'Cancelled');
                      
                      return (
                        <div key={participant.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">{participant.name}</h4>
                            <Badge variant="secondary">{assignedTasks.length} tasks</Badge>
                          </div>
                          <div className="grid grid-cols-6 gap-2 text-sm">
                            <div className="text-center">
                              <div className="text-xl font-bold text-green-600">{completedTasks.length}</div>
                              <div className="text-muted-foreground text-xs">Completed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-blue-600">{inProgressTasks.length}</div>
                              <div className="text-muted-foreground text-xs">In Progress</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-orange-600">{openTasks.length}</div>
                              <div className="text-muted-foreground text-xs">Open</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-yellow-600">{pausedTasks.length}</div>
                              <div className="text-muted-foreground text-xs">Paused</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-red-600">{lateTasks.length}</div>
                              <div className="text-muted-foreground text-xs">Late</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-gray-600">{cancelledTasks.length}</div>
                              <div className="text-muted-foreground text-xs">Cancelled</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gantt Chart Tab */}
          <TabsContent value="gantt" className="space-y-6">
            <GanttChart 
              tasks={tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                workstream: task.workstream,
                status: denormalizeTaskStatus(task.status),
                assigned_to: task.assignedTo,
                commencement_date: task.commencementDate,
                due_date: task.dueDate,
                estimated_total_hours: task.estimatedTotalHours,
                actual_hours: task.actualHours,
                order_position: task.orderPosition,
                phase: task.workstream,
                priority: 'medium',
                task_assignments: (task.task_assignments || []).map(assignment => ({
                  user_id: assignment.user_id,
                  profiles: assignment.profile ? { full_name: assignment.profile.full_name } : null
                }))
              }))}
              profiles={profiles}
              matterTitle={matter.title}
              matterId={matterId!}
              onDataUpdated={() => {
                // Refresh data after Gantt import
                console.log('🔄 Refreshing data after Gantt import...');
                
                toast({
                  title: "Import Processing",
                  description: "Gantt chart import completed. Refreshing data...",
                });
                
                // Use setTimeout to allow database operations to complete, then reload
                setTimeout(() => {
                  window.location.reload();
                }, 2000); // 2 second delay
              }}
            />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-serif">Documents</h2>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="premium-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 truncate">{doc.title}</h3>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{doc.description}</p>
                          <div className="flex flex-col space-y-1 text-xs text-muted-foreground">
                            <span>Size: {(doc.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                            <span>Type: {doc.fileType}</span>
                            <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Title</Label>
                    <Input 
                      placeholder="Enter document title..." 
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Describe the document..." 
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input 
                      type="file" 
                      onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                      Cancel
                    </Button>
                    <Button>
                      Upload
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Time & Billing Tab */}
          <TabsContent value="time" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold font-serif">Time & Billing</h2>
              <Button onClick={() => setShowTimeEntryDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            </div>

            {/* Time Entries Table */}
            <Card>
              <CardHeader>
                <CardTitle>Time Entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {timeEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No time entries recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="p-4 font-medium text-sm text-muted-foreground">Date/Time</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Resource</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Charge Rate</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Hours Change</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Fee Impact</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Task</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeEntries.map((entry, index) => (
                          <tr key={entry.id} className={index % 2 === 0 ? 'bg-muted/20' : 'bg-background'}>
                            <td className="p-4">
                              <div className="text-sm">
                                <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(entry.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                <div className="font-medium">{entry.userName}</div>
                                <div className="text-xs text-muted-foreground">{entry.userRole}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-mono font-medium">
                                ${entry.rate}/hr
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={entry.hours >= 0 ? "default" : "destructive"}
                                className="font-mono"
                              >
                                {entry.hours >= 0 ? '+' : ''}{entry.hours}h
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span 
                                className={`font-medium font-mono ${
                                  entry.totalFee >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {entry.totalFee >= 0 ? '+$' : '-$'}{Math.abs(entry.totalFee).toLocaleString()}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-medium">{entry.taskTitle || 'General Time'}</div>
                            </td>
                            <td className="p-4 max-w-xs">
                              <div className="text-sm text-muted-foreground truncate" title={entry.description}>
                                {entry.description}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="bg-muted px-2 py-1 rounded text-xs">
                                  {entry.source}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Entry Dialog */}
            <Dialog open={showTimeEntryDialog} onOpenChange={setShowTimeEntryDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Task</Label>
                    <Select value={timeEntryForm.taskId} onValueChange={(value) => setTimeEntryForm({...timeEntryForm, taskId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.filter(t => t.status !== 'Completed').map(task => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hours</Label>
                      <Input 
                        type="number" 
                        step="0.25" 
                        placeholder="0.00" 
                        value={timeEntryForm.hours}
                        onChange={(e) => setTimeEntryForm({...timeEntryForm, hours: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={timeEntryForm.date}
                        onChange={(e) => setTimeEntryForm({...timeEntryForm, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Describe the work performed..." 
                      value={timeEntryForm.description}
                      onChange={(e) => setTimeEntryForm({...timeEntryForm, description: e.target.value})}
                    />
                  </div>
                  <Button 
                    className="w-full elegant-button"
                    onClick={handleTimeEntrySubmit}
                    disabled={!timeEntryForm.taskId || !timeEntryForm.hours || !timeEntryForm.date || !timeEntryForm.description}
                  >
                    Record Time Entry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
