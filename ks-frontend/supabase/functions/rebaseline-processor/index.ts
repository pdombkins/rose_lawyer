import { requireAdmin, corsHeaders, ksRecompute } from '../_shared/ksGuard.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"


interface RebaselineRequest {
  action: 'start' | 'process_workstream' | 'status'
  matterId: string
  rebaselineDate: string
  workstream?: string
  resetActualHours?: boolean
  jobId?: string
}

interface RebaselineJob {
  id: string
  matterId: string
  rebaselineDate: string
  resetActualHours: boolean
  status: 'pending' | 'processing' | 'completed' | 'failed'
  workstreamsProcessed: string[]
  totalWorkstreams: number
  updatedTasks: number
  errors: string[]
  createdAt: string
  updatedAt: string
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

    const body: RebaselineRequest = await req.json()
    console.log('Rebaseline request:', body)

    switch (body.action) {
      case 'start':
        return await startRebaseline(supabase, body)
      case 'process_workstream':
        return await processWorkstream(supabase, body)
      case 'status':
        return await getStatus(supabase, body.jobId!)
      default:
        throw new Error(`Unknown action: ${body.action}`)
    }

  } catch (error) {
    console.error('Rebaseline processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startRebaseline(supabase: any, body: RebaselineRequest) {
  const jobId = crypto.randomUUID()
  
  // Get matter details
  const { data: matter, error: matterError } = await supabase
    .from('matters')
    .select('id, title, start_date')
    .eq('id', body.matterId)
    .single()

  if (matterError || !matter) {
    throw new Error(`Could not find matter: ${matterError?.message || 'Not found'}`)
  }

  // Get distinct workstreams for this matter
  const { data: workstreams, error: workstreamsError } = await supabase
    .from('tasks')
    .select('workstream')
    .eq('matter_id', body.matterId)
    .not('workstream', 'is', null)

  if (workstreamsError) {
    throw new Error(`Could not fetch workstreams: ${workstreamsError.message}`)
  }

  const uniqueWorkstreams = [...new Set(workstreams.map((w: any) => w.workstream))]
  console.log(`Found ${uniqueWorkstreams.length} workstreams for matter ${matter.title}:`, uniqueWorkstreams)

  // Create job record in system_settings
  const job: RebaselineJob = {
    id: jobId,
    matterId: body.matterId,
    rebaselineDate: body.rebaselineDate,
    resetActualHours: body.resetActualHours || false,
    status: 'pending',
    workstreamsProcessed: [],
    totalWorkstreams: uniqueWorkstreams.length,
    updatedTasks: 0,
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const { error: jobError } = await supabase
    .from('system_settings')
    .upsert({
      name: `rebaseline_job_${jobId}`,
      category: 'rebaseline_jobs',
      value: JSON.stringify(job),
      description: `Rebaseline job for matter ${matter.title}`
    })

  if (jobError) {
    throw new Error(`Could not create job: ${jobError.message}`)
  }

  // Start processing workstreams in background
  const processPromises = uniqueWorkstreams.map(workstream => 
    processWorkstreamBackground(supabase, jobId, body.matterId, body.rebaselineDate, workstream, body.resetActualHours || false)
  )

  // Use EdgeRuntime.waitUntil to ensure processing continues after response
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(Promise.all(processPromises))
  } else {
    // Fallback for local development
    Promise.all(processPromises).catch(console.error)
  }

  return new Response(
    JSON.stringify({ 
      jobId,
      message: `Started rebaseline job for ${uniqueWorkstreams.length} workstreams`,
      workstreams: uniqueWorkstreams
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function processWorkstreamBackground(supabase: any, jobId: string, matterId: string, rebaselineDate: string, workstream: string, resetActualHours: boolean) {
  try {
    console.log(`Processing workstream: ${workstream} for job ${jobId}`)
    
    // Get job
    const { data: jobSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('name', `rebaseline_job_${jobId}`)
      .single()

    if (!jobSetting) {
      throw new Error(`Job ${jobId} not found`)
    }

    const job: RebaselineJob = JSON.parse(jobSetting.value)
    
    // Update job status
    job.status = 'processing'
    job.updatedAt = new Date().toISOString()

    await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(job) })
      .eq('name', `rebaseline_job_${jobId}`)

    // Process this workstream
    const result = await processWorkstreamTasks(supabase, matterId, rebaselineDate, workstream, resetActualHours)
    
    // Update job with results
    job.workstreamsProcessed.push(workstream)
    job.updatedTasks += result.updatedTasks
    if (result.errors.length > 0) {
      job.errors.push(...result.errors)
    }
    
    // Check if all workstreams are done
    if (job.workstreamsProcessed.length >= job.totalWorkstreams) {
      job.status = job.errors.length > 0 ? 'completed' : 'completed'
      
      // Update matter start date
      const { error: matterUpdateError } = await supabase
        .from('matters')
        .update({ start_date: rebaselineDate })
        .eq('id', matterId)

      if (matterUpdateError) {
        job.errors.push(`Could not update matter start date: ${matterUpdateError.message}`)
      }

      // Create system notification for completion
      try {
        const { data: matter } = await supabase
          .from('matters')
          .select('title, lead_partner_id')
          .eq('id', matterId)
          .single()

        if (matter && matter.lead_partner_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: matter.lead_partner_id,
              title: 'Rebaseline Complete',
              message: `Matter "${matter.title}" has been successfully rebaselined with ${job.updatedTasks} tasks updated across ${job.totalWorkstreams} workstreams.`,
              link_url: `/dashboard/matter/${matterId}`
            })
        }
      } catch (notificationError) {
        console.warn(`Could not create completion notification: ${notificationError.message}`)
      }
    }
    
    job.updatedAt = new Date().toISOString()

    await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(job) })
      .eq('name', `rebaseline_job_${jobId}`)

    console.log(`Completed workstream ${workstream} for job ${jobId}. Updated ${result.updatedTasks} tasks.`)

  } catch (error) {
    console.error(`Error processing workstream ${workstream}:`, error)
    
    // Update job with error
    const { data: jobSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('name', `rebaseline_job_${jobId}`)
      .single()

    if (jobSetting) {
      const job: RebaselineJob = JSON.parse(jobSetting.value)
      job.status = 'failed'
      job.errors.push(`Workstream ${workstream}: ${error.message}`)
      job.updatedAt = new Date().toISOString()

      await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(job) })
        .eq('name', `rebaseline_job_${jobId}`)
    }
  }
}

async function processWorkstream(supabase: any, body: RebaselineRequest) {
  if (!body.workstream) {
    throw new Error('Workstream is required for process_workstream action')
  }

  const result = await processWorkstreamTasks(supabase, body.matterId, body.rebaselineDate, body.workstream, body.resetActualHours || false)
  
  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function processWorkstreamTasks(supabase: any, matterId: string, rebaselineDate: string, workstream: string, resetActualHours: boolean) {
  console.log(`🚀 Clean slate rebaseline for workstream ${workstream} in matter ${matterId}`)
  
  // Get matter details
  const { data: matter } = await supabase
    .from('matters')
    .select('start_date')
    .eq('id', matterId)
    .single()

  if (!matter) {
    throw new Error('Matter not found')
  }

  // Calculate the date shift
  const originalStartDate = new Date(matter.start_date)
  const newStartDate = new Date(rebaselineDate)
  const dayDifference = Math.floor((newStartDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24))

  console.log(`📅 Date shift: ${dayDifference} days for workstream ${workstream}`)

  try {
    // Step 1: Copy all existing tasks for this workstream into temporary storage
    console.log(`📦 Step 1: Copying existing tasks to temporary storage`)
    
    const { data: existingTasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
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
      .eq('matter_id', matterId)
      .eq('workstream', workstream)

    if (tasksError) {
      throw new Error(`Could not fetch tasks for workstream ${workstream}: ${tasksError.message}`)
    }

    if (!existingTasks || existingTasks.length === 0) {
      console.log(`ℹ️ No tasks found for workstream ${workstream}`)
      return { updatedTasks: 0, errors: [] }
    }

    console.log(`📋 Found ${existingTasks.length} tasks to process`)

    // Step 2: Get old task IDs for cleanup
    const { data: oldTaskIds } = await supabase
      .from('tasks')
      .select('id')
      .eq('matter_id', matterId)
      .eq('workstream', workstream)

    const oldIds = oldTaskIds?.map(t => t.id) || []

    // Step 3: Delete related data for old tasks
    console.log(`🗑️ Step 3: Cleaning up related data for ${oldIds.length} old tasks`)
    
    if (oldIds.length > 0) {
      // Delete calendar events linked to old task IDs
      const { error: calendarError } = await supabase
        .from('calendar_events')
        .delete()
        .in('matter_id', [matterId])
        .or(`title.ilike.%${workstream}%,description.ilike.%${workstream}%`)

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

    // Step 4: Re-create tasks with adjusted dates
    console.log(`🔄 Step 4: Re-creating tasks with adjusted dates`)
    
    let updatedTasks = 0
    const errors = []
    const newTaskIdMap = new Map() // oldTaskIndex -> newTaskId

    for (let i = 0; i < existingTasks.length; i++) {
      try {
        const task = existingTasks[i]
        
        // Calculate new dates
        let newCommencementDate = task.commencement_date
        let newDueDate = task.due_date

        if (task.commencement_date) {
          const originalCommencementDate = new Date(task.commencement_date)
          const adjustedCommencementDate = new Date(originalCommencementDate.getTime() + (dayDifference * 24 * 60 * 60 * 1000))
          newCommencementDate = formatDate(adjustedCommencementDate)
        }
        
        if (task.due_date) {
          const originalDueDate = new Date(task.due_date)
          const adjustedDueDate = new Date(originalDueDate.getTime() + (dayDifference * 24 * 60 * 60 * 1000))
          adjustedDueDate.setUTCHours(12, 0, 0, 0)
          newDueDate = adjustedDueDate.toISOString()
        }
        
        // Handle support tasks without dates (typically the last 3 tasks)
        if (!task.commencement_date && task.order_position >= 35) {
          const supportStartDate = new Date(newStartDate)
          const supportEndDate = new Date(newStartDate)
          supportEndDate.setDate(supportEndDate.getDate() + 30)
          
          newCommencementDate = formatDate(supportStartDate)
          newDueDate = supportEndDate.toISOString()
        }

        // Determine status based on actual hours
        const actualHours = resetActualHours ? 0 : task.actual_hours
        const newStatus = actualHours === 0 ? 'open' : task.status

        // Create new task
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            title: task.title,
            description: task.description,
            matter_id: task.matter_id,
            assigned_to: task.assigned_to,
            workstream: task.workstream,
            phase: task.phase,
            status: newStatus,
            priority: task.priority,
            commencement_date: newCommencementDate,
            due_date: newDueDate,
            estimated_total_hours: task.estimated_total_hours,
            actual_hours: actualHours,
            order_position: task.order_position,
            created_by: task.created_by
          })
          .select('id')
          .single()

        if (createError) {
          errors.push(`Task recreation failed for ${task.title}: ${createError.message}`)
          continue
        }

        newTaskIdMap.set(i, newTask.id)
        updatedTasks++

        // Re-create task assignments
        if (task.task_assignments && task.task_assignments.length > 0) {
          const newAssignments = task.task_assignments.map(assignment => ({
            task_id: newTask.id,
            user_id: assignment.user_id,
            estimated_hours: assignment.estimated_hours,
            actual_hours: resetActualHours ? 0 : assignment.actual_hours
          }))

          const { error: assignmentError } = await supabase
            .from('task_assignments')
            .insert(newAssignments)

          if (assignmentError) {
            errors.push(`Task assignment recreation failed for ${task.title}: ${assignmentError.message}`)
          } else if (!resetActualHours) {
            // Create proportional time entries for assignments with actual hours
            for (const assignment of task.task_assignments) {
              if (assignment.actual_hours > 0) {
                await createProportionalTimeEntries(supabase, {
                  id: newTask.id,
                  title: task.title,
                  commencement_date: newCommencementDate,
                  due_date: newDueDate,
                  matter_id: matterId
                }, assignment.user_id, assignment.actual_hours)
              }
            }
          }
        }

        console.log(`✅ Recreated task: ${task.title} (${i + 1}/${existingTasks.length})`)

      } catch (error) {
        errors.push(`Task ${i}: ${error.message}`)
      }
    }

    // Step 5: Create new calendar events and notifications for the new tasks
    console.log(`📅 Step 5: Creating new calendar events and notifications`)
    
    for (let i = 0; i < existingTasks.length; i++) {
      const task = existingTasks[i]
      const newTaskId = newTaskIdMap.get(i)
      
      if (newTaskId && task.commencement_date) {
        try {
          // Create calendar event for task
          await supabase
            .from('calendar_events')
            .insert({
              title: `${task.workstream}: ${task.title}`,
              description: `Rebaselined task for matter`,
              start_time: task.commencement_date,
              end_time: task.due_date || task.commencement_date,
              matter_id: matterId,
              attendees: task.assigned_to ? [task.assigned_to] : []
            })

          // Create notification for assigned user
          if (task.assigned_to) {
            await supabase
              .from('notifications')
              .insert({
                user_id: task.assigned_to,
                title: 'Task Rebaselined',
                message: `Task "${task.title}" has been rebaselined with new dates`,
                link_url: `/dashboard/matter/${matterId}/task/${newTaskId}`
              })
          }
        } catch (error) {
          console.warn(`⚠️ Could not create calendar event/notification for task ${task.title}: ${error.message}`)
        }
      }
    }

    console.log(`🎉 Workstream ${workstream}: Successfully processed ${updatedTasks} tasks with ${errors.length} errors`)
    
    return { updatedTasks, errors }

  } catch (error) {
    console.error(`💥 Fatal error in workstream ${workstream}:`, error)
    throw error
  }
}

async function createProportionalTimeEntries(
  supabase: any, 
  task: any, 
  userId: string, 
  totalHours: number
) {
  try {
    if (totalHours <= 0) return;

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
    
    console.log(`Creating ${monthlyPeriods.length} monthly time entries for task ${task.title} with ${hoursPerMonth} hours each`);
    
    // Create time entry for each month
    for (const monthStart of monthlyPeriods) {
      const { error: timeEntryError } = await supabase
        .from('time_entries')
        .insert({
          matter_id: task.matter_id,
          task_id: task.id,
          user_id: userId,
          date: monthStart.toISOString().split('T')[0], // First day of month
          hours: hoursPerMonth,
          description: `Rebaseline hours for ${task.title} (${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
          hourly_rate: hourlyRate,
          billable: true,
          source: 'rebaseline'
        });

      if (timeEntryError) {
        console.error(`Failed to create time entry for ${monthStart.toISOString().split('T')[0]}: ${timeEntryError.message}`);
        throw timeEntryError;
      }
    }
  } catch (error) {
    console.error(`Error creating proportional time entries:`, error);
    throw error;
  }
}

async function getStatus(supabase: any, jobId: string) {
  const { data: jobSetting, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('name', `rebaseline_job_${jobId}`)
    .single()

  if (error || !jobSetting) {
    throw new Error(`Job ${jobId} not found`)
  }

  const job: RebaselineJob = JSON.parse(jobSetting.value)
  
  return new Response(
    JSON.stringify(job),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function formatDate(date: Date): string {
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0')
}