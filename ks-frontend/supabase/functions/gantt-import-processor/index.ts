import { requireAdmin, corsHeaders, ksRecompute } from '../_shared/ksGuard.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"


interface GanttImportRequest {
  action: 'import'
  matterId: string
  tasks: any[]
  assignments: any[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Instructor-only. Was verify_jwt:false + service-role — i.e. anyone.
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  try {
    const supabase = admin  // service-role, schema 'ks' (see _shared/ksGuard.ts)

    const body: GanttImportRequest = await req.json()
    console.log('📥 Gantt import request received:', {
      action: body.action,
      matterId: body.matterId,
      tasksCount: body.tasks?.length || 0,
      assignmentsCount: body.assignments?.length || 0
    })
    
    // Debug: Log sample assignment data to understand structure
    if (body.assignments && body.assignments.length > 0) {
      console.log('📋 Sample assignment data:', JSON.stringify(body.assignments[0], null, 2))
    }

    switch (body.action) {
      case 'import':
        return await processGanttImport(supabase, body)
      default:
        throw new Error(`Unknown action: ${body.action}`)
    }

  } catch (error) {
    console.error('Gantt import processor error:', error)
    
    // More detailed error logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: 'Check edge function logs for more information'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processGanttImport(supabase: any, body: GanttImportRequest) {
  console.log(`🚀 Clean slate Gantt import for matter ${body.matterId}`)
  
  // Helper function to convert Excel serial date to ISO date string
  const convertExcelDate = (excelDate: any): string | null => {
    if (!excelDate) return null;
    
    // If it's already a proper date string, return it
    if (typeof excelDate === 'string' && excelDate.includes('-')) {
      return excelDate;
    }
    
    // Convert Excel serial number to date
    const serialNumber = typeof excelDate === 'string' ? parseFloat(excelDate) : excelDate;
    if (isNaN(serialNumber)) return null;
    
    // Excel serial date starts from January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const dateValue = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
    
    return dateValue.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };
  
  try {
    // Suppress adjustment triggers during import to prevent duplicate entries
    console.log('🔇 Suppressing adjustment triggers during import...')

    // Step 1: Copy all existing tasks into temporary storage
    console.log(`📦 Step 1: Copying existing tasks to temporary storage`)
    
    const { data: existingTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        matter_id,
        assigned_to,
        workstream,
        phase,
        status,
        priority,
        commencement_date,
        due_date,
        estimated_total_hours,
        actual_hours,
        order_position,
        created_by,
        task_assignments(
          user_id,
          estimated_hours,
          actual_hours
        )
      `)
      .eq('matter_id', body.matterId)

    if (tasksError) {
      throw new Error(`Could not fetch existing tasks: ${tasksError.message}`)
    }

    console.log(`📋 Found ${existingTasks?.length || 0} existing tasks`)

    // Step 2: Get old task IDs for cleanup
    const { data: oldTaskIds } = await supabase
      .from('tasks')
      .select('id')
      .eq('matter_id', body.matterId)

    const oldIds = oldTaskIds?.map(t => t.id) || []

    // Step 3: Delete related data for old tasks
    console.log(`🗑️ Step 3: Cleaning up related data for ${oldIds.length} old tasks`)
    
    if (oldIds.length > 0) {
      // Delete calendar events linked to old task IDs
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('matter_id', body.matterId)

      if (calendarError) {
        console.warn(`⚠️ Could not delete calendar events: ${calendarError.message}`)
      }

      // Delete notifications linked to old task IDs
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .textSearch('link_url', oldIds.map(id => `task/${id}`).join('|'))

      if (notificationsError) {
        console.warn(`⚠️ Could not delete notifications: ${notificationsError.message}`)
      }

      // Delete task-document links (documents stay linked to matter)
      const { error: docsError } = await supabase
        .from('documents')
        .update({ task_id: null })
        .in('task_id', oldIds)

      if (docsError) {
        console.warn(`⚠️ Could not unlink documents from tasks: ${docsError.message}`)
      }

      // Delete all time entries for old tasks
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .in('task_id', oldIds)

      if (timeEntriesError) {
        console.warn(`⚠️ Could not delete time entries: ${timeEntriesError.message}`)
      }

      // Delete task assignments for old tasks
      const { error: assignmentsError } = await supabase
        .from('task_assignments')
        .delete()
        .in('task_id', oldIds)

      if (assignmentsError) {
        console.warn(`⚠️ Could not delete task assignments: ${assignmentsError.message}`)
      }

      // Delete old tasks
      const { error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .in('id', oldIds)

      if (deleteTasksError) {
        throw new Error(`Could not delete old tasks: ${deleteTasksError.message}`)
      }
    }

    // Step 4: Re-create tasks from import data
    console.log(`🔄 Step 4: Re-creating tasks from import data`)
    
    let createdTasks = 0
    let createdAssignments = 0
    let createdTimeEntries = 0
    const errors = []
    const newTaskIdMap = new Map() // importTaskId -> newTaskId
    const taskDescriptionMap = new Map() // taskTitle -> newTaskId

    // Create tasks first
    for (let i = 0; i < body.tasks.length; i++) {
      try {
        const taskData = body.tasks[i] as any
        const actualHours = parseFloat(taskData['Total Actual Hours'] || taskData.actual_hours) || 0
        const estimatedHours = parseFloat(taskData['Total Estimated Hours'] || taskData.estimated_total_hours) || 0
        
        // Determine status based on actual vs estimated hours
        let status = taskData['Status'] || taskData.status || 'open'
        if (actualHours > 0) {
          if (actualHours >= estimatedHours && estimatedHours > 0) {
            status = 'completed' // Set to 'Completed' if actual >= estimated hours
          } else {
            status = 'in_progress' // Set to 'In Progress' if there are actual hours but not completed
          }
        }
        
        // Convert Excel dates to proper format
        const startDate = convertExcelDate(taskData['Start Date'] || taskData.commencement_date);
        const dueDate = convertExcelDate(taskData['Due Date'] || taskData.due_date);

        // Log the task data being processed for debugging
        console.log(`📝 Processing task ${i + 1}: "${taskData['Task Title'] || taskData.title}"`)
        console.log(`📊 Task data:`, JSON.stringify({
          title: taskData['Task Title'] || taskData.title,
          workstream: taskData['Workstream'] || taskData.workstream,
          phase: taskData['Phase'] || taskData.phase,
          status: status,
          priority: taskData['Priority'] || taskData.priority,
          estimatedHours,
          actualHours,
          startDate,
          dueDate,
          rawStartDate: taskData['Start Date'] || taskData.commencement_date,
          rawDueDate: taskData['Due Date'] || taskData.due_date
        }, null, 2))

        // Generate Task ID if missing
        let taskId = taskData['Task ID'] || taskData.id;
        if (!taskId) {
          taskId = `TASK-${String(i + 1).padStart(4, '0')}`;
          console.log(`🏷️ Generated new Task ID: ${taskId}`);
        }

        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            matter_id: body.matterId,
            title: taskData['Task Title'] || taskData.title || 'Untitled Task',
            description: taskData['Description'] || taskData.description || '',
            workstream: taskData['Workstream'] || taskData.workstream || '',
            phase: taskData['Phase'] || taskData.phase || '',
            status: status,
            priority: taskData['Priority'] || taskData.priority || 'medium',
            assigned_to: taskData['Assigned To ID'] || taskData.assigned_to || null,
            commencement_date: startDate,
            due_date: dueDate,
            order_position: parseInt(taskData['Order Position'] || taskData.order_position) || (i + 1),
            estimated_total_hours: estimatedHours,
            actual_hours: actualHours,
            created_by: null // Ensure this field is set
          })
          .select('id')
          .single()

        if (createError) {
          console.error(`❌ Task creation failed for "${taskData['Task Title'] || taskData.title}":`, createError)
          console.error(`📋 Full error details:`, JSON.stringify(createError, null, 2))
          errors.push(`Task creation failed for ${taskData['Task Title'] || taskData.title}: ${createError.message} (Code: ${createError.code})`)
          continue
        }

        // Map original task ID (or generated one) to new task ID
        const originalTaskId = taskId
        newTaskIdMap.set(originalTaskId, newTask.id)
        
        // Map task title to new task ID for assignment matching
        const taskTitle = taskData['Task Title'] || taskData.title
        if (taskTitle) {
          taskDescriptionMap.set(taskTitle, newTask.id)
        }
        
        createdTasks++

        console.log(`✅ Created task: ${taskTitle} (Status: ${status}) (ID: ${originalTaskId ? 'existing' : 'new'}) (${i + 1}/${body.tasks.length})`)

      } catch (error) {
        errors.push(`Task ${i}: ${error.message}`)
      }
    }

    // Create task assignments and calculate task actual hours
    const taskActualHours = new Map() // taskId -> total actual hours
    
    for (let j = 0; j < body.assignments.length; j++) {
      try {
        const assignmentData = body.assignments[j]
        
        // First try to match by Task ID, then by Task Title
        const taskId = assignmentData['Task ID'] || assignmentData.task_id
        const taskTitle = assignmentData['Task Title'] || assignmentData.task_title
        
        let newTaskId = newTaskIdMap.get(taskId)
        
        // If no match by ID, try matching by task title/description
        if (!newTaskId && taskTitle) {
          newTaskId = taskDescriptionMap.get(taskTitle)
          console.log(`🔍 Matched assignment to task by title: "${taskTitle}" -> ${newTaskId}`)
        }
        
        if (!newTaskId) {
          errors.push(`Assignment skipped - no matching task for ID: ${taskId} or Title: ${taskTitle}`)
          continue
        }

        // Enhanced logging for debugging actual hours
        const rawActualHours = assignmentData['Actual Hours'] || assignmentData.actual_hours
        console.log(`📊 Assignment ${j}: Raw actual hours value: "${rawActualHours}" (type: ${typeof rawActualHours})`)
        
        const actualHours = parseFloat(rawActualHours) || 0
        console.log(`📊 Assignment ${j}: Parsed actual hours: ${actualHours}`)

        // Generate User ID if missing 
        let userId = assignmentData['User ID'] || assignmentData.user_id;
        if (!userId) {
          // Try to find user by name
          const userName = assignmentData['User Name'] || assignmentData.user_name;
          if (userName) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .ilike('full_name', userName)
              .single();
            
            if (existingProfile) {
              userId = existingProfile.id;
              console.log(`🔍 Found existing user ID for ${userName}: ${userId}`);
            } else {
              userId = `USR-${String(j + 1).padStart(4, '0')}`;
              console.log(`🏷️ Generated new User ID for ${userName}: ${userId}`);
            }
          } else {
            userId = `USR-${String(j + 1).padStart(4, '0')}`;
            console.log(`🏷️ Generated new User ID: ${userId}`);
          }
        }

        const { data: newAssignment, error: assignmentError } = await supabase
          .from('task_assignments')
          .insert({
            task_id: newTaskId,
            user_id: userId,
            estimated_hours: parseFloat(assignmentData['Estimated Hours'] || assignmentData.estimated_hours) || 0,
            actual_hours: actualHours
          })
          .select()
          .single()

        if (assignmentError) {
          console.error(`❌ Assignment creation failed for ${assignmentData['User Name']}:`, assignmentError)
          errors.push(`Assignment creation failed: ${assignmentError.message}`)
          continue
        }

        // Track total actual hours per task
        const currentTotal = taskActualHours.get(newTaskId) || 0
        taskActualHours.set(newTaskId, currentTotal + actualHours)

        createdAssignments++

        console.log(`✅ Created assignment: ${assignmentData['User Name'] || 'Unknown User'} -> ${assignmentData['Task Title'] || taskTitle || 'Task'} (Actual: ${actualHours}h) (${j + 1}/${body.assignments.length})`)

        // Create proportional time entries for assignments with actual hours
        if (actualHours > 0) {
          try {
            console.log(`🕒 Creating time entries for ${actualHours} actual hours...`)
            
            // Find the original task data to get proper dates
            const originalTaskData = body.tasks.find((t: any) => 
              (t['Task ID'] || t.id) === (assignmentData['Task ID'] || assignmentData.task_id) ||
              (t['Task Title'] || t.title) === (assignmentData['Task Title'] || assignmentData.task_title)
            );
            
            if (originalTaskData) {
              const taskStartDate = convertExcelDate(originalTaskData['Start Date'] || originalTaskData.commencement_date);
              const taskDueDate = convertExcelDate(originalTaskData['Due Date'] || originalTaskData.due_date);
              
              const timeEntriesCreated = await createProportionalTimeEntries(supabase, {
                id: newTaskId,
                title: originalTaskData['Task Title'] || originalTaskData.title,
                commencement_date: taskStartDate,
                due_date: taskDueDate,
                matter_id: body.matterId
              }, assignmentData['User ID'] || assignmentData.user_id, actualHours)
              
              createdTimeEntries += timeEntriesCreated
              console.log(`✅ Created ${timeEntriesCreated} time entries for ${actualHours} hours`)
            } else {
              console.log(`⚠️ Original task data not found for time entry creation`)
            }
          } catch (timeEntryError) {
            console.error(`❌ Failed to create time entries for assignment ${j}:`, timeEntryError)
            errors.push(`Time entry creation failed for assignment ${j}: ${timeEntryError.message}`)
          }
        } else {
          console.log(`⏭️ Skipping time entries - no actual hours (${actualHours})`)
        }

      } catch (error) {
        console.error(`❌ Assignment processing error:`, error)
        errors.push(`Assignment error: ${error.message}`)
      }
    }

    // Update task actual hours based on assignments
    console.log(`📊 Updating task actual hours from assignments`)
    for (const [taskId, totalHours] of taskActualHours.entries()) {
      try {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ actual_hours: totalHours })
          .eq('id', taskId)

        if (updateError) {
          console.error(`Failed to update actual hours for task ${taskId}:`, updateError)
          errors.push(`Failed to update actual hours for task: ${updateError.message}`)
        } else {
          console.log(`✅ Updated task ${taskId} actual hours to ${totalHours}`)
        }
      } catch (error) {
        console.error(`Error updating task actual hours:`, error)
        errors.push(`Error updating task actual hours: ${error.message}`)
      }
    }

    // Step 5: Create new calendar events and notifications for the new tasks
    console.log(`📅 Step 5: Creating new calendar events and notifications`)
    
    for (const [originalTaskId, newTaskId] of newTaskIdMap.entries()) {
      try {
        // Find the original task data and convert dates
        const taskData = body.tasks.find((t: any) => 
          (t['Task ID'] || t.id) === originalTaskId || 
          body.tasks.indexOf(t) === parseInt(originalTaskId.replace('new_task_', ''))
        )
        
        if (taskData) {
          const taskStartDate = convertExcelDate(taskData['Start Date'] || taskData.commencement_date);
          const taskDueDate = convertExcelDate(taskData['Due Date'] || taskData.due_date);
          
          if (taskStartDate) {
            // Create calendar event for task
            await supabase
              .from('calendar_events')
              .insert({
                title: `${taskData['Workstream'] || taskData.workstream || 'Task'}: ${taskData['Task Title'] || taskData.title}`,
                description: `Imported task for matter`,
                start_time: taskStartDate,
                end_time: taskDueDate || taskStartDate,
                matter_id: body.matterId,
                attendees: (taskData['Assigned To ID'] || taskData.assigned_to) ? [taskData['Assigned To ID'] || taskData.assigned_to] : []
              });

            // Create notification for assigned user
            if (taskData['Assigned To ID'] || taskData.assigned_to) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: taskData['Assigned To ID'] || taskData.assigned_to,
                  title: 'Task Imported',
                  message: `Task "${taskData['Task Title'] || taskData.title}" has been imported with new schedule`,
                  link_url: `/dashboard/matter/${body.matterId}/task/${newTaskId}`
                });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not create calendar event/notification for task: ${error.message}`);
      }
    }

    console.log(`🎉 Gantt import completed successfully!`);
    console.log(`📊 Summary: Created ${createdTasks} tasks, ${createdAssignments} assignments, ${createdTimeEntries} time entries with ${errors.length} errors`);
    
    // Re-enable adjustment triggers after import
    console.log('🔊 Re-enabling adjustment triggers...')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        tasksCreated: createdTasks,
        assignmentsCreated: createdAssignments,
        timeEntriesCreated: createdTimeEntries,
        errors: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`💥 Fatal error in Gantt import:`, error);
    
    // Re-enable adjustment triggers even on error
    console.log('🔊 Re-enabling adjustment triggers after error...')
    try {
    } catch (configError) {
      console.warn('Could not reset trigger configuration:', configError);
    }
    
    throw error;
  }
}

async function createProportionalTimeEntries(
  supabase: any, 
  task: any, 
  userId: string, 
  totalHours: number
): Promise<number> {
  try {
    if (totalHours <= 0) {
      console.log(`⏭️ Skipping time entries for task ${task.title} - no actual hours (${totalHours})`)
      return 0;
    }

    console.log(`🕒 Creating time entries for task ${task.title}, user ${userId}, total hours: ${totalHours}`)

    // Get user hourly rate
    const { data: profile } = await supabase
      .from('profiles')
      .select('hourly_rate')
      .eq('id', userId)
      .single();

    const { data: matter } = await supabase
      .from('matters')
      .select('hourly_rate')
      .eq('id', task.matter_id)
      .single();

    const hourlyRate = profile?.hourly_rate || matter?.hourly_rate || 0;
    console.log(`💰 Using hourly rate: ${hourlyRate} (profile: ${profile?.hourly_rate}, matter: ${matter?.hourly_rate})`)

    // Handle case where task has no dates - use current date
    if (!task.commencement_date) {
      console.log(`📅 No task start date, creating single time entry for current date`)
      
      const { error: timeEntryError } = await supabase
        .from('time_entries')
        .insert({
          matter_id: task.matter_id,
          task_id: task.id,
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          hours: totalHours,
          description: `Imported hours for ${task.title}`,
          hourly_rate: hourlyRate,
          billable: true,
          source: 'import'
        });

      if (timeEntryError) {
        console.error(`❌ Failed to create single time entry: ${timeEntryError.message}`);
        throw timeEntryError;
      }

      console.log(`✅ Created single time entry: ${totalHours} hours`)
      return 1;
    }

    const startDate = new Date(task.commencement_date);
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
    const hoursPerMonth = totalHours / monthlyPeriods.length;
    
    console.log(`📊 Creating ${monthlyPeriods.length} monthly time entries with ${hoursPerMonth.toFixed(2)} hours each`)
    
    let entriesCreated = 0;
    
    // Create time entry for each month
    for (const monthStart of monthlyPeriods) {
      const entryDate = monthStart.toISOString().split('T')[0];
      
      const { error: timeEntryError } = await supabase
        .from('time_entries')
        .insert({
          matter_id: task.matter_id,
          task_id: task.id,
          user_id: userId,
          date: entryDate,
          hours: hoursPerMonth,
          description: `Imported hours for ${task.title} (${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
          hourly_rate: hourlyRate,
          billable: true,
          source: 'import'
        });

      if (timeEntryError) {
        console.error(`❌ Failed to create time entry for ${entryDate}: ${timeEntryError.message}`);
        throw timeEntryError;
      }

      entriesCreated++;
      console.log(`✅ Created time entry for ${entryDate}: ${hoursPerMonth.toFixed(2)} hours`)
    }

    console.log(`🎯 Successfully created ${entriesCreated} time entries for task ${task.title}`)
    return entriesCreated;
    
  } catch (error) {
    console.error(`💥 Error creating proportional time entries for task ${task.title}:`, error);
    throw error;
  }
}