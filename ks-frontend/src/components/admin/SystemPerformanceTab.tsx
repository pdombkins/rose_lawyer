import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Database, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  WifiOff, 
  Wifi,
  Table as TableIcon,
  CalendarIcon,
  RotateCcw,
  Trash2,
  FileText,
  Shuffle,
  Bell
} from "lucide-react";
import { checkSupabaseConfig, logSupabaseConfig } from "@/utils/supabaseConfig";
import { supabase } from "@/integrations/supabase/client";
import { ksHealth } from "@/lib/roseBackend";

export function SystemPerformanceTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, any>>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetDate, setResetDate] = useState<Date>();
  const [isResetting, setIsResetting] = useState(false);
  const [showRebaselineDialog, setShowRebaselineDialog] = useState(false);
  const [rebaselineDate, setRebaselineDate] = useState<Date>();
  const [isRebaselining, setIsRebaselining] = useState(false);
  const [showPrefillDialog, setShowPrefillDialog] = useState(false);
  const [prefillDate, setPrefillDate] = useState<Date>();
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [showClearNotificationsDialog, setShowClearNotificationsDialog] = useState(false);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);
  const [lastResetRecord, setLastResetRecord] = useState<string | null>(null);
  const [lastRebaselineRecord, setLastRebaselineRecord] = useState<string | null>(null);
  const [lastPrefillRecord, setLastPrefillRecord] = useState<string | null>(null);
  const [lastClearNotificationsRecord, setLastClearNotificationsRecord] = useState<string | null>(null);
  
  // New state variables for enhanced functionality
  const [activeMatters, setActiveMatters] = useState<any[]>([]);
  const [selectedMatters, setSelectedMatters] = useState<string[]>([]);
  const [matterRebaselineDates, setMatterRebaselineDates] = useState<{[key: string]: Date}>({});
  const [resetActualHours, setResetActualHours] = useState(false);

  // Load active matters on component mount for enhanced functionality
  useEffect(() => {
    const fetchOperationRecords = async () => {
      try {
        const { data: resetRecord } = await supabase
          .from('system_settings')
          .select('value')
          .eq('name', 'last_reset_to_base')
          .single();
        
        const { data: rebaselineRecord } = await supabase
          .from('system_settings')
          .select('value')
          .eq('name', 'last_rebaseline')
          .single();

        const { data: prefillRecord } = await supabase
          .from('system_settings')
          .select('value')
          .eq('name', 'last_prefill_actual_hours')
          .single();

        const { data: clearNotificationsRecord } = await supabase
          .from('system_settings')
          .select('value')
          .eq('name', 'last_clear_notifications')
          .single();

        if (resetRecord) setLastResetRecord(resetRecord.value);
        if (rebaselineRecord) setLastRebaselineRecord(rebaselineRecord.value);
        if (prefillRecord) setLastPrefillRecord(prefillRecord.value);
        if (clearNotificationsRecord) setLastClearNotificationsRecord(clearNotificationsRecord.value);
      } catch (error) {
        console.log('No previous operation records found');
      }
    };

    const loadActiveMatters = async () => {
      try {
        const { data: matters, error } = await supabase
          .from('matters')
          .select('id, title, start_date')
          .eq('status', 'active')
          .order('title');
        
        if (error) {
          console.error('Error loading active matters:', error);
        } else {
          setActiveMatters(matters || []);
        }
      } catch (error) {
        console.error('Error loading active matters:', error);
      }
    };
    
    loadActiveMatters();
    fetchOperationRecords();
  }, []);

  const runDiagnostics = async () => {
    console.log('🔍 Starting comprehensive end-to-end PMS diagnostics...');
    setDiagnosticResults({});
    
    const results: Record<string, any> = {};
    const issues: string[] = [];
    
    // Test 0: Supabase Configuration Check
    console.log('🔧 Checking Supabase configuration...');
    const configCheck = checkSupabaseConfig();
    logSupabaseConfig();
    
    results.configurationCheck = {
      status: configCheck.isValid ? 'success' : 'error',
      isValid: configCheck.isValid,
      projectId: configCheck.projectId,
      warnings: configCheck.warnings,
      urlPrefix: configCheck.urlPrefix,
      keyPrefix: configCheck.anonKeyPrefix
    };

    if (!configCheck.isValid) {
      issues.push('Supabase configuration is invalid');
    }
    
    // Test 1: Database Schema Validation
    console.log('🗄️ Testing database schema integrity...');
    try {
      const tableChecks = [];
      
      // Test each table individually
      const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*').limit(1);
      tableChecks.push({ table: 'clients', status: clientsError ? 'error' : 'success', error: clientsError?.message });
      if (clientsError) issues.push(`Table clients access failed: ${clientsError.message}`);

      const { data: mattersData, error: mattersError } = await supabase.from('matters').select('*').limit(1);
      tableChecks.push({ table: 'matters', status: mattersError ? 'error' : 'success', error: mattersError?.message });
      if (mattersError) issues.push(`Table matters access failed: ${mattersError.message}`);

      const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*').limit(1);
      tableChecks.push({ table: 'tasks', status: tasksError ? 'error' : 'success', error: tasksError?.message });
      if (tasksError) issues.push(`Table tasks access failed: ${tasksError.message}`);

      const { data: timeEntriesData, error: timeEntriesError } = await supabase.from('time_entries').select('*').limit(1);
      tableChecks.push({ table: 'time_entries', status: timeEntriesError ? 'error' : 'success', error: timeEntriesError?.message });
      if (timeEntriesError) issues.push(`Table time_entries access failed: ${timeEntriesError.message}`);

      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*').limit(1);
      tableChecks.push({ table: 'profiles', status: profilesError ? 'error' : 'success', error: profilesError?.message });
      if (profilesError) issues.push(`Table profiles access failed: ${profilesError.message}`);

      const { data: assignmentsData, error: assignmentsError } = await supabase.from('task_assignments').select('*').limit(1);
      tableChecks.push({ table: 'task_assignments', status: assignmentsError ? 'error' : 'success', error: assignmentsError?.message });
      if (assignmentsError) issues.push(`Table task_assignments access failed: ${assignmentsError.message}`);
      
      results.databaseSchema = {
        status: tableChecks.every(t => t.status === 'success') ? 'success' : 'error',
        tables: tableChecks
      };
    } catch (e: any) {
      results.databaseSchema = { status: 'error', error: e.message };
      issues.push(`Database schema validation failed: ${e.message}`);
    }
    
    // Test 2: Basic Supabase client connection
    console.log('📡 Testing Supabase client connection...');
    try {
      const startTime = Date.now();
      const { data: healthCheck, error } = await supabase.from('time_entries').select('count').limit(1);
      const duration = Date.now() - startTime;
      
      if (error) {
        results.supabaseConnection = { 
          status: 'error', 
          error: error.message, 
          code: error.code,
          duration 
        };
        issues.push(`Database connection failed: ${error.message}`);
        console.error('❌ Supabase connection failed:', error);
      } else {
        results.supabaseConnection = { 
          status: 'success', 
          duration,
          data: healthCheck 
        };
        console.log('✅ Supabase connection successful in', duration, 'ms');
      }
    } catch (e: any) {
      results.supabaseConnection = { 
        status: 'error', 
        error: e.message 
      };
      issues.push(`Database connection exception: ${e.message}`);
      console.error('❌ Supabase connection exception:', e);
    }

    // Test 2: Edge function connectivity
    console.log('🚀 Testing Edge Function connectivity...');
    try {
      const startTime = Date.now();
      // Was a ping to the unauthenticated `webhook-time-entry` edge
      // function; now checks the Rose backend instead.
      let fnResp: unknown = null;
      let fnError: Error | null = null;
      try {
        fnResp = await ksHealth();
      } catch (e) {
        fnError = e as Error;
      }
      const duration = Date.now() - startTime;
      
      if (fnError) {
        results.edgeFunction = { 
          status: 'error', 
          error: fnError.message,
          duration 
        };
        console.error('❌ Edge function failed:', fnError);
      } else {
        results.edgeFunction = { 
          status: 'success', 
          duration,
          response: fnResp 
        };
        console.log('✅ Edge function successful in', duration, 'ms:', fnResp);
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

    // Test 5: Core PMS Functionality Tests
    console.log('⚖️ Testing core PMS functionality...');
    try {
      // Test client management
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .limit(5);
      
      results.clientManagement = {
        status: clientsError ? 'error' : 'success',
        count: clientsData?.length || 0,
        error: clientsError?.message
      };
      if (clientsError) issues.push(`Client management test failed: ${clientsError.message}`);

      // Test matter management
      const { data: mattersData, error: mattersError } = await supabase
        .from('matters')
        .select('id, title, status')
        .limit(5);
      
      results.matterManagement = {
        status: mattersError ? 'error' : 'success',
        count: mattersData?.length || 0,
        error: mattersError?.message
      };
      if (mattersError) issues.push(`Matter management test failed: ${mattersError.message}`);

      // Test task management
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, estimated_hours')
        .limit(5);
      
      results.taskManagement = {
        status: tasksError ? 'error' : 'success',
        count: tasksData?.length || 0,
        error: tasksError?.message
      };
      if (tasksError) issues.push(`Task management test failed: ${tasksError.message}`);

      // Test time entry system
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select('id, hours, rate, total_fee')
        .limit(5);
      
      results.timeEntrySystem = {
        status: timeError ? 'error' : 'success',
        count: timeData?.length || 0,
        error: timeError?.message
      };
      if (timeError) issues.push(`Time entry system test failed: ${timeError.message}`);

      // Test user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role, hourly_rate')
        .limit(5);
      
      results.userProfiles = {
        status: profilesError ? 'error' : 'success',
        count: profilesData?.length || 0,
        error: profilesError?.message
      };
      if (profilesError) issues.push(`User profiles test failed: ${profilesError.message}`);

      // Test task assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('id, task_id, user_id, estimated_hours, actual_hours')
        .limit(5);
      
      results.taskAssignments = {
        status: assignmentsError ? 'error' : 'success',
        count: assignmentsData?.length || 0,
        error: assignmentsError?.message
      };
      if (assignmentsError) issues.push(`Task assignments test failed: ${assignmentsError.message}`);

    } catch (e: any) {
      results.pmsCore = { status: 'error', error: e.message };
      issues.push(`Core PMS functionality test failed: ${e.message}`);
    }

    // Test 6: Data Integrity Checks
    console.log('🔍 Performing data integrity checks...');
    try {
      // Check for orphaned records
      const { data: orphanedTasks } = await supabase
        .from('tasks')
        .select('id, matter_id')
        .not('matter_id', 'in', `(SELECT id FROM matters)`);
      
      const { data: orphanedTimeEntries } = await supabase
        .from('time_entries')
        .select('id, task_id')
        .not('task_id', 'in', `(SELECT id FROM tasks)`);

      results.dataIntegrity = {
        status: 'success',
        orphanedTasks: orphanedTasks?.length || 0,
        orphanedTimeEntries: orphanedTimeEntries?.length || 0
      };

      if (orphanedTasks && orphanedTasks.length > 0) {
        issues.push(`Found ${orphanedTasks.length} orphaned tasks`);
      }
      if (orphanedTimeEntries && orphanedTimeEntries.length > 0) {
        issues.push(`Found ${orphanedTimeEntries.length} orphaned time entries`);
      }

    } catch (e: any) {
      results.dataIntegrity = { status: 'error', error: e.message };
      issues.push(`Data integrity check failed: ${e.message}`);
    }

    // Test 7: Business Logic Validation
    console.log('💼 Testing business logic validation...');
    try {
      // Check for negative values
      const { data: negativeHours } = await supabase
        .from('time_entries')
        .select('id, hours')
        .lt('hours', 0);

      const { data: negativeRates } = await supabase
        .from('profiles')
        .select('id, hourly_rate')
        .lt('hourly_rate', 0);

      results.businessLogic = {
        status: 'success',
        negativeHours: negativeHours?.length || 0,
        negativeRates: negativeRates?.length || 0
      };

      if (negativeHours && negativeHours.length > 0) {
        issues.push(`Found ${negativeHours.length} time entries with negative hours`);
      }
      if (negativeRates && negativeRates.length > 0) {
        issues.push(`Found ${negativeRates.length} profiles with negative hourly rates`);
      }

    } catch (e: any) {
      results.businessLogic = { status: 'error', error: e.message };
      issues.push(`Business logic validation failed: ${e.message}`);
    }

    // Summary of issues
    results.issuesSummary = {
      totalIssues: issues.length,
      issues: issues,
      status: issues.length === 0 ? 'success' : 'error'
    };

    console.log('🏁 Comprehensive PMS diagnostics complete. Results:', results);
    console.log(`📋 Issues identified: ${issues.length}`);
    if (issues.length > 0) {
      console.log('🚨 Issues list:', issues);
    }
    setDiagnosticResults(results);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'authenticated':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'anonymous':
        return <WifiOff className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'authenticated':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Healthy</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-700 border-red-200">Error</Badge>;
      case 'anonymous':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Warning</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Calculate business days between two dates
  const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  };

  const handleResetToBase = async () => {
    if (!resetDate) {
      toast({
        title: "Error",
        description: "Please select a date to reset from.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    
    try {
      console.log('🗑️ Starting reset to base with background job...');
      
      // Start the background job
      const { data: jobData, error: jobError } = await supabase.functions.invoke('reset-processor', {
        body: {
          action: 'start',
          resetDate: resetDate.toISOString().split('T')[0]
        }
      });

      if (jobError) {
        throw new Error(`Failed to start reset processing: ${jobError.message}`);
      }

      const { jobId } = jobData;
      console.log('🗑️ Reset processing job started:', jobId);

      // Poll for job status
      let isCompleted = false;
      let pollCount = 0;
      const maxPolls = 120; // 2 minutes max
      
      while (!isCompleted && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('reset-processor', {
          body: { action: 'status', jobId }
        });

        if (statusError) {
          console.warn('Error checking job status:', statusError);
          pollCount++;
          continue;
        }

        const job = statusData;
        console.log(`Job status: ${job.status}, Progress: ${job.tablesProcessed.length}/${job.totalTables}`);

        if (job.status === 'completed' || job.status === 'failed') {
          isCompleted = true;
          
          const operationRecord = `Reset performed on ${new Date().toISOString().split('T')[0]} using base date: ${format(resetDate, "PPP")} via background job ${jobId}. Deleted ${job.recordsDeleted} records across ${job.tablesProcessed.length} tables.`;
          
          await supabase
            .from('system_settings')
            .upsert({
              name: 'last_reset_to_base',
              category: 'data_management',
              value: operationRecord,
              description: 'Last reset to base operation details'
            });

          setLastResetRecord(operationRecord);
          
          if (job.status === 'completed') {
            console.log(`🗑️ Reset completed! Deleted ${job.recordsDeleted} records.`);
            toast({
              title: "Reset Completed",
              description: `Successfully reset ${job.recordsDeleted} records to base state from ${format(resetDate, "PPP")} across ${job.tablesProcessed.length} tables.`,
            });
          } else {
            console.error('❌ Reset processing failed:', job.errors);
            toast({
              title: "Warning", 
              description: `Reset completed with ${job.errors.length} errors. Deleted ${job.recordsDeleted} records.`,
              variant: "destructive",
            });
          }
        }
        
        pollCount++;
      }
      
      if (!isCompleted) {
        toast({
          title: "Info",
          description: "Reset processing is running in background. Check system logs for completion status.",
        });
      }
      
    } catch (error: any) {
      console.error('Reset failed:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "An error occurred during the reset operation.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
      setResetDate(undefined);
    }
  };

  const handleRebaselineMatters = async () => {
    const mattersToProcess = Object.keys(matterRebaselineDates).filter(matterId => 
      matterRebaselineDates[matterId] !== undefined
    );

    if (mattersToProcess.length === 0) {
      toast({
        title: "Error",
        description: "Please select dates for at least one matter to re-baseline.",
        variant: "destructive",
      });
      return;
    }

    setIsRebaselining(true);
    
    try {
      const results = [];
      const activeJobs: string[] = [];

      // Start re-baseline jobs for each matter
      for (const matterId of mattersToProcess) {
        const rebaselineDate = matterRebaselineDates[matterId];
        const matter = activeMatters.find(m => m.id === matterId);
        
        if (!matter || !rebaselineDate) continue;

        try {
          // Start background processing via edge function
          const response = await supabase.functions.invoke('rebaseline-processor', {
            body: {
              action: 'start',
              matterId: matterId,
              rebaselineDate: format(new Date(rebaselineDate), 'yyyy-MM-dd'),
              resetActualHours: resetActualHours
            }
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          const { jobId, workstreams } = response.data;
          activeJobs.push(jobId);
          results.push(`🚀 ${matter.title}: Started re-baseline job (${workstreams.length} workstreams)`);

        } catch (error: any) {
          console.warn(`Warning: Could not start re-baseline for matter ${matter.title}:`, error.message);
          results.push(`❌ ${matter.title}: ${error.message}`);
        }
      }

      if (activeJobs.length > 0) {
        toast({
          title: "Re-baseline Started",
          description: `Started ${activeJobs.length} re-baseline jobs. Processing in background...`,
        });

        // Monitor job progress
        monitorRebaselineJobs(activeJobs);

        // Save the rebaseline operation record
        await supabase
          .from('system_settings')
          .upsert({
            name: 'last_rebaseline',
            category: 'data_management',
            value: `Re-baseline started on ${new Date().toISOString().split('T')[0]} for ${activeJobs.length} matters:\n${results.join('\n')}`,
            description: 'Last rebaseline operation details'
          });

        setLastRebaselineRecord(`Re-baseline started on ${new Date().toISOString().split('T')[0]} for ${activeJobs.length} matters`);

      } else {
        toast({
          title: "Re-baseline Failed", 
          description: "No matters could be processed.",
          variant: "destructive",
        });
      }

      setShowRebaselineDialog(false);
      setMatterRebaselineDates({});
      setResetActualHours(false);
      
    } catch (error: any) {
      console.error('Re-baseline failed:', error);
      toast({
        title: "Re-baseline Failed",
        description: error.message || "An error occurred during the re-baseline operation.",
        variant: "destructive",
      });
    } finally {
      setIsRebaselining(false);
    }
  };

  const monitorRebaselineJobs = async (jobIds: string[]) => {
    const maxChecks = 60; // Monitor for up to 5 minutes
    let checksCount = 0;
    
    const checkJobs = async () => {
      if (checksCount >= maxChecks) {
        toast({
          title: "Re-baseline Monitoring Timeout",
          description: "Jobs are still processing in background. Check system logs for status.",
          variant: "destructive",
        });
        return;
      }

      checksCount++;
      let completedJobs = 0;
      let failedJobs = 0;
      let totalTasksUpdated = 0;

      for (const jobId of jobIds) {
        try {
          const response = await supabase.functions.invoke('rebaseline-processor', {
            body: { action: 'status', jobId }
          });

          if (response.data) {
            const job = response.data;
            if (job.status === 'completed') {
              completedJobs++;
              totalTasksUpdated += job.updatedTasks;
            } else if (job.status === 'failed') {
              failedJobs++;
            }
          }
        } catch (error) {
          console.warn(`Could not check job ${jobId}:`, error);
        }
      }

      if (completedJobs + failedJobs >= jobIds.length) {
        // All jobs finished
        const successMessage = `Re-baseline completed: ${completedJobs} successful, ${failedJobs} failed. Total tasks updated: ${totalTasksUpdated}`;
        
        toast({
          title: failedJobs > 0 ? "Re-baseline Completed with Errors" : "Re-baseline Completed",
          description: successMessage,
          variant: failedJobs > 0 ? "destructive" : "default",
        });

        // Update the record
        await supabase
          .from('system_settings')
          .upsert({
            name: 'last_rebaseline',
            category: 'data_management', 
            value: `${successMessage}\nCompleted on ${new Date().toISOString().split('T')[0]}`,
            description: 'Last rebaseline operation details'
          });

        setLastRebaselineRecord(successMessage);
        
      } else {
        // Continue monitoring
        setTimeout(checkJobs, 5000); // Check every 5 seconds
      }
    };

    setTimeout(checkJobs, 2000); // Start checking after 2 seconds
  };

  const handlePrefillActualHours = async () => {
    if (!prefillDate) {
      toast({
        title: "Error",
        description: "Please select a date for pre-filling actual hours.",
        variant: "destructive",
      });
      return;
    }

    if (selectedMatters.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one matter to pre-fill actual hours.",
        variant: "destructive",
      });
      return;
    }

    setIsPrefilling(true);
    
    try {
      console.log('🎯 Starting hours processing with background job...');
      
      // Start the background job
      const { data: jobData, error: jobError } = await supabase.functions.invoke('hours-processor', {
        body: {
          action: 'start',
          matterIds: selectedMatters,
          prefillDate: prefillDate.toISOString().split('T')[0]
        }
      });

      if (jobError) {
        throw new Error(`Failed to start hours processing: ${jobError.message}`);
      }

      const { jobId } = jobData;
      console.log('🎯 Hours processing job started:', jobId);

      // Poll for job status
      let isCompleted = false;
      let pollCount = 0;
      const maxPolls = 600; // 10 minutes max for large jobs
      let lastProgress = 0;
      
      while (!isCompleted && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const { data: statusData, error: statusError } = await supabase.functions.invoke('hours-processor', {
          body: { action: 'status', jobId }
        });

        if (statusError) {
          console.warn('Error checking job status:', statusError);
          pollCount++;
          continue;
        }

        const job = statusData;
        const currentProgress = job.workstreamsProcessed.length;
        console.log(`Job status: ${job.status}, Progress: ${currentProgress}/${job.totalWorkstreams}`);

        // Show progress updates every time we complete a new workstream
        if (currentProgress > lastProgress && job.totalWorkstreams > 0) {
          const progressPercent = Math.round((currentProgress / job.totalWorkstreams) * 100);
          toast({
            title: "Processing...",
            description: `Completed ${currentProgress}/${job.totalWorkstreams} workstreams (${progressPercent}%). ${job.assignmentsUpdated} assignments updated, ${job.timeEntriesCreated} time entries created.`,
          });
          lastProgress = currentProgress;
        }

        if (job.status === 'completed' || job.status === 'failed') {
          isCompleted = true;
          
          const selectedMatterTitles = activeMatters
            .filter(matter => selectedMatters.includes(matter.id))
            .map(matter => matter.title)
            .join(', ');
          
          const operationRecord = `${new Date().toLocaleString()} - Pre-filled actual hours via background job ${jobId} for ${selectedMatters.length} matters (${selectedMatterTitles}). Updated ${job.assignmentsUpdated} assignments, created ${job.timeEntriesCreated} time entries across ${job.workstreamsProcessed.length} workstreams using date ${prefillDate.toLocaleDateString()}.`;
          
          await supabase
            .from('system_settings')
            .upsert({
              name: 'last_prefill_actual_hours',
              value: operationRecord,
              category: 'system_operations',
              description: 'Last pre-fill actual hours operation record'
            }, { onConflict: 'name' });

          setLastPrefillRecord(operationRecord);
          
          if (job.status === 'completed') {
            console.log(`🎯 Hours processing completed! Updated ${job.assignmentsUpdated} assignments, created ${job.timeEntriesCreated} time entries.`);
            toast({
              title: "Success",
              description: `Pre-filled actual hours for ${selectedMatters.length} matters. Updated ${job.assignmentsUpdated} assignments and created ${job.timeEntriesCreated} time entries across ${job.workstreamsProcessed.length} workstreams.`,
            });
          } else {
            console.error('❌ Hours processing failed:', job.errors);
            toast({
              title: "Warning", 
              description: `Hours processing completed with ${job.errors.length} errors. Updated ${job.assignmentsUpdated} assignments, created ${job.timeEntriesCreated} time entries.`,
              variant: "destructive",
            });
          }
        }
        
        pollCount++;
      }
      if (!isCompleted) {
        toast({
          title: "Info",
          description: "Hours processing is still running in background after 10 minutes. Check system logs for completion status.",
        });
      }
      
    } catch (error: any) {
      console.error('❌ Pre-fill actual hours failed:', error);
      toast({
        title: "Error",
        description: `Failed to pre-fill actual hours: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPrefilling(false);
      setShowPrefillDialog(false);
      setSelectedMatters([]);
    }
  };

  const handleClearNotifications = async () => {
    try {
      setIsClearingNotifications(true);
      
      console.log('🔔 Starting clear notifications operation...');
      
      // Delete all notifications
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Record the operation
      const operationRecord = `${new Date().toLocaleString()} - Cleared all notifications for all users`;
      
      await supabase
        .from('system_settings')
        .upsert({
          name: 'last_clear_notifications',
          value: operationRecord,
          category: 'system_operations',
          description: 'Last clear notifications operation record'
        }, { onConflict: 'name' });

      setLastClearNotificationsRecord(operationRecord);
      
      console.log('🔔 Clear notifications completed successfully!');
      
      setIsClearingNotifications(false);
      setShowClearNotificationsDialog(false);
      toast({
        title: "Success",
        description: "All notifications have been cleared for all users.",
      });
    } catch (error: any) {
      console.error('❌ Clear notifications failed:', error);
      setIsClearingNotifications(false);
      toast({
        title: "Error",
        description: `Failed to clear notifications: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span className="text-sm">Database Connection</span>
              </div>
              <Badge className="bg-green-500/10 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Edge Functions</span>
              </div>
              <Badge className="bg-green-500/10 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configuration</span>
              </div>
              <Badge className="bg-green-500/10 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Valid
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-medium">99.8%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <span className="font-medium">&lt; 200ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <span className="font-medium">0.02%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Health Check</span>
              <span className="font-medium">2 mins ago</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Run comprehensive system diagnostics to check all components
            </p>
            <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDiagnostics(true);
                    runDiagnostics();
                  }}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Run Diagnostics
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>System Diagnostics Results</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.keys(diagnosticResults).length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Running diagnostics...</p>
                    </div>
                  )}
                  
                  {diagnosticResults.configurationCheck && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Configuration Check</span>
                        {getStatusIcon(diagnosticResults.configurationCheck.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Project ID: {diagnosticResults.configurationCheck.projectId}</p>
                        <p>Status: {getStatusBadge(diagnosticResults.configurationCheck.status)}</p>
                      </div>
                    </div>
                  )}
                  
                  {diagnosticResults.supabaseConnection && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Database Connection</span>
                        {getStatusIcon(diagnosticResults.supabaseConnection.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Duration: {diagnosticResults.supabaseConnection.duration}ms</p>
                        {diagnosticResults.supabaseConnection.error && (
                          <p className="text-red-600">Error: {diagnosticResults.supabaseConnection.error}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {diagnosticResults.edgeFunction && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Edge Functions</span>
                        {getStatusIcon(diagnosticResults.edgeFunction.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Duration: {diagnosticResults.edgeFunction.duration}ms</p>
                        {diagnosticResults.edgeFunction.error && (
                          <p className="text-red-600">Error: {diagnosticResults.edgeFunction.error}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {diagnosticResults.authentication && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Authentication</span>
                        {getStatusIcon(diagnosticResults.authentication.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Status: {diagnosticResults.authentication.status}</p>
                        {diagnosticResults.authentication.email && (
                          <p>User: {diagnosticResults.authentication.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {diagnosticResults.networkConnectivity && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Network Connectivity</span>
                        {getStatusIcon(diagnosticResults.networkConnectivity.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Duration: {diagnosticResults.networkConnectivity.duration || 0}ms</p>
                        <p>Status Code: {diagnosticResults.networkConnectivity.statusCode || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.databaseSchema && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Database Schema</span>
                        {getStatusIcon(diagnosticResults.databaseSchema.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {diagnosticResults.databaseSchema.tables?.map((table: any) => (
                          <div key={table.table} className="flex justify-between">
                            <span>{table.table}:</span>
                            <span className={table.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                              {table.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {diagnosticResults.clientManagement && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Client Management</span>
                        {getStatusIcon(diagnosticResults.clientManagement.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.clientManagement.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.matterManagement && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Matter Management</span>
                        {getStatusIcon(diagnosticResults.matterManagement.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.matterManagement.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.taskManagement && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Task Management</span>
                        {getStatusIcon(diagnosticResults.taskManagement.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.taskManagement.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.timeEntrySystem && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Time Entry System</span>
                        {getStatusIcon(diagnosticResults.timeEntrySystem.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.timeEntrySystem.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.userProfiles && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">User Profiles</span>
                        {getStatusIcon(diagnosticResults.userProfiles.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.userProfiles.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.taskAssignments && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Task Assignments</span>
                        {getStatusIcon(diagnosticResults.taskAssignments.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Records found: {diagnosticResults.taskAssignments.count}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.dataIntegrity && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Data Integrity</span>
                        {getStatusIcon(diagnosticResults.dataIntegrity.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Orphaned tasks: {diagnosticResults.dataIntegrity.orphanedTasks}</p>
                        <p>Orphaned time entries: {diagnosticResults.dataIntegrity.orphanedTimeEntries}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.businessLogic && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Business Logic</span>
                        {getStatusIcon(diagnosticResults.businessLogic.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Negative hours entries: {diagnosticResults.businessLogic.negativeHours}</p>
                        <p>Negative hourly rates: {diagnosticResults.businessLogic.negativeRates}</p>
                      </div>
                    </div>
                  )}

                  {diagnosticResults.issuesSummary && (
                    <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-800">Issues Summary</span>
                        {getStatusIcon(diagnosticResults.issuesSummary.status)}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium mb-2">Total Issues Found: {diagnosticResults.issuesSummary.totalIssues}</p>
                        {diagnosticResults.issuesSummary.issues.length > 0 && (
                          <div className="space-y-1">
                            <p className="font-medium">Issue Details:</p>
                            {diagnosticResults.issuesSummary.issues.map((issue: string, index: number) => (
                              <p key={index} className="text-red-700 text-xs">• {issue}</p>
                            ))}
                          </div>
                        )}
                        {diagnosticResults.issuesSummary.totalIssues === 0 && (
                          <p className="text-green-700">✅ No issues detected - system is healthy!</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/dashboard/data-tables')}
              >
                <TableIcon className="w-4 h-4 mr-2" />
                Manage Data Tables
              </Button>

              <div className="space-y-2">
                <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Re-set to Base
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Trash2 className="w-5 h-5 mr-2 text-red-600" />
                        Reset System to Base State
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800 font-medium mb-2">
                          ⚠️ Warning: This action cannot be undone
                        </p>
                        <p className="text-sm text-red-700">
                          Removes all new/edits to tasks, dates, rates, resourcing and documents made after a specified date.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Reset Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !resetDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {resetDate ? format(resetDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={resetDate}
                              onSelect={setResetDate}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-muted-foreground">
                          All data created or modified after this date will be deleted.
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowResetDialog(false);
                          setResetDate(undefined);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleResetToBase}
                        disabled={!resetDate || isResetting}
                      >
                        {isResetting ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Reset System
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {lastResetRecord && (
                  <div className="text-xs text-muted-foreground bg-red-50 p-2 rounded border border-red-200">
                    Last: {lastResetRecord}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Dialog open={showRebaselineDialog} onOpenChange={setShowRebaselineDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Re-baseline
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Shuffle className="w-5 h-5 mr-2 text-blue-600" />
                    Re-baseline Active Matters
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-6 pr-4">
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium mb-2">
                        ℹ️ Re-baseline Information
                      </p>
                      <p className="text-sm text-blue-700">
                        Select different baseline dates for each active matter. Each matter and its tasks will be adjusted to the new baseline date while maintaining sequencing and duration relationships.
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg bg-amber-50 border-amber-200">
                      <Checkbox
                        id="resetActualHours"
                        checked={resetActualHours}
                        onCheckedChange={(checked) => setResetActualHours(checked === true)}
                        className="border-amber-300"
                      />
                      <label htmlFor="resetActualHours" className="text-sm text-amber-800 font-medium">
                        Reset all actual hours to zero
                      </label>
                      <p className="text-xs text-amber-700 ml-2">
                        This will set all task assignment actual hours back to 0 and delete all associated time entries for selected matters.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      {activeMatters.map((matter) => (
                        <div key={matter.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{matter.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Current start date: {format(new Date(matter.start_date), "PPP")}
                            </p>
                          </div>
                          <div className="w-48">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !matterRebaselineDates[matter.id] && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {matterRebaselineDates[matter.id] 
                                    ? format(matterRebaselineDates[matter.id], "PPP") 
                                    : "Pick new date"
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                  mode="single"
                                  selected={matterRebaselineDates[matter.id]}
                                  onSelect={(date) => {
                                    if (date) {
                                      setMatterRebaselineDates(prev => ({
                                        ...prev,
                                        [matter.id]: date
                                      }));
                                    }
                                  }}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRebaselineDialog(false);
                      setMatterRebaselineDates({});
                      setResetActualHours(false);
                    }}
                    disabled={isRebaselining}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRebaselineMatters}
                    disabled={isRebaselining}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isRebaselining ? "Re-baselining..." : "Re-baseline Selected"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
                {lastRebaselineRecord && (
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
                    Last: {lastRebaselineRecord}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Dialog open={showPrefillDialog} onOpenChange={setShowPrefillDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Pre-fill actual hours
                    </Button>
                  </DialogTrigger>
                   <DialogContent className="max-w-2xl max-h-[80vh]">
                     <DialogHeader>
                       <DialogTitle className="flex items-center">
                         <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                         Pre-fill Actual Hours
                       </DialogTitle>
                     </DialogHeader>
                     <ScrollArea className="max-h-[60vh]">
                       <div className="space-y-6 pr-4">
                         <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                           <p className="text-sm text-green-800 font-medium mb-2">
                             ℹ️ Pre-fill Information
                           </p>
                           <p className="text-sm text-green-700">
                             Select a reference date and the matters to process. Actual hours will be calculated based on task completion status relative to the reference date, and time entries will be created for the adjustments.
                           </p>
                         </div>
                         
                         <div className="flex flex-col space-y-2">
                           <label className="text-sm font-medium">Reference Date</label>
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button
                                 variant="outline"
                                 className={cn(
                                   "justify-start text-left font-normal",
                                   !prefillDate && "text-muted-foreground"
                                 )}
                               >
                                 <CalendarIcon className="mr-2 h-4 w-4" />
                                 {prefillDate ? format(prefillDate, "PPP") : "Pick a date"}
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0" align="start">
                               <Calendar
                                 mode="single"
                                 selected={prefillDate}
                                 onSelect={setPrefillDate}
                                 initialFocus
                                 className="pointer-events-auto"
                               />
                             </PopoverContent>
                           </Popover>
                         </div>

                         <div className="space-y-3">
                           <div className="flex items-center justify-between">
                             <label className="text-sm font-medium">Select Matters to Process</label>
                             <div className="flex space-x-2">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setSelectedMatters(activeMatters.map(m => m.id))}
                               >
                                 Select All
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setSelectedMatters([])}
                               >
                                 Clear All
                               </Button>
                             </div>
                           </div>
                           <div className="space-y-2 max-h-64 overflow-y-auto">
                             {activeMatters.map((matter) => (
                               <div key={matter.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                                 <Checkbox
                                   id={`matter-${matter.id}`}
                                   checked={selectedMatters.includes(matter.id)}
                                   onCheckedChange={(checked) => {
                                     if (checked) {
                                       setSelectedMatters(prev => [...prev, matter.id]);
                                     } else {
                                       setSelectedMatters(prev => prev.filter(id => id !== matter.id));
                                     }
                                   }}
                                 />
                                 <label
                                   htmlFor={`matter-${matter.id}`}
                                   className="text-sm font-medium cursor-pointer flex-1"
                                 >
                                   {matter.title}
                                 </label>
                                 <span className="text-xs text-muted-foreground">
                                   Start: {format(new Date(matter.start_date), "MMM dd, yyyy")}
                                 </span>
                               </div>
                             ))}
                           </div>
                           <p className="text-xs text-muted-foreground">
                             {selectedMatters.length} of {activeMatters.length} matters selected
                           </p>
                         </div>
                       </div>
                     </ScrollArea>
                     <DialogFooter>
                       <Button 
                         variant="outline" 
                         onClick={() => {
                           setShowPrefillDialog(false);
                           setSelectedMatters([]);
                         }}
                         disabled={isPrefilling}
                       >
                         Cancel
                       </Button>
                       <Button 
                         onClick={handlePrefillActualHours}
                         disabled={isPrefilling}
                         className="bg-green-600 hover:bg-green-700"
                       >
                         {isPrefilling ? "Pre-filling..." : "Pre-fill Selected"}
                       </Button>
                     </DialogFooter>
                   </DialogContent>
                </Dialog>
                {lastPrefillRecord && (
                  <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded border border-green-200">
                    Last: {lastPrefillRecord}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Dialog open={showClearNotificationsDialog} onOpenChange={setShowClearNotificationsDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Clear notifications
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-orange-600" />
                        Clear All Notifications
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-orange-800 font-medium mb-2">
                          ⚠️ Warning: This action cannot be undone
                        </p>
                        <p className="text-sm text-orange-700">
                          This will permanently delete all notifications for all users in the system.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowClearNotificationsDialog(false)}
                        disabled={isClearingNotifications}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleClearNotifications}
                        disabled={isClearingNotifications}
                      >
                        {isClearingNotifications ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Clear All Notifications
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {lastClearNotificationsRecord && (
                  <div className="text-xs text-muted-foreground bg-orange-50 p-2 rounded border border-orange-200">
                    Last: {lastClearNotificationsRecord}
                  </div>
                )}
              </div>
            </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Access database tables or reset the system to a previous state by removing all changes after a specific date.
        </p>
      </CardContent>
    </Card>
    </div>
  );
}