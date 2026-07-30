import { requireAdmin, corsHeaders, json, ksRecompute } from '../_shared/ksGuard.ts'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * Hours prefill — distributes each assignment's estimated hours across the
 * months a task spans, creating idempotent `prefill` time entries.
 *
 * RECOVERED 30 Jul 2026. This function was live in the old Lovable Supabase
 * project (version 24) but was absent from the code export, so it existed in
 * exactly one place and would have been destroyed with that project. Source
 * retrieved via the Management API, then ported:
 *
 *   · verify_jwt + instructor-only (was unauthenticated service-role)
 *   · `ks` schema
 *   · the old per-row `actual_hours` / `status` writes now finish with one
 *     ks.recompute() call, because the 27-trigger cascade they relied on no
 *     longer exists
 *
 * Job state still lives as JSON in ks.system_settings (category
 * `hours_jobs`) — unchanged from the original to limit the size of this port.
 * Moving it to a proper ks.jobs table is noted in the gaps plan.
 */

interface HoursRequest {
  action: 'start' | 'process_workstream' | 'status'
  matterIds: string[]
  prefillDate: string
  jobId?: string
  workstream?: string
}

interface HoursJob {
  id: string
  matterIds: string[]
  prefillDate: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  workstreamsProcessed: string[]
  totalWorkstreams: number
  assignmentsUpdated: number
  timeEntriesCreated: number
  errors: string[]
  createdAt: string
  updatedAt: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Instructor-only. Was verify_jwt:false + service-role — i.e. anyone.
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response
  const supabase = guard.admin

  try {
    const body: HoursRequest = await req.json()
    switch (body.action) {
      case 'start':
        return await startHoursProcessing(supabase, body)
      case 'process_workstream':
        return await processWorkstream(supabase, body)
      case 'status':
        return await getStatus(supabase, body.jobId!)
      default:
        throw new Error(`Unknown action: ${body.action}`)
    }
  } catch (error) {
    console.error('Hours processor error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})

async function startHoursProcessing(supabase: any, body: HoursRequest) {
  const jobId = crypto.randomUUID()

  const { data: workstreams, error: wsErr } = await supabase
    .from('tasks')
    .select('workstream')
    .in('matter_id', body.matterIds)
    .not('workstream', 'is', null)

  if (wsErr) throw new Error(`Could not fetch workstreams: ${wsErr.message}`)

  const unique = [...new Set((workstreams ?? []).map((w: any) => w.workstream))]
  if (unique.length === 0) unique.push('__ALL__')

  const job: HoursJob = {
    id: jobId,
    matterIds: body.matterIds,
    prefillDate: body.prefillDate,
    status: 'pending',
    workstreamsProcessed: [],
    totalWorkstreams: unique.length,
    assignmentsUpdated: 0,
    timeEntriesCreated: 0,
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const { error: jobErr } = await supabase.from('system_settings').upsert({
    name: `hours_job_${jobId}`,
    category: 'hours_jobs',
    value: JSON.stringify(job),
    description: `Hours processing job for ${body.matterIds.length} matters`,
  })
  if (jobErr) throw new Error(`Could not create job: ${jobErr.message}`)

  const work = unique.map((ws) =>
    processWorkstreamBackground(supabase, jobId, body.matterIds, body.prefillDate, ws as string),
  )
  // Keep processing after the response is returned.
  if (typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function') {
    ;(globalThis as any).EdgeRuntime.waitUntil(Promise.all(work))
  } else {
    Promise.all(work).catch(console.error)
  }

  return json({
    jobId,
    message: `Started hours processing job for ${unique.length} workstreams`,
    workstreams: unique,
  })
}

async function readJob(supabase: any, jobId: string): Promise<HoursJob> {
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('name', `hours_job_${jobId}`)
    .single()
  if (!data) throw new Error(`Job ${jobId} not found`)
  return JSON.parse(data.value) as HoursJob
}

async function writeJob(supabase: any, job: HoursJob): Promise<void> {
  job.updatedAt = new Date().toISOString()
  await supabase
    .from('system_settings')
    .update({ value: JSON.stringify(job) })
    .eq('name', `hours_job_${job.id}`)
}

async function processWorkstreamBackground(
  supabase: any,
  jobId: string,
  matterIds: string[],
  prefillDate: string,
  workstream: string,
) {
  try {
    const job = await readJob(supabase, jobId)
    job.status = 'processing'
    await writeJob(supabase, job)

    const result = await processWorkstreamHours(supabase, matterIds, prefillDate, workstream)

    // Re-read to avoid clobbering a sibling workstream's counters.
    const fresh = await readJob(supabase, jobId)
    if (!fresh.workstreamsProcessed.includes(workstream)) {
      fresh.workstreamsProcessed.push(workstream)
    }
    fresh.assignmentsUpdated += result.assignmentsUpdated
    fresh.timeEntriesCreated += result.timeEntriesCreated
    if (result.errors.length) fresh.errors.push(...result.errors)
    if (fresh.workstreamsProcessed.length >= fresh.totalWorkstreams) {
      fresh.status = 'completed'
      // One recompute for the whole job, instead of the old per-row cascade.
      await ksRecompute(supabase, null, matterIds)
    }
    await writeJob(supabase, fresh)
  } catch (error) {
    console.error(`Error processing workstream ${workstream}:`, error)
    try {
      const job = await readJob(supabase, jobId)
      job.status = 'failed'
      job.errors.push(`Workstream ${workstream}: ${(error as Error).message}`)
      await writeJob(supabase, job)
    } catch { /* job row already gone */ }
  }
}

async function processWorkstream(supabase: any, body: HoursRequest) {
  if (!body.workstream) throw new Error('Workstream is required for process_workstream')
  const result = await processWorkstreamHours(
    supabase, body.matterIds, body.prefillDate, body.workstream,
  )
  await ksRecompute(supabase, null, body.matterIds)
  return json(result)
}

function monthlyPeriods(start: Date, end: Date): Date[] {
  const periods: Date[] = []
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (current <= last) {
    periods.push(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }
  if (periods.length === 0) periods.push(new Date(start.getFullYear(), start.getMonth(), 1))
  return periods
}

async function processWorkstreamHours(
  supabase: any,
  matterIds: string[],
  prefillDate: string,
  workstream: string,
) {
  let assignmentsUpdated = 0
  let timeEntriesCreated = 0
  const errors: string[] = []

  const targetDate = new Date(prefillDate)
  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
  const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

  for (const matterId of matterIds) {
    try {
      const { data: matter } = await supabase
        .from('matters').select('hourly_rate').eq('id', matterId).single()

      let q = supabase
        .from('tasks')
        .select(`
          id, title, matter_id, workstream, status, commencement_date, due_date,
          task_assignments(id, user_id, estimated_hours, actual_hours)
        `)
        .eq('matter_id', matterId)
      if (workstream !== '__ALL__') q = q.eq('workstream', workstream)

      const { data: tasks, error: tasksErr } = await q
      if (tasksErr) throw new Error(`Could not fetch tasks: ${tasksErr.message}`)
      if (!tasks?.length) continue

      for (const task of tasks) {
        try {
          if (!task.commencement_date) continue
          const startDate = new Date(task.commencement_date)
          const endDate = task.due_date ? new Date(task.due_date) : startDate
          // Only tasks active during the target month.
          if (endDate < monthStart || startDate > monthEnd) continue

          const periods = monthlyPeriods(startDate, endDate)
          if (!task.task_assignments?.length) continue

          for (const assignment of task.task_assignments) {
            try {
              const perMonth = Number(assignment.estimated_hours || 0) / periods.length
              if (perMonth <= 0) continue

              const { data: profile } = await supabase
                .from('profiles').select('hourly_rate').eq('id', assignment.user_id).single()
              const rate = profile?.hourly_rate ?? matter?.hourly_rate ?? 0

              for (const period of periods) {
                const entryDate = periods.length > 1
                  ? period.toISOString().split('T')[0]
                  : task.commencement_date

                // Idempotent: one prefill entry per task+user+date.
                const { data: existing } = await supabase
                  .from('time_entries')
                  .select('id')
                  .eq('task_id', task.id)
                  .eq('user_id', assignment.user_id)
                  .eq('date', entryDate)
                  .eq('source', 'prefill')
                  .limit(1)
                if (existing?.length) continue

                const label = new Date(entryDate).toLocaleDateString('en-AU', {
                  month: 'short', year: 'numeric',
                })
                const { error: insErr } = await supabase.from('time_entries').insert({
                  matter_id: matterId,
                  task_id: task.id,
                  user_id: assignment.user_id,
                  date: entryDate,
                  hours: perMonth,
                  description: `Pre-filled hours for ${task.title} (${label})`,
                  hourly_rate: rate,
                  billable: true,
                  source: 'prefill',
                })
                if (insErr) {
                  errors.push(`Task ${task.title} ${entryDate}: ${insErr.message}`)
                  continue
                }
                timeEntriesCreated++
              }

              assignmentsUpdated++
            } catch (inner) {
              errors.push(`Task ${task.title}: ${(inner as Error).message}`)
            }
          }
        } catch (taskErr) {
          errors.push(`Matter ${matterId} task error: ${(taskErr as Error).message}`)
        }
      }
    } catch (error) {
      errors.push(`Matter ${matterId}: ${(error as Error).message}`)
    }
  }

  // The original wrote task_assignments.actual_hours and tasks.status/actual_hours
  // by hand here, then leaned on the trigger cascade. ks.recompute() derives all
  // of that from the ledger in one pass, so those writes are gone.
  return { assignmentsUpdated, timeEntriesCreated, errors }
}

async function getStatus(supabase: any, jobId: string) {
  return json(await readJob(supabase, jobId))
}
