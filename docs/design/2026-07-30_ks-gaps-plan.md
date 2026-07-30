# Closing the two K&S merge gaps

**Date:** 30 July 2026 · **Status:** for decision
**Context:** the merge is live at rose.lawyer/firm. Two things were knowingly
deferred. Investigating them turned up a third and a fourth that were not
visible before, so this plan covers what is actually broken rather than what
I said was broken.

---

## What the investigation changed

I described gap 2 as "Gantt import and term reset don't work yet". That was
too generous. The real position:

**Every edge function is missing from the Rose project.** The K&S frontend
calls six of them by name, and `functions.invoke()` resolves against whatever
Supabase project the client points at — which is now Rose, where none exist.
So each call currently fails.

| Function | What breaks without it | Severity |
|---|---|---|
| `batch-update-tasks` | Drag-to-reorder on the task table | **Core** — used in every class |
| `webhook-time-entry` | Logging time from MatterDetail and the admin tab | **Core** — Weeks 7–8 depend on the ledger |
| `gantt-import-processor` | Gantt import | Week 1 |
| `rebaseline-processor` | Rebaselining a schedule | Week 1 / Week 9 |
| `reset-processor` | Term reset between cohorts | Instructor |
| `hours-processor` | Admin "prefill hours" tool | Instructor |

**`hours-processor` existed only in the old project.** It was live (version
24) but absent from the Lovable code export, so it would have been destroyed
the moment that project was deleted. I have retrieved the source via the
Management API and saved it to
`ks-frontend/supabase/functions/hours-processor/` with a note. **This is the
single most time-sensitive item in this document** — everything else can be
rebuilt from code we hold.

**All eight functions run with `verify_jwt: false` and the service-role key.**
They are unauthenticated endpoints with unrestricted database access. Anyone
who knows the URL can reorder any matter's tasks, write time entries, or
trigger a term reset. This predates the merge, and it is the last surviving
piece of the "no authentication" architecture the merge otherwise removed —
the RLS work does nothing here, because service-role bypasses RLS by design.

---

## Track A — `ks_*` tools for Rose's agents

**Why:** six Week-8 workflows tell the agent to call the K&S practice-
management connector. That connector was the public MCP endpoint, which the
merge deleted. Right now those instructions reference nothing.

**Approach:** first-class Rose tools, not a connector. The Rose backend can
query `ks.*` directly in the same database, so this removes the per-user MCP
registration problem entirely (the one flagged in the Week-8 runsheet, where
students couldn't add the connector because Settings is admin-only).

### Tools

| Tool | Reads | Notes |
|---|---|---|
| `ks_list_matters` | `ks.matters` + client + lead partner | Whole firm; how a student finds their matter |
| `ks_get_matter` | one matter, fee basis, totals, task counts | Replaces MCP `get_matter` |
| `ks_list_tasks` | `ks.tasks` filtered by matter/phase/workstream/assignee | Includes `estimated_total_hours` vs `actual_hours` — the estimate-variance data Week 8 analyses |
| `ks_time_ledger` | `ks.matter_time_ledger` | Now also exposes `performed_by` / `operator_name`, so the AI can discuss *who actually booked* the time — the persona/operator distinction the ethics exercises turn on |
| `ks_list_staff` | `ks.profiles` | Roles and rates for workload/rate-mix analysis |
| `ks_record_time_entry` | **writes** `ks.time_entries` | Write tool — see below |

### Security model — the part that matters

These run inside Rose's backend, which holds the service-role key. That means
RLS does **not** apply automatically, so the tools must enforce scope
themselves. Every tool takes the calling user's id and:

- **Reads** are permitted across the firm (matching the RLS read policy —
  deliberate: students compare matters, and Week 8 asks them to).
- **`ks_record_time_entry` checks `ks.matter_members`** before inserting, and
  stamps `performed_by` with the real user. A student cannot write to another
  group's matter through the AI, which would otherwise be a trivial way to
  bypass the RLS we just built.
- It joins `WRITE_TOOLS`, so any agent plan containing it hits the approval
  gate. Fitting: the Week-8 material uses that gate as a live illustration of
  where accountability sits.

### Role allowlists (`agents/types.ts`)

- `research` → the five read tools
- `review` → `ks_get_matter`, `ks_list_tasks`, `ks_time_ledger`
- `drafting` → read tools + `ks_record_time_entry`
- `intake` → `ks_list_matters`, `ks_get_matter`
- `verify` → none (verification is about sources, not practice data)

### Work

1. `backend/src/lib/chat/tools/ksTools.ts` — schemas, modelled on `kbTools.ts`.
2. Handlers in `toolDispatcher.ts`, following the `list_list_items` pattern.
3. Register in `toolSchemas.ts`; add to role allowlists and `WRITE_TOOLS`.
4. Update the six Week-8 workflow prompts: replace "use the K&S connector"
   with the tool names, and re-run the blueprint cache (it keys on a hash of
   `prompt_md`, so it invalidates itself).
5. Delete the "Open item — MCP connectors" section from
   `WEEK8_v2_RUNSHEET.md`; this closes it.

**Estimate:** ~1 day. Self-contained; no student-visible change until used.

---

## Track B — edge functions

**Approach: don't port them as-is.** Two of the six should not be edge
functions at all, and all of them need auth added. Splitting by destination:

### B1. Absorb into the Rose backend (Express, already authenticated)

`batch-update-tasks` and `webhook-time-entry` are small, called from the UI on
every interaction, and need exactly the auth and membership checks the Rose
backend already does for every other route. Making them `POST /ks/tasks/reorder`
and `POST /ks/time-entries` means they inherit `requireAuth`, the audit log,
and `ks.can_write_matter()` — rather than being re-created as another
unauthenticated endpoint.

They also both call `supabase.rpc('set_config', { app.suppress_task_adjustment })`,
a GUC from the **old** trigger design. The new schema uses
`ks.suppress_adjustment`, and `ks.recompute()` manages it internally, so that
call must be removed rather than renamed — otherwise they suppress nothing and
write aggregates the new triggers immediately recompute.

### B2. Port as edge functions, with auth (long-running jobs)

`gantt-import-processor` (658 lines), `rebaseline-processor` (655),
`reset-processor` (279) and `hours-processor` (~430) are batch jobs that use
`EdgeRuntime.waitUntil` and poll for status. They belong on the edge. Each
needs, in the port:

1. `verify_jwt: true`, and an explicit **admin check** — all four are
   instructor operations. Currently any anonymous caller can reset the term.
2. `db: { schema: 'ks' }` on the Deno client.
3. The `set_config` suppression calls removed; call `ks.recompute(task_ids,
   matter_ids)` once at the end of each batch instead. This is where the
   performance win is realised: `hours-processor` currently updates
   `task_assignments`, then `tasks`, then relies on cascading triggers, per row.
4. Job state moved out of `system_settings` (61 rows of JSON blobs) into a
   proper `ks.jobs` table — id, kind, status, progress, errors, timestamps.
   Cheap to do during the port, and makes the instructor console (below) able
   to show progress honestly.

### B3. Delete

`time-entries` — superseded by B1's endpoint.
The old `mcp` function — already removed; Track A replaces it.

### Verification

The trigger consolidation was validated for *correctness* (zero drift) but not
for *concurrency*. Porting these is the moment to add the load smoke-test:
35 simulated concurrent writers against the assignment-hours grid, asserting
no error and a bounded p95. That is the claim the original Lovable performance
work asserted and never demonstrated.

**Estimate:** ~2–3 days. B1 first (restores core interactions), then B2.

---

## Sequencing

| Order | Item | Why |
|---|---|---|
| 0 | **Preserve `hours-processor`** (done) and export the other seven before the old project is deleted | Single-copy asset; irreversible |
| 1 | **B1** — reorder + time entry into the Rose backend | Restores the two core interactions students use every class |
| 2 | **A** — `ks_*` tools | Unblocks the Week-8 material; independent of B2 |
| 3 | **B2** — the four batch jobs, with admin auth and `ks.jobs` | Instructor tooling; needed before next term, not before next class |
| 4 | Load smoke-test | Proves the trigger fix under the conditions that originally broke it |

**Do not delete the old Supabase project until step 0 is complete and step 3
has been tested.** Pausing is safe; deleting is not.

---

## Decisions I need from you

1. **Scope of `ks_record_time_entry`.** Letting an AI agent write to the time
   ledger is pedagogically rich — it makes "who recorded this hour, and on
   whose instruction?" a live question rather than a hypothetical. It is also
   the one tool that can corrupt a group's assessment data. Options: include
   it with the approval gate (my recommendation), make it instructor-only, or
   omit it and keep the ledger human-written.

2. **Read scope.** I have assumed students can read every matter, matching the
   current RLS. If you would rather they only saw their own group's matter
   plus NexaCare, say so — it is a one-line change in each tool, but it
   changes several Week-8 exercises that compare across matters.

3. **Priority.** B1 restores things that are broken for students today.
   Track A unblocks Week 8, which you are not teaching again this term. I have
   sequenced B1 first on that basis — tell me if the Week-8 material is more
   urgent.
