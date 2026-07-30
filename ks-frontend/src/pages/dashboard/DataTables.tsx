import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Download, Edit, Save, X, Database, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface TableData {
  [key: string]: any;
}

interface EditableRecord {
  [key: string]: any;
}

// `user_roles` was dropped in the merge (it allowed privilege escalation —
// any row could grant any role). Admin is now Rose's user_profiles.is_admin.
const tableNames = ['matters', 'clients', 'tasks', 'time_entries', 'profiles', 'notifications', 'calendar_events', 'knowledge_documents'] as const;

type TableName = typeof tableNames[number];

export default function DataTables() {
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<TableName>('matters');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  const fetchTableData = async (tableName: TableName) => {
    setLoading(true);
    try {
      let data: any[] = [];
      let error: any = null;

      // Handle different table queries with joins
      if (tableName === 'matters') {
        const response = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      } else if (tableName === 'tasks') {
        const response = await supabase
          .from(tableName)
          .select(`
            *,
            assigned_user:profiles!assigned_to(full_name),
            matter:matters(title)
          `)
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      } else if (tableName === 'time_entries') {
        const response = await supabase
          .from(tableName)
          .select(`
            *,
            user:profiles!user_id(full_name),
            matter:matters(title),
            task:tasks(title)
          `)
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      } else {
        const response = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      
      // Transform data to flatten relationships for better display
      const transformedData = data?.map((item: any) => {
        const transformed = { ...item };
        
        // Transform relationship data to readable format
        if (item.lead_partner?.[0]?.full_name) {
          transformed.lead_partner_display = item.lead_partner[0].full_name;
        }
        if (item.assigned_user?.[0]?.full_name) {
          transformed.assigned_user_display = item.assigned_user[0].full_name;
        }
        if (item.client?.[0]?.name) {
          transformed.client_display = item.client[0].name;
        }
        if (item.matter?.[0]?.title) {
          transformed.matter_display = item.matter[0].title;
        }
        if (item.user?.[0]?.full_name) {
          transformed.user_display = item.user[0].full_name;
        }
        if (item.task?.[0]?.title) {
          transformed.task_display = item.task[0].title;
        }
        
        return transformed;
      }) || [];
      
      setTableData(transformedData);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch ${tableName} data`,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleEdit = (record: any) => {
    setEditingRecord({ ...record });
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .update(editingRecord)
        .eq('id', editingRecord.id);

      if (error) throw error;

      setTableData(prev => 
        prev.map(item => 
          item.id === editingRecord.id ? editingRecord : item
        )
      );

      toast({
        title: "Success",
        description: "Record updated successfully"
      });

      setShowEditDialog(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      toast({
        title: "Error",
        description: "Failed to update record",
        variant: "destructive"
      });
    }
  };

  const exportAllTables = async () => {
    const workbook = XLSX.utils.book_new();

    for (const tableName of tableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');

        if (error) throw error;

        const worksheet = XLSX.utils.json_to_sheet(data || []);
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
      } catch (error) {
        console.error(`Error exporting ${tableName}:`, error);
      }
    }

    XLSX.writeFile(workbook, `practice_management_data_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Success",
      description: "All tables exported successfully"
    });
  };

  const getColumnDisplayName = (column: string, tableName: string) => {
    // Handle special column name mappings for better display
    if (column === 'lead_partner_id' && tableName === 'matters') return 'LEAD PARTNER';
    if (column === 'completed_hours' && tableName === 'tasks') return 'COMPLETED HOURS';
    if (column === 'assigned_to' && tableName === 'tasks') return 'ASSIGNED LAWYER';
    if (column === 'user_id' && tableName === 'tasks') return 'USER ID';
    if (column === 'workstream' && tableName === 'tasks') return 'WORKSTREAM';
    if (column === 'avatar_url' && tableName === 'profiles') return 'AVATAR URL';
    return column.replace(/_/g, ' ').toUpperCase();
  };

  const renderTableContent = () => {
    if (loading) {
      return <div className="p-8 text-center">Loading...</div>;
    }

    if (tableData.length === 0) {
      return <div className="p-8 text-center text-muted-foreground">No data available</div>;
    }

    const columns = Object.keys(tableData[0] || {});

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column} className="text-xs font-medium">
                  {getColumnDisplayName(column, selectedTable)}
                </TableHead>
              ))}
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.id}>
                {columns.map(column => (
                  <TableCell key={column} className="text-xs max-w-[200px] truncate">
                    {typeof row[column] === 'boolean' 
                      ? row[column] ? 'Yes' : 'No'
                      : typeof row[column] === 'object' && row[column] !== null
                      ? JSON.stringify(row[column])
                      : String(row[column] || '')
                    }
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(row)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderEditDialog = () => {
    if (!editingRecord) return null;

    const columns = Object.keys(editingRecord);
    const editableColumns = columns.filter(col => 
      col !== 'id' && col !== 'created_at' && col !== 'updated_at'
    );

    return (
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {editableColumns.map(column => (
              <div key={column} className="space-y-2">
                 <Label className="text-sm font-medium">
                  {getColumnDisplayName(column, selectedTable)}
                </Label>
                {typeof editingRecord[column] === 'boolean' ? (
                  <select
                    value={editingRecord[column] ? 'true' : 'false'}
                    onChange={(e) => setEditingRecord(prev => ({
                      ...prev!,
                      [column]: e.target.value === 'true'
                    }))}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <Input
                    value={String(editingRecord[column] || '')}
                    onChange={(e) => setEditingRecord(prev => ({
                      ...prev!,
                      [column]: e.target.value
                    }))}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingRecord(null);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Console
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Database className="w-6 h-6 mr-2" />
              Database Tables
            </h2>
            <p className="text-muted-foreground">View and edit database content</p>
          </div>
        </div>
        <Button onClick={exportAllTables} className="elegant-button">
          <Download className="w-4 h-4 mr-2" />
          Export All Tables
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table Browser</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTable} onValueChange={(value) => setSelectedTable(value as TableName)}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-9 mb-6">
              {tableNames.map(tableName => (
                <TabsTrigger key={tableName} value={tableName} className="text-xs">
                  {tableName.replace(/_/g, ' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            {tableNames.map(tableName => (
              <TabsContent key={tableName} value={tableName}>
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg capitalize">
                        {tableName.replace(/_/g, ' ')} Data
                      </CardTitle>
                      <Badge variant="outline">
                        {tableData.length} records
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderTableContent()}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {renderEditDialog()}
    </div>
  );
}