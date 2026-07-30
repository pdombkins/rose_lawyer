import { requireAdmin, corsHeaders, ksRecompute } from '../_shared/ksGuard.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"


interface ResetRequest {
  action: 'start' | 'process_table' | 'status'
  resetDate: string
  jobId?: string
  tableName?: string
}

interface ResetJob {
  id: string
  resetDate: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  tablesProcessed: string[]
  totalTables: number
  recordsDeleted: number
  errors: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Tables a term reset clears. Deliberately scoped to STUDENT WORK.
 *
 * `matters`, `clients` and `client_contacts` were in this list before the
 * merge and have been removed, for two reasons:
 *
 *  1. They are the case study. Deleting them leaves the next cohort with an
 *     empty firm and nothing to work on.
 *  2. Post-merge, ks.matter_groups and ks.matter_members hold FKs to
 *     ks.matters ON DELETE CASCADE. Deleting a matter therefore destroys the
 *     group-to-matter mapping and every student's provisioning — silently.
 *     The deletion is filtered on `created_at > resetDate`, so with a sensible
 *     term date the matters (created Aug-Sep 2025) survive anyway; but an
 *     early date would have wiped the mapping with no warning.
 *
 * To genuinely retire a matter, do it deliberately through the instructor
 * console, not through a term reset.
 */
const TABLES_TO_RESET = [
  'time_entries',
  'task_assignments',
  'tasks',
  'documents',
  'calendar_events',
  'notifications'
]

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

    const body: ResetRequest = await req.json()
    console.log('Reset processor request:', body)

    switch (body.action) {
      case 'start':
        return await startReset(supabase, body)
      case 'process_table':
        return await processTable(supabase, body)
      case 'status':
        return await getStatus(supabase, body.jobId!)
      default:
        throw new Error(`Unknown action: ${body.action}`)
    }

  } catch (error) {
    console.error('Reset processor error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function startReset(supabase: any, body: ResetRequest) {
  const jobId = crypto.randomUUID()
  
  console.log(`Starting reset to base with ${TABLES_TO_RESET.length} tables for date ${body.resetDate}`)

  // Create job record in system_settings
  const job: ResetJob = {
    id: jobId,
    resetDate: body.resetDate,
    status: 'pending',
    tablesProcessed: [],
    totalTables: TABLES_TO_RESET.length,
    recordsDeleted: 0,
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const { error: jobError } = await supabase
    .from('system_settings')
    .upsert({
      name: `reset_job_${jobId}`,
      category: 'reset_jobs',
      value: JSON.stringify(job),
      description: `Reset to base job for date ${body.resetDate}`
    })

  if (jobError) {
    throw new Error(`Could not create job: ${jobError.message}`)
  }

  // Start processing tables in background
  const processPromises = TABLES_TO_RESET.map(tableName => 
    processTableBackground(supabase, jobId, body.resetDate, tableName)
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
      message: `Started reset job for ${TABLES_TO_RESET.length} tables`,
      tables: TABLES_TO_RESET
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function processTableBackground(supabase: any, jobId: string, resetDate: string, tableName: string) {
  try {
    console.log(`Processing table: ${tableName} for job ${jobId}`)
    
    // Get job
    const { data: jobSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('name', `reset_job_${jobId}`)
      .single()

    if (!jobSetting) {
      throw new Error(`Job ${jobId} not found`)
    }

    const job: ResetJob = JSON.parse(jobSetting.value)
    
    // Update job status
    job.status = 'processing'
    job.updatedAt = new Date().toISOString()

    await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(job) })
      .eq('name', `reset_job_${jobId}`)

    // Process this table
    const result = await processTableReset(supabase, resetDate, tableName)
    
    // Update job with results
    job.tablesProcessed.push(tableName)
    job.recordsDeleted += result.recordsDeleted
    if (result.error) {
      job.errors.push(`Table ${tableName}: ${result.error}`)
    }
    
    // Check if all tables are done
    if (job.tablesProcessed.length >= job.totalTables) {
      job.status = job.errors.length > 0 ? 'completed' : 'completed'
    }
    
    job.updatedAt = new Date().toISOString()

    await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(job) })
      .eq('name', `reset_job_${jobId}`)

    console.log(`Completed table ${tableName} for job ${jobId}. Deleted ${result.recordsDeleted} records.`)

  } catch (error) {
    console.error(`Error processing table ${tableName}:`, error)
    
    // Update job with error
    const { data: jobSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('name', `reset_job_${jobId}`)
      .single()

    if (jobSetting) {
      const job: ResetJob = JSON.parse(jobSetting.value)
      job.status = 'failed'
      job.errors.push(`Table ${tableName}: ${error.message}`)
      job.updatedAt = new Date().toISOString()

      await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(job) })
        .eq('name', `reset_job_${jobId}`)
    }
  }
}

async function processTable(supabase: any, body: ResetRequest) {
  if (!body.tableName) {
    throw new Error('Table name is required for process_table action')
  }

  const result = await processTableReset(supabase, body.resetDate, body.tableName)
  
  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function processTableReset(supabase: any, resetDate: string, tableName: string) {
  console.log(`Processing table ${tableName} for reset date ${resetDate}`)
  
  let recordsDeleted = 0
  let error = null

  try {
    // First try deleting by created_at
    const { data: deletedByCreated, error: createdError } = await supabase
      .from(tableName)
      .delete()
      .gt('created_at', resetDate)

    if (!createdError) {
      recordsDeleted += deletedByCreated?.length || 0
    }

    // Then try deleting by updated_at (for records that existed but were modified)
    const { data: deletedByUpdated, error: updatedError } = await supabase
      .from(tableName)
      .delete()
      .gt('updated_at', resetDate)

    if (!updatedError) {
      recordsDeleted += deletedByUpdated?.length || 0
    }

    // If both operations had errors, record the first one
    if (createdError && updatedError) {
      error = createdError.message
      console.warn(`Warning: Could not reset table ${tableName}:`, createdError.message)
    } else if (createdError) {
      console.warn(`Warning: Could not reset table ${tableName} by created_at:`, createdError.message)
    } else if (updatedError) {
      console.warn(`Warning: Could not reset table ${tableName} by updated_at:`, updatedError.message)
    }

  } catch (e) {
    error = e.message
    console.error(`Error resetting table ${tableName}:`, e)
  }

  console.log(`Table ${tableName}: Deleted ${recordsDeleted} records`)
  
  return { recordsDeleted, error }
}

async function getStatus(supabase: any, jobId: string) {
  const { data: jobSetting, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('name', `reset_job_${jobId}`)
    .single()

  if (error || !jobSetting) {
    throw new Error(`Job ${jobId} not found`)
  }

  const job: ResetJob = JSON.parse(jobSetting.value)
  
  return new Response(
    JSON.stringify(job),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}