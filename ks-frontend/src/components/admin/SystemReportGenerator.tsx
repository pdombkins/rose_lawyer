import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Calendar, Users, DollarSign, Clock, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface SystemReportData {
  matters: any[];
  clients: any[];
  tasks: any[];
  timeEntries: any[];
  profiles: any[];
  notifications: any[];
  calendarEvents: any[];
}

interface SystemStats {
  totalMatters: number;
  activeMatters: number;
  totalClients: number;
  totalTasks: number;
  completedTasks: number;
  totalTimeEntries: number;
  totalBillableHours: number;
  totalRevenue: number;
  avgChargeRate: number;
  totalStaff: number;
  activeStaff: number;
  totalNotifications: number;
  unreadNotifications: number;
  upcomingEvents: number;
}

export function SystemReportGenerator() {
  const [reportData, setReportData] = useState<SystemReportData | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    setGenerating(true);
    try {
      // Fetch all data concurrently
      const [
        { data: matters },
        { data: clients },
        { data: tasks },
        { data: timeEntries },
        { data: profiles },
        { data: notifications },
        { data: calendarEvents }
      ] = await Promise.all([
        supabase.from('matters').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('time_entries').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('calendar_events').select('*')
      ]);

      const data: SystemReportData = {
        matters: matters || [],
        clients: clients || [],
        tasks: tasks || [],
        timeEntries: timeEntries || [],
        profiles: profiles || [],
        notifications: notifications || [],
        calendarEvents: calendarEvents || []
      };

      // Calculate comprehensive stats
      const totalBillableHours = data.timeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + (entry.hours || 0), 0);
      
      const totalRevenue = data.timeEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + ((entry.hours || 0) * (entry.hourly_rate || 0)), 0);

      const avgChargeRate = data.profiles
        .filter(profile => profile.hourly_rate > 0)
        .reduce((sum, profile) => sum + profile.hourly_rate, 0) / 
        data.profiles.filter(profile => profile.hourly_rate > 0).length || 0;

      const now = new Date();
      const upcomingEvents = data.calendarEvents.filter(event => 
        new Date(event.start_time) > now
      ).length;

      const calculatedStats: SystemStats = {
        totalMatters: data.matters.length,
        activeMatters: data.matters.filter(matter => matter.status === 'active').length,
        totalClients: data.clients.length,
        totalTasks: data.tasks.length,
        completedTasks: data.tasks.filter(task => task.status === 'completed').length,
        totalTimeEntries: data.timeEntries.length,
        totalBillableHours: Math.round(totalBillableHours * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgChargeRate: Math.round(avgChargeRate * 100) / 100,
        totalStaff: data.profiles.length,
        activeStaff: data.profiles.filter(profile => profile.role !== 'inactive').length,
        totalNotifications: data.notifications.length,
        unreadNotifications: data.notifications.filter(notif => !notif.read).length,
        upcomingEvents
      };

      setReportData(data);
      setStats(calculatedStats);
      setShowReport(true);

      toast({
        title: "Report Generated",
        description: "System report has been successfully generated with real-time data."
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate system report.",
        variant: "destructive"
      });
    }
    setGenerating(false);
  };

  const exportReport = () => {
    if (!reportData || !stats) return;

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Practice Management System Report'],
      ['Generated on:', format(new Date(), 'PPP p')],
      [''],
      ['OVERVIEW STATISTICS'],
      ['Total Matters', stats.totalMatters],
      ['Active Matters', stats.activeMatters],
      ['Total Clients', stats.totalClients],
      ['Total Tasks', stats.totalTasks],
      ['Completed Tasks', stats.completedTasks],
      ['Total Staff', stats.totalStaff],
      ['Active Staff', stats.activeStaff],
      [''],
      ['FINANCIAL METRICS'],
      ['Total Billable Hours', stats.totalBillableHours],
      ['Total Revenue (AUD)', `$${stats.totalRevenue.toLocaleString()}`],
      ['Average Charge Rate (AUD)', `$${stats.avgChargeRate.toLocaleString()}`],
      [''],
      ['ACTIVITY METRICS'],
      ['Total Time Entries', stats.totalTimeEntries],
      ['Total Notifications', stats.totalNotifications],
      ['Unread Notifications', stats.unreadNotifications],
      ['Upcoming Calendar Events', stats.upcomingEvents]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add data sheets
    Object.entries(reportData).forEach(([tableName, data]) => {
      if (data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
      }
    });

    const fileName = `system_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Report Exported",
      description: `System report exported as ${fileName}`
    });
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="h-20 flex-col space-y-2" 
        onClick={generateReport}
        disabled={generating}
      >
        <FileText className="w-6 h-6" />
        <span>{generating ? 'Generating...' : 'Generate System Report'}</span>
      </Button>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                System Report - {format(new Date(), 'PPP')}
              </DialogTitle>
              <Button onClick={exportReport} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </DialogHeader>

          {stats && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Overview Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-2xl font-bold">{stats.totalMatters}</div>
                          <div className="text-xs text-muted-foreground">Total Matters</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">{stats.activeMatters}</div>
                          <div className="text-xs text-muted-foreground">Active Matters</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-2xl font-bold">{stats.totalClients}</div>
                          <div className="text-xs text-muted-foreground">Total Clients</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="text-2xl font-bold">{stats.totalTasks}</div>
                          <div className="text-xs text-muted-foreground">Total Tasks</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Financial Metrics */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        ${stats.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Revenue (AUD)</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {stats.totalBillableHours}
                      </div>
                      <div className="text-sm text-muted-foreground">Billable Hours</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        ${stats.avgChargeRate.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg. Charge Rate</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Activity Metrics */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Activity Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold">{stats.totalStaff}</div>
                          <div className="text-xs text-muted-foreground">Total Staff</div>
                        </div>
                        <Badge variant="outline">{stats.activeStaff} active</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold">{stats.totalNotifications}</div>
                          <div className="text-xs text-muted-foreground">Notifications</div>
                        </div>
                        <Badge variant="destructive">{stats.unreadNotifications} unread</Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div>
                        <div className="text-lg font-bold">{stats.upcomingEvents}</div>
                        <div className="text-xs text-muted-foreground">Upcoming Events</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold">{stats.completedTasks}</div>
                          <div className="text-xs text-muted-foreground">Completed Tasks</div>
                        </div>
                        <Badge variant="outline">
                          {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}