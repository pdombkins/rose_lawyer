import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAssignableProfiles } from '@/hooks/useProfiles';

interface Profile {
  id: string;
  full_name: string | null;
  role: string | null;
  hourly_rate: number | null;
}

interface TaskAssignment {
  id?: string;
  user_id: string;
  estimated_hours: number;
  actual_hours: number;
  profile?: Profile;
}

interface TaskAssignmentsProps {
  taskId?: string;
  onAssignmentsChange?: (assignments: TaskAssignment[]) => void;
  initialAssignments?: TaskAssignment[];
}

// Debounce delay for database updates (ms)
const DEBOUNCE_DELAY = 500;

export function TaskAssignments({ taskId, onAssignmentsChange, initialAssignments = [] }: TaskAssignmentsProps) {
  const { data: profiles = [], isLoading: profilesLoading } = useAssignableProfiles();
  const [assignments, setAssignments] = useState<TaskAssignment[]>(initialAssignments);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Refs for debouncing
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingValuesRef = useRef<Map<string, { field: string; value: number }>>(new Map());

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    // Load task assignments after profiles are loaded
    if (taskId && initialAssignments.length === 0 && !profilesLoading) {
      loadTaskAssignments();
    }
  }, [taskId, profilesLoading]);

  useEffect(() => {
    // Use initial assignments if provided
    if (initialAssignments.length > 0) {
      setAssignments(initialAssignments);
    }
  }, [initialAssignments]);

  useEffect(() => {
    onAssignmentsChange?.(assignments);
  }, [assignments, onAssignmentsChange]);

  const loadTaskAssignments = async () => {
    if (!taskId) return;

    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          profile:profiles!user_id(id, full_name, role, hourly_rate)
        `)
        .eq('task_id', taskId);

      if (error) throw error;

      const loadedAssignments: TaskAssignment[] = (data || []).map((assignment: any) => ({
        id: assignment.id,
        user_id: assignment.user_id,
        estimated_hours: Number(assignment.estimated_hours) || 0,
        actual_hours: Number(assignment.actual_hours) || 0,
        profile: assignment.profile ? {
          id: assignment.profile.id,
          full_name: assignment.profile.full_name,
          role: assignment.profile.role,
          hourly_rate: assignment.profile.hourly_rate
        } : undefined
      }));

      setAssignments(loadedAssignments);
    } catch (error) {
      console.error('Error loading task assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load task assignments',
        variant: 'destructive'
      });
    }
  };

  const addAssignment = async () => {
    if (!selectedUserId) return;

    // Check if user is already assigned
    if (assignments.some(a => a.user_id === selectedUserId)) {
      toast({
        title: 'Already Assigned',
        description: 'This team member is already assigned to this task',
        variant: 'destructive'
      });
      return;
    }

    const selectedProfile = profiles.find(p => p.id === selectedUserId);
    if (!selectedProfile) return;

    // If we have a taskId, persist to database immediately
    if (taskId) {
      try {
        const { error } = await supabase
          .from('task_assignments')
          .insert({
            task_id: taskId,
            user_id: selectedUserId,
            estimated_hours: 0,
            actual_hours: 0
          });

        if (error) throw error;

        // Reload assignments to get the fresh data with ID
        await loadTaskAssignments();
        
        toast({
          title: 'Assignment Added',
          description: `${selectedProfile.full_name} has been assigned to this task`
        });
      } catch (error) {
        console.error('Error adding assignment:', error);
        toast({
          title: 'Error',
          description: 'Failed to add assignment. Please try again.',
          variant: 'destructive'
        });
        return;
      }
    } else {
      // For new tasks, just update local state
      const newAssignment: TaskAssignment = {
        user_id: selectedUserId,
        estimated_hours: 0,
        actual_hours: 0,
        profile: {
          id: selectedProfile.id,
          full_name: selectedProfile.full_name,
          role: selectedProfile.role,
          hourly_rate: selectedProfile.hourly_rate
        }
      };

      setAssignments(prev => [...prev, newAssignment]);
    }

    setSelectedUserId('');
  };

  const removeAssignment = async (userId: string) => {
    // If we have a taskId, remove from database
    if (taskId) {
      try {
        const { error } = await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', userId);

        if (error) throw error;

        // Reload assignments to get fresh data
        await loadTaskAssignments();
        
        const removedProfile = profiles.find(p => p.id === userId);
        toast({
          title: 'Assignment Removed',
          description: `${removedProfile?.full_name} has been removed from this task`
        });
      } catch (error) {
        console.error('Error removing assignment:', error);
        toast({
          title: 'Error',
          description: 'Failed to remove assignment. Please try again.',
          variant: 'destructive'
        });
        return;
      }
    } else {
      // For new tasks, just update local state
      setAssignments(prev => prev.filter(a => a.user_id !== userId));
    }
  };

  // Debounced database update function
  const persistAssignmentUpdate = useCallback(async (userId: string, field: 'estimated_hours' | 'actual_hours', value: number) => {
    if (!taskId) return;

    try {
      // Build the patch explicitly rather than with a computed key. A computed
      // key widens the object to `{ [x: string]: number }`, which the typed
      // client can't match against the column list — and which would happily
      // send a misspelled column name straight to the database. `field` is
      // already union-typed, so this costs nothing and is checked.
      const patch =
        field === 'estimated_hours'
          ? { estimated_hours: value }
          : { actual_hours: value };

      const { error } = await supabase
        .from('task_assignments')
        .update(patch)
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Remove from pending updates
      setPendingUpdates(prev => {
        const next = new Set(prev);
        next.delete(`${userId}-${field}`);
        return next;
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to save assignment. Please try again.',
        variant: 'destructive'
      });
      // Revert local state on error
      await loadTaskAssignments();
    }
  }, [taskId, toast]);

  const updateAssignment = useCallback((userId: string, field: 'estimated_hours' | 'actual_hours', value: number) => {
    // Update local state immediately for responsive UI
    setAssignments(prev => prev.map(assignment => 
      assignment.user_id === userId 
        ? { ...assignment, [field]: value }
        : assignment
    ));

    // If we have a taskId, debounce the database update
    if (taskId) {
      const key = `${userId}-${field}`;
      
      // Mark as pending
      setPendingUpdates(prev => new Set(prev).add(key));
      
      // Clear existing timer for this field
      const existingTimer = debounceTimersRef.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new debounced timer
      const timer = setTimeout(() => {
        persistAssignmentUpdate(userId, field, value);
        debounceTimersRef.current.delete(key);
      }, DEBOUNCE_DELAY);

      debounceTimersRef.current.set(key, timer);
    }
  }, [taskId, persistAssignmentUpdate]);

  const availableProfiles = profiles.filter(profile => 
    !assignments.some(assignment => assignment.user_id === profile.id)
  );

  const getTotalHours = (field: 'estimated_hours' | 'actual_hours') => {
    return assignments.reduce((sum, assignment) => sum + assignment[field], 0);
  };

  const hasPendingUpdates = pendingUpdates.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <Label>Team Member Assignments</Label>
          {hasPendingUpdates && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        
        {/* Add new assignment */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={(userId) => {
            setSelectedUserId(userId);
            if (userId) {
              // Auto-add assignment when user is selected
              setTimeout(() => addAssignment(), 0);
            }
          }}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={profilesLoading ? "Loading..." : "Select team member to add"} />
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name} ({profile.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}) - ${profile.hourly_rate}/hr
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            type="button" 
            size="sm" 
            onClick={addAssignment}
            disabled={!selectedUserId}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current assignments */}
      {assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map(assignment => {
            const isEstimatedPending = pendingUpdates.has(`${assignment.user_id}-estimated_hours`);
            const isActualPending = pendingUpdates.has(`${assignment.user_id}-actual_hours`);
            
            return (
              <Card key={assignment.user_id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {assignment.profile?.full_name || 'Unknown User'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {assignment.profile?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${assignment.profile?.hourly_rate}/hr
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(assignment.user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Label className="text-xs">Estimated Hours</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={assignment.estimated_hours === 0 ? '' : assignment.estimated_hours}
                        placeholder="0"
                        onChange={(e) => updateAssignment(
                          assignment.user_id, 
                          'estimated_hours', 
                          e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        )}
                        className={`h-8 ${isEstimatedPending ? 'border-primary' : ''}`}
                      />
                      {isEstimatedPending && (
                        <Loader2 className="absolute right-2 top-7 h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="relative">
                      <Label className="text-xs">Actual Hours</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={assignment.actual_hours === 0 ? '' : assignment.actual_hours}
                        placeholder="0"
                        onChange={(e) => updateAssignment(
                          assignment.user_id, 
                          'actual_hours', 
                          e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                        )}
                        className={`h-8 ${isActualPending ? 'border-primary' : ''}`}
                      />
                      {isActualPending && (
                        <Loader2 className="absolute right-2 top-7 h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {/* Totals */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm font-medium">
              Total Estimated: {getTotalHours('estimated_hours')} hours
            </div>
            <div className="text-sm font-medium">
              Total Actual: {getTotalHours('actual_hours')} hours  
            </div>
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No team members assigned. Add team members above.
        </div>
      )}
    </div>
  );
}
