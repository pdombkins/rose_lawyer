import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Data structures
interface Task {
  id: string;
  title: string;
  description?: string;
  workstream?: string;
  phase?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  commencement_date?: string;
  due_date?: string;
  order_position?: number;
  estimated_total_hours?: number;
}

interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  estimated_hours: number;
  actual_hours: number;
}

interface Profile {
  id: string;
  full_name?: string;
  email: string;
}

interface GanttExportImportProps {
  tasks: Task[];
  profiles: Profile[];
  matterTitle: string;
  matterId: string;
  onDataUpdated: () => void;
}

export default function GanttExportImport({ tasks, profiles, matterTitle, matterId, onDataUpdated }: GanttExportImportProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    tasks: unknown[];
    assignments: unknown[];
  } | null>(null);

  // Export functionality
  const exportToExcel = async () => {
    try {
      // Fetch detailed task and assignment data
      const { data: detailedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignments(
            id,
            user_id,
            estimated_hours,
            actual_hours,
            profiles(id, full_name, email)
          )
        `)
        .eq('matter_id', matterId)
        .order('order_position');

      if (tasksError) throw tasksError;

      // Prepare tasks sheet data
      const tasksSheetData = detailedTasks?.map(task => ({
        'Task ID': task.id,
        'Task Title': task.title,
        'Description': task.description || '',
        'Workstream': task.workstream || '',
        'Phase': task.phase || '',
        'Status': task.status,
        'Priority': task.priority,
        'Assigned To ID': task.assigned_to || '',
        'Start Date': task.commencement_date,
        'Due Date': task.due_date,
        'Order Position': task.order_position,
        'Total Estimated Hours': task.estimated_total_hours,
        'Total Actual Hours': task.actual_hours,
      })) || [];

      // Prepare assignments sheet data
      const assignmentsSheetData: any[] = [];
      detailedTasks?.forEach(task => {
        task.task_assignments?.forEach((assignment: any) => {
          assignmentsSheetData.push({
            'Assignment ID': assignment.id,
            'Task ID': task.id,
            'Task Title': task.title,
            'User ID': assignment.user_id,
            'User Name': assignment.profiles?.full_name || 'Unknown',
            'User Email': assignment.profiles?.email || '',
            'Estimated Hours': assignment.estimated_hours,
            'Actual Hours': assignment.actual_hours,
          });
        });
      });

      // Instructions sheet data
      const instructionsSheetData = [
        ['Column', 'Description', 'Required', 'Notes'],
        ['Task ID', 'Unique identifier for the task', 'No', 'Leave blank for new tasks - system will auto-generate'],
        ['Task Title', 'Title of the task', 'Yes', ''],
        ['Description', 'Task description', 'No', ''],
        ['Workstream', 'Workstream category', 'No', ''],
        ['Phase', 'Task phase', 'No', ''],
        ['Status', 'Task status (open, in_progress, completed, cancelled)', 'No', 'Default: open'],
        ['Priority', 'Task priority (low, medium, high)', 'No', 'Default: medium'],
        ['Assigned To ID', 'User ID of assigned person', 'No', 'Must match existing profile ID'],
        ['Start Date', 'Task start date', 'No', 'Format: YYYY-MM-DD'],
        ['Due Date', 'Task due date', 'No', 'Format: YYYY-MM-DD'],
        ['Order Position', 'Task order position', 'No', 'Default: 1'],
        ['Total Estimated Hours', 'Total estimated hours for task', 'No', 'Default: 0'],
        ['', '', '', ''],
        ['ASSIGNMENTS SHEET', '', '', ''],
        ['Assignment ID', 'Unique identifier for assignment', 'No', 'Leave blank for new assignments - system will auto-generate'],
        ['Task ID', 'Task ID this assignment belongs to', 'Yes', 'Must match a task ID (use Task ID from Tasks sheet)'],
        ['User ID', 'ID of assigned user', 'Yes', 'Must match existing profile ID'],
        ['Estimated Hours', 'Estimated hours for this assignment', 'No', 'Default: 0'],
        ['Actual Hours', 'Actual hours worked', 'No', 'Default: 0'],
      ];

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Add tasks sheet
      const tasksSheet = XLSX.utils.json_to_sheet(tasksSheetData);
      XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
      
      // Add assignments sheet
      const assignmentsSheet = XLSX.utils.json_to_sheet(assignmentsSheetData);
      XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Assignments');
      
      // Add instructions sheet
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsSheetData);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

      // Export file
      const fileName = `${matterTitle.replace(/[^a-z0-9]/gi, '_')}_gantt_export.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Gantt chart exported successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export Gantt chart');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read tasks sheet
        const tasksSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('task')
        ) || workbook.SheetNames[0];
        
        const tasksSheet = workbook.Sheets[tasksSheetName];
        const tasksData = XLSX.utils.sheet_to_json(tasksSheet);

        // Read assignments sheet
        const assignmentsSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('assignment')
        ) || workbook.SheetNames[1];
        
        let assignmentsData: unknown[] = [];
        if (assignmentsSheetName && workbook.Sheets[assignmentsSheetName]) {
          const assignmentsSheet = workbook.Sheets[assignmentsSheetName];
          assignmentsData = XLSX.utils.sheet_to_json(assignmentsSheet);
        }

        console.log('📊 Excel file parsed:', {
          tasksCount: tasksData.length,
          assignmentsCount: assignmentsData.length,
          sampleTask: tasksData[0],
          sampleAssignment: assignmentsData[0]
        });

        // Validate that assignments have actual hours data
        const assignmentsWithActualHours = (assignmentsData as any[]).filter(assignment => {
          const actualHours = parseFloat(assignment['Actual Hours'] || assignment.actual_hours || '0');
          return actualHours > 0;
        });

        console.log(`📈 Assignments with actual hours: ${assignmentsWithActualHours.length}/${assignmentsData.length}`);

        if (assignmentsWithActualHours.length === 0) {
          toast.error('No actual hours found in assignments. Please ensure your Excel file has "Actual Hours" column with values > 0.');
        }

        setImportPreview({
          tasks: tasksData,
          assignments: assignmentsData
        });

        toast.success(`Preview loaded: ${tasksData.length} tasks, ${assignmentsData.length} assignments (${assignmentsWithActualHours.length} with actual hours)`);
      } catch (error) {
        console.error('File parsing error:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Import processing using clean slate edge function with retry logic
  const processImport = async () => {
    if (!importPreview || isImporting) return;

    setIsImporting(true);
    try {
      const { tasks: importedTasks, assignments: importedAssignments } = importPreview;

      console.log(`Starting clean slate import: ${importedTasks.length} tasks, ${importedAssignments.length} assignments`);
      
      // Retry logic for network issues
      let attempt = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempt < maxAttempts) {
        try {
          attempt++;
          console.log(`Import attempt ${attempt}/${maxAttempts}...`);
          
          // Call the clean slate Gantt import edge function
          const { data, error } = await supabase.functions.invoke('gantt-import-processor', {
            body: {
              action: 'import',
              matterId: matterId,
              tasks: importedTasks,
              assignments: importedAssignments
            }
          });

          if (error) {
            throw new Error(error.message || 'Failed to process Gantt import');
          }

          if (!data.success) {
            throw new Error(data.error || 'Gantt import failed');
          }

          console.log('Import results:', data);

          if (data.errors && data.errors.length > 0) {
            console.warn('Import completed with warnings:', data.errors);
            toast.success(`Import completed with ${data.errors.length} warnings. Check console for details.`);
          } else {
            toast.success(`Import completed successfully! Created ${data.tasksCreated} tasks and ${data.assignmentsCreated} assignments.`);
          }

          setShowImportDialog(false);
          setImportPreview(null);
          onDataUpdated();
          return; // Success - exit retry loop
          
        } catch (retryError: any) {
          lastError = retryError;
          console.warn(`Import attempt ${attempt} failed:`, retryError.message);
          
          if (attempt < maxAttempts) {
            console.log(`Retrying in ${attempt * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Progressive delay
          }
        }
      }
      
      // If we get here, all attempts failed
      throw lastError;
      
    } catch (error: any) {
      console.error('Import error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Import failed: ';
      if (error.message.includes('fetch')) {
        errorMessage += 'Network connectivity issue. Please check your connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out. The import may be processing in the background.';
      } else {
        errorMessage += error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  // Helper function to create proportional time entries
  const createProportionalTimeEntries = async (assignment: any, matterId: string) => {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, commencement_date, due_date')
        .eq('id', assignment.task_id)
        .single();

      if (taskError || !task) {
        console.error('Failed to fetch task for time entry creation:', taskError);
        return;
      }

      // Get user hourly rate
      const { data: profile } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', assignment.user_id)
        .single();

      const { data: matter } = await supabase
        .from('matters')
        .select('hourly_rate')
        .eq('id', matterId)
        .single();

      const hourlyRate = profile?.hourly_rate || matter?.hourly_rate || 0;

      if (assignment.actual_hours <= 0) return;

      const startDate = task.commencement_date ? new Date(task.commencement_date) : new Date();
      const endDate = task.due_date ? new Date(task.due_date) : startDate;
      
      // Generate monthly periods
      const monthlyPeriods = [];
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (current <= lastMonth) {
        monthlyPeriods.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      
      if (monthlyPeriods.length === 0) {
        monthlyPeriods.push(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
      }
      
      // Distribute hours proportionally across months
      const hoursPerMonth = assignment.actual_hours / monthlyPeriods.length;
      
      // Create time entry for each month
      for (const monthStart of monthlyPeriods) {
        await supabase
          .from('time_entries')
          .insert({
            matter_id: matterId,
            task_id: task.id,
            user_id: assignment.user_id,
            date: monthStart.toISOString().split('T')[0], // First day of month
            hours: hoursPerMonth,
            description: `Imported hours for ${task.title} (${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
            hourly_rate: hourlyRate,
            billable: true,
            source: 'import'
          });
      }
      
      console.log(`Created ${monthlyPeriods.length} monthly time entries for task ${task.title}`);
    } catch (error) {
      console.error('Error creating proportional time entries:', error);
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={exportToExcel} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export Gantt
      </Button>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Gantt
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Gantt Chart Data</DialogTitle>
            <DialogDescription>
              Upload an Excel file to import tasks and assignments. New tasks and assignments without IDs will be automatically created.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <Input 
                type="file" 
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="max-w-sm mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Select an Excel file exported from this system
              </p>
            </div>

            {importPreview && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-sm text-yellow-800 font-medium">⚠️ Important Warning</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    This import will modify your existing data. Tasks not in the import file will be deleted. 
                    Make sure you have a backup before proceeding.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Tasks Preview ({(importPreview.tasks as any[]).length} items)</h4>
                    <div className="border rounded max-h-60 overflow-y-auto">
                      <div className="space-y-1 p-2">
                        {(importPreview.tasks as any[]).slice(0, 10).map((task: any, index: number) => (
                          <div key={index} className="text-xs p-2 bg-muted rounded">
                            {task['Task Title']} - {task['Status']} - {task['Workstream']}
                          </div>
                        ))}
                        {(importPreview.tasks as any[]).length > 10 && (
                          <div className="text-xs text-muted-foreground p-2">
                            ... and {(importPreview.tasks as any[]).length - 10} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Assignments Preview ({(importPreview.assignments as any[]).length} items)</h4>
                    <div className="border rounded max-h-60 overflow-y-auto">
                      <div className="space-y-1 p-2">
                        {(importPreview.assignments as any[]).slice(0, 10).map((assignment: any, index: number) => (
                          <div key={index} className="text-xs p-2 bg-muted rounded">
                            {assignment['User Name']} - {assignment['Task Title']} - {assignment['Estimated Hours']}h
                          </div>
                        ))}
                        {(importPreview.assignments as any[]).length > 10 && (
                          <div className="text-xs text-muted-foreground p-2">
                            ... and {(importPreview.assignments as any[]).length - 10} more assignments
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={processImport} 
                    disabled={isImporting}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}