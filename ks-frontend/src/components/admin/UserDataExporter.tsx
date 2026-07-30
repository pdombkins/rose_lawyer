import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users, Download, FileText, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ExportOptions {
  profiles: boolean;
  timeEntries: boolean;
  tasks: boolean;
  notifications: boolean;
}

export function UserDataExporter() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    profiles: true,
    timeEntries: true,
    tasks: true,
    notifications: false,
  });
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create summary sheet with export info
      const summaryData = [
        ['User Data Export Report'],
        ['Generated on:', format(new Date(), 'PPP p')],
        ['Export includes:'],
        ...Object.entries(exportOptions)
          .filter(([_, included]) => included)
          .map(([option]) => ['✓', option.replace(/([A-Z])/g, ' $1').trim()])
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Export Summary');

      // Export selected data types
      if (exportOptions.profiles) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profiles && profiles.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(profiles);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'User Profiles');
        }
      }

      if (exportOptions.timeEntries) {
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('*')
          .order('date', { ascending: false });

        const { data: profiles } = await supabase.from('profiles').select('*');
        const { data: matters } = await supabase.from('matters').select('*');
        const { data: tasks } = await supabase.from('tasks').select('*');
        
        if (timeEntries && timeEntries.length > 0) {
          // Flatten the data for better Excel export
          const flattenedEntries = timeEntries.map(entry => {
            const profile = profiles?.find(p => p.id === entry.user_id);
            const matter = matters?.find(m => m.id === entry.matter_id);
            const task = tasks?.find(t => t.id === entry.task_id);
            
            return {
              id: entry.id,
              user_name: profile?.full_name || 'Unknown',
              user_email: profile?.email || 'Unknown',
              matter_title: matter?.title || 'Unknown',
              task_title: task?.title || 'No Task',
            date: entry.date,
            hours: entry.hours,
            hourly_rate: entry.hourly_rate,
            billable: entry.billable ? 'Yes' : 'No',
            description: entry.description,
              source: entry.source,
              created_at: entry.created_at
            };
          });
          
          const worksheet = XLSX.utils.json_to_sheet(flattenedEntries);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
        }
      }

      if (exportOptions.tasks) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: taskProfiles } = await supabase.from('profiles').select('*');
        const { data: taskMatters } = await supabase.from('matters').select('*');
        
        if (tasks && tasks.length > 0) {
          const flattenedTasks = tasks.map(task => {
            const assignedUser = taskProfiles?.find(p => p.id === task.assigned_to);
            const createdUser = taskProfiles?.find(p => p.id === task.created_by);
            const matter = taskMatters?.find(m => m.id === task.matter_id);
            
            return {
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              assigned_to_name: assignedUser?.full_name || 'Unassigned',
              assigned_to_email: assignedUser?.email || '',
              matter_title: matter?.title || 'Unknown',
              phase: task.phase,
              workstream: task.workstream,
              due_date: task.due_date,
              completed_hours: task.actual_hours,
              created_by_name: createdUser?.full_name || 'Unknown',
              created_at: task.created_at,
              updated_at: task.updated_at
            };
          });
          
          const worksheet = XLSX.utils.json_to_sheet(flattenedTasks);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
        }
      }

      if (exportOptions.notifications) {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: notifProfiles } = await supabase.from('profiles').select('*');
        
        if (notifications && notifications.length > 0) {
          const flattenedNotifications = notifications.map(notif => {
            const user = notifProfiles?.find(p => p.id === notif.user_id);
            
            return {
              id: notif.id,
              user_name: user?.full_name || 'Unknown',
              user_email: user?.email || 'Unknown',
              title: notif.title,
              message: notif.message,
              read: notif.read ? 'Yes' : 'No',
              link_url: notif.link_url,
              created_at: notif.created_at
            };
          });
          
          const worksheet = XLSX.utils.json_to_sheet(flattenedNotifications);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Notifications');
        }
      }


      const fileName = `user_data_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Export Completed",
        description: `User data exported successfully as ${fileName}`
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the user data.",
        variant: "destructive"
      });
    }
    setExporting(false);
  };

  const toggleOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="h-20 flex-col space-y-2" 
        onClick={() => setShowExportDialog(true)}
      >
        <Users className="w-6 h-6" />
        <span>Export User Data</span>
      </Button>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Export User Data
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>This export includes sensitive user information. Handle with care.</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-base font-medium">Select data to export:</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="profiles"
                    checked={exportOptions.profiles}
                    onCheckedChange={() => toggleOption('profiles')}
                  />
                  <Label htmlFor="profiles" className="text-sm">User Profiles</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="timeEntries"
                    checked={exportOptions.timeEntries}
                    onCheckedChange={() => toggleOption('timeEntries')}
                  />
                  <Label htmlFor="timeEntries" className="text-sm">Time Entries</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="tasks"
                    checked={exportOptions.tasks}
                    onCheckedChange={() => toggleOption('tasks')}
                  />
                  <Label htmlFor="tasks" className="text-sm">User Tasks</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="notifications"
                    checked={exportOptions.notifications}
                    onCheckedChange={() => toggleOption('notifications')}
                  />
                  <Label htmlFor="notifications" className="text-sm">Notifications</Label>
                </div>
                
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowExportDialog(false)}
                disabled={exporting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExport}
                disabled={exporting || !Object.values(exportOptions).some(Boolean)}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Data'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}