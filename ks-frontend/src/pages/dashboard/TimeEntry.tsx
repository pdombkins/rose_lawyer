import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateWIPExcelReport } from "@/utils/wipExcelReport";
import { 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Filter,
  FileSpreadsheet
} from "lucide-react";

interface TimeEntry {
  id: string;
  date: string;
  matterId: string;
  matterTitle: string;
  client: string;
  description: string;
  hours: number;
  rate: number;
  totalFee: number;
  userName: string;
  userRole: string;
  taskTitle: string;
  createdAt: string;
}

interface Matter {
  id: string;
  title: string;
  client: string;
}

export default function TimeEntry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    matterId: '',
    description: '',
    hours: '',
    rate: '850'
  });

  // Filter state
  const [matterFilter, setMatterFilter] = useState<string>('all');

  useEffect(() => {
    fetchMatters();
    fetchTimeEntries();
  }, []);

  const fetchMatters = async () => {
    try {
      const { data, error } = await supabase
        .from('matters')
        .select(`
          id,
          title,
          clients!inner(name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const formattedMatters = data?.map(matter => ({
        id: matter.id,
        title: matter.title,
        client: matter.clients.name
      })) || [];

      setMatters(formattedMatters);
    } catch (error) {
      console.error('Error fetching matters:', error);
      toast({
        title: "Error",
        description: "Failed to load matters",
        variant: "destructive"
      });
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          matters!inner(title, clients!inner(name)),
          profiles(full_name, role),
          tasks(title)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedEntries = data?.map(entry => ({
        id: entry.id,
        date: entry.date,
        matterId: entry.matter_id,
        matterTitle: entry.matters.title,
        client: entry.matters.clients.name,
        description: entry.description || '',
        hours: entry.hours || 0,
        rate: entry.hourly_rate || 0,
        totalFee: (entry.hours || 0) * (entry.hourly_rate || 0),
        userName: entry.profiles?.full_name || 'Unknown User',
        userRole: entry.profiles?.role || 'Staff',
        taskTitle: entry.tasks?.title || 'General Time',
        createdAt: entry.created_at || new Date().toISOString()
      })) || [];

      setTimeEntries(formattedEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to load time entries",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMatter = matters.find(m => m.id === formData.matterId);
    
    if (!selectedMatter) {
      toast({
        title: "Error",
        description: "Please select a matter.",
        variant: "destructive"
      });
      return;
    }

    const hours = parseFloat(formData.hours);
    const rate = parseFloat(formData.rate);

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('time_entries')
          .update({
            date: formData.date,
            matter_id: formData.matterId,
            description: formData.description,
            hours: hours,
            hourly_rate: rate,
            billable: true
          })
          .eq('id', editingEntry.id);

        if (error) throw error;

        toast({
          title: "Time Entry Updated",
          description: "Your time entry has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('time_entries')
          .insert({
            date: formData.date,
            matter_id: formData.matterId,
            description: formData.description,
            hours: hours,
            hourly_rate: rate,
            billable: true,
            user_id: '550e8400-e29b-41d4-a716-446655440001' // Default to James Bentley for demo
          });

        if (error) throw error;

        toast({
          title: "Time Entry Created",
          description: "Your time entry has been saved successfully.",
        });
      }

      // Refresh the data
      await fetchTimeEntries();
      resetForm();
    } catch (error) {
      console.error('Error saving time entry:', error);
      toast({
        title: "Error",
        description: "Failed to save time entry. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      matterId: '',
      description: '',
      hours: '',
      rate: '850'
    });
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      matterId: entry.matterId,
      description: entry.description,
      hours: entry.hours.toString(),
      rate: entry.rate.toString()
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Time Entry Deleted",
        description: "The time entry has been removed.",
      });

      // Refresh the data
      await fetchTimeEntries();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete time entry. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter time entries by matter
  const filteredTimeEntries = timeEntries.filter(entry => 
    matterFilter === 'all' || entry.matterId === matterFilter
  );

  const exportTimeEntries = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      
      const selectedMatter = matters.find(m => m.id === matterFilter);
      const exportData = filteredTimeEntries.map(entry => ({
        'Date': new Date(entry.date).toLocaleDateString(),
        'Resource': entry.userName,
        'Role': entry.userRole,
        'Matter': entry.matterTitle,
        'Client': entry.client,
        'Task': entry.taskTitle,
        'Description': entry.description,
        'Hours': entry.hours,
        'Charge Rate': entry.rate,
        'Fee Impact': entry.totalFee
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      
      const fileName = selectedMatter 
        ? `${selectedMatter.client} - ${selectedMatter.title} - Time Entries`
        : 'All Time Entries';
      
      utils.book_append_sheet(workbook, worksheet, 'Time Entries');
      writeFile(workbook, `${fileName}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `Time entries exported to ${fileName}.xlsx`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export time entries to Excel",
        variant: "destructive"
      });
    }
  };

  const downloadWIPReport = async () => {
    if (matterFilter === 'all') {
      toast({
        title: "Please Select a Matter",
        description: "Please select a specific matter to generate a WIP report.",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateWIPExcelReport(matterFilter);
      toast({
        title: "WIP Report Generated",
        description: "Your Work in Progress report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('WIP Report error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate WIP report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const totalHours = filteredTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalFees = filteredTimeEntries.reduce((sum, entry) => sum + entry.totalFee, 0);

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
                  Time Entry Management
                </h1>
                <p className="text-sm text-muted-foreground">Record and manage billable hours</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button className="elegant-button" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Time Entry
              </Button>
              <Button 
                variant="outline" 
                onClick={exportTimeEntries}
                disabled={filteredTimeEntries.length === 0}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Export to Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadWIPReport}
                disabled={matterFilter === 'all'}
                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                WIP Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">${totalFees.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Fees</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{filteredTimeEntries.length}</div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Time Entry Form */}
          {isFormOpen && (
            <div className="lg:col-span-1">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="font-serif text-xl text-foreground">
                    {editingEntry ? 'Edit Time Entry' : 'New Time Entry'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the work performed..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hours">Hours</Label>
                        <Input
                          id="hours"
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          value={formData.hours}
                          onChange={(e) => setFormData({...formData, hours: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="rate">Charge Rate ($/hour)</Label>
                        <Input
                          id="rate"
                          type="number"
                          placeholder="850"
                          value={formData.rate}
                          onChange={(e) => setFormData({...formData, rate: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">
                        {editingEntry ? 'Update Entry' : 'Save Entry'}
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

          {/* Time Entries Table */}
          <div className={isFormOpen ? "lg:col-span-3" : "lg:col-span-4"}>
            <Card className="premium-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-xl text-foreground">
                    Time Entries
                  </CardTitle>
                  {/* Matter Filter */}
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <Select value={matterFilter} onValueChange={setMatterFilter}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Filter by matter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Matters</SelectItem>
                        {matters.map(matter => (
                          <SelectItem key={matter.id} value={matter.id}>
                            {matter.client} - {matter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTimeEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No time entries found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="p-4 font-medium text-sm text-muted-foreground">Date/Time</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Resource</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Matter Name</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Charge Rate</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Hours</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Fee Impact</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Task</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Description</th>
                          <th className="p-4 font-medium text-sm text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimeEntries.map((entry, index) => (
                          <tr key={entry.id} className={index % 2 === 0 ? 'bg-muted/20' : 'bg-background'}>
                             <td className="p-4">
                               <div className="text-sm">
                                 <div className="font-medium">{new Date(entry.date).toLocaleDateString()}</div>
                                 <div className="text-xs text-muted-foreground">
                                   Start: {new Date(entry.date).toLocaleDateString()}
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
                              <div className="text-sm">
                                <div className="font-medium">{entry.matterTitle}</div>
                                <div className="text-xs text-muted-foreground">{entry.client}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-mono font-medium">
                                ${entry.rate}/hr
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant="default"
                                className="font-mono"
                              >
                                {entry.hours}h
                              </Badge>
                            </td>
                            <td className="p-4">
                              <span className="font-medium font-mono text-green-600">
                                +${entry.totalFee.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-medium">{entry.taskTitle}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-muted-foreground max-w-48 truncate">
                                {entry.description}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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
          </div>
        </div>
      </div>
    </div>
  );
}