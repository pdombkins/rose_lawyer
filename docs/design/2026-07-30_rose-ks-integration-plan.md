# Rose × Kendry & Slate — integration plan and system review

**Date:** 30 July 2026 · **Status:** for decision
**Inputs:** full K&S codebase (370 files), live K&S database (now in the
Rose.Lawyer Supabase org), Lovable project history, Lovable security scan,
Supabase advisors, LAWS3850 Class & Reading Guide.

---

## 1. What K&S actually is today

Before deciding how to combine the systems, the plan has to be honest about
the current architecture, because one fact changes everything downstream.

**K&S has no real authentication.** `ProtectedRoute` renders its children
unconditionally — the code comment says "No authentication required for demo
mode". Students visit `/profile-selection`, pick one of eight hardcoded
personas (James Bentley, Priya Iyer, Lily Chen, David O'Connell, Aisha Rahman,
Tom Nguyen, Mia Rossi, Administrator), and that choice is stored in
`localStorage`. There is exactly **one** row in `auth.users`. Nobody is
anybody; everybody is everybody.

Everything else follows from that:

- **RLS is off on 12 of 13 tables** (the 13th has an allow-all policy).
  Not an oversight so much as load-bearing: with no identities, row security
  has nothing to key on.
- **Any student can read and write any group's matter.** The 16 Critical
  findings in Lovable's security scan (client PII, billing data, compensation
  data, documents bucket, privilege escalation via `user_roles`) all reduce to
  "the whole database is anonymous and world-writable".
- **The MCP endpoint is public** with an unauthenticated write tool
  (`record_time_entry`), and six SECURITY DEFINER functions are executable by
  the `anon` role over REST.
- **Attribution is impossible.** Time entries and task edits record a
  *persona*, not a student. For a course that now teaches (Week 8) that the
  time ledger is evidence of a firm's own conduct, the ledger cannot say who
  actually did anything.

**Scale and shape** (live counts): 7 matters — one per assignment group A–F
plus the shared NexaCare/Whitegum matter — 7 clients, 266 tasks, 423
assignments, 517 time entries, 265 calendar events, 5 knowledge documents,
165 migrations, 7 edge functions, ~32k lines of TypeScript.

**Known operational problem.** The Lovable history documents the classroom
meltdown: with a class editing simultaneously, trigger cascades made the
system crawl. There are **27 triggers on the three hot tables** (11 on
`task_assignments`, 10 on `tasks`, 6 on `time_entries`), several of them
duplicates, and the sync functions
(`sync_task_assignment_hours_to_time_entries`,
`create_adjustment_time_entries`, `update_task_hours_from_assignments`)
recompute matter-level aggregates row-by-row on every write. A five-phase fix
was planned in Lovable; verification later found it **~20–25% implemented**,
and the live database confirms the trigger consolidation never happened.

**What is genuinely good** — worth saying, because the review is otherwise
stern. The domain model is right: clients → matters → phases/workstreams →
tasks → assignments → time entries, with rates and fee types, is a credible
miniature PMS. The feature surface maps remarkably well onto the course
(Gantt chart with import/export and rebaselining for Week 1; task and
resource management for Weeks 2 and 7; time recording and reports for Weeks
7–8; a CRM, a knowledge library, a calendar, admin reports). The seven edge
functions (`mcp`, `time-entries`, `webhook-time-entry`, `batch-update-tasks`,
`gantt-import-processor`, `rebaseline-processor`, `reset-processor`) show the
right instincts — there is even a term-reset processor. The problem is not
the concept; it is that identity, integrity and performance were deferred, as
vibe-coded systems reliably do.

---

## 2. The integration decision

### The two viable architectures

**Option A — Merge (one Supabase project).** Port the K&S schema into the
Rose.Lawyer project as a dedicated `ks` schema; migrate the data; re-point the
K&S frontend's Supabase client at Rose's project; retire the K&S project.
One `auth.users`, one identity per student, one RLS regime, native SQL joins
between Rose and K&S data.

**Option B — Federate (two projects, Rose orchestrates).** Keep the K&S
project as-is; Rose's backend holds a K&S service-role key and provisions
K&S `auth.users` mirrors for each student; login handoff via admin-generated
magic links; deprovisioning deletes the mirror user.

### Comparison

| | A — Merge | B — Federate |
|---|---|---|
| Identity | One user record; delete cascades everywhere | Two auth stores; drift managed by code |
| Provisioning | A row in a mapping table | Cross-project admin API calls |
| Rose ⇄ K&S data access | Native SQL joins; Rose chat tools read `ks.*` directly with RLS | REST calls with a service key; no joins |
| K&S website | Unchanged UI; client config re-pointed | Fully unchanged |
| Lovable editing | UI editing fine; **Lovable's DB integration breaks** (its Supabase link targets the old project) | Fully intact |
| Security work | Done once, in one project | RLS still has to be built in the K&S project anyway |
| Public MCP | Retired — Rose's authenticated `/mcp-server` and native tools replace it | Must be separately secured |
| Effort to first value | Days of careful migration | Provisioning ships fast |
| End state | One system | Permanently two systems |

### Recommendation: **A — Merge**, sequenced around the teaching calendar

You asked for the two projects combined, and Merge is the only option that
truly is that. It also dissolves three open problems in one move:

1. **Provisioning becomes trivial.** Same `auth.users` row on both sites, so
   "provision to K&S" is an insert into a `ks.matter_members` mapping table
   when a group invite is accepted, and "deprovision" is the cascade from
   deleting the user. No sync, no drift, nothing to reconcile.
2. **The connector problem from the Week-8 runsheet disappears.** Rose's
   agents stop needing a per-user MCP connector to reach K&S data — the Rose
   backend queries `ks.*` directly, through new first-class chat tools
   (`ks_get_matter`, `ks_list_tasks`, `ks_time_ledger`, `ks_record_time_entry`)
   that respect the student's own RLS scope. The public MCP endpoint is
   retired; anything external that still wants MCP access uses Rose's
   existing PAT-authenticated `/mcp-server`.
3. **Security is fixed once**, in the project that already has a working
   auth model, audit log, and admin surface.

The one real cost is Lovable: after the merge, Lovable remains useful as a
**frontend** editor (the K&S site stays a Lovable-editable React app), but its
built-in database integration will still point at the old project, so schema
changes move to the Rose repo's migration workflow. Given that the database is
precisely the part that needs engineering discipline now, I'd call that a
feature. If you want to keep full Lovable DB round-tripping, choose B and
accept permanent two-project operations — the provisioning design below works
under either, but everything else in this document assumes A.

**Timing.** The course runs to Week 10 (3–6 Aug) — presentations are next
week. Nothing destabilising should land before then. The phasing reflects
that: perimeter fixes now, the merge in the teaching break.

---

## 3. Target architecture (post-merge)

```
                    ┌──────────────────────────────────────────┐
                    │        Supabase project: Rose.Lawyer     │
                    │                                          │
  rose.lawyer ────► │  auth.users  (one identity per student)  │
  (Next.js on CF)   │  public.*    (Rose: projects, chats, …)  │
                    │  ks.*        (K&S: matters, tasks, time) │
  kendry-slate ───► │  RLS on both schemas, same JWT           │
  (Lovable app,     │  Edge functions: gantt-import,           │
   UI unchanged)    │    rebaseline, reset  (ported)           │
                    └──────────────┬───────────────────────────┘
                                   │ service role (server-side only)
                    ┌──────────────┴───────────────┐
                    │  Rose backend (Railway)      │
                    │  · provisioning hooks        │
                    │  · ks_* chat/agent tools     │
                    │  · /mcp-server (PAT-gated)   │
                    └──────────────────────────────┘
```

### Identity, personas, and the "acting as" model

The personas are pedagogically load-bearing — students *should* experience the
matter as James or Aisha. Keep them, but split two concepts the current system
conflates:

- **Fee earner** (`ks.profiles`) — the fictional lawyer whose name and rate
  appear on tasks and time entries. Unchanged; the firm's cast stays stable.
- **Operator** (`auth.users`) — the real student performing the action.

Every write gains a `performed_by uuid` column (time entries, task edits,
assignment changes). The UI barely changes: the student still picks a persona
("Acting as: Aisha Rahman — Junior Associate"), but the session is their real
login, and the record shows both. This gives you, for the first time, an
instructor's answer to "who actually did this?" — and it hands Week 8 a gift:
the ledger now distinguishes *the persona the work was booked to* from *the
person who booked it*, which is exactly the integrity distinction the
time-recording exercises teach.

### Access model

| Role | Read | Write |
|---|---|---|
| Student | All matters (a junior can see the firm's book — realistic, and Weeks 1–9 exercises cross-reference matters) | Only their group's matter (+ NexaCare where a class activity requires it, toggleable) |
| Instructor/admin | Everything | Everything, plus group↔matter mapping, resets |
| Anonymous | Marketing pages only | Nothing |

Two new tables carry this: `ks.matter_groups` (matter ↔ Rose `user_groups`,
seeded from the existing "Group X:" title convention) and `ks.matter_members`
(user ↔ matter, maintained by provisioning). RLS policies key on membership
via the shared JWT. This single change ends the cross-group interference
problem — currently any student can edit any group's Gantt chart.

### Provisioning and deprovisioning (your original request)

- **Invite accepted** → the existing Rose `/accept` flow creates the auth
  user → a provisioning hook resolves the student's groups → inserts
  `ks.matter_members` rows for each mapped matter. Because it runs at
  *acceptance* (not send), scanners can't trigger it.
- **Added to a group later** → the same hook runs on group-membership insert.
- **Removed from a group** → membership rows for that group's matters are
  deleted; their `performed_by` history remains (audit integrity).
- **User deleted** → `auth.users` cascade removes memberships everywhere.
  One delete, both systems, no orphans.
- All four paths write to Rose's existing audit log.

### Login experience

Same credentials on both sites, because it is the same auth project. For
seamlessness, Rose's sidebar gains a "Kendry & Slate" link; since both apps
talk to the same Supabase auth, a lightweight token handoff (session passed
via the existing PKCE flow) makes it feel like SSO without building one.
K&S's decorative `/auth`, `/login`, `/signin`, `/staff-login` quadruplication
collapses to one real login page.

---

## 4. K&S system review — what to fix and what to build

### 4.1 Security (do first; most is done *by* the merge)

| # | Finding | Fix |
|---|---|---|
| S1 | RLS off on 12 tables; allow-all on the 13th | Enable RLS on every `ks.*` table with the access model above. This closes 13 of the 16 Criticals at once |
| S2 | `user_roles` writable → privilege escalation | Replace with Rose's existing role model; drop the table |
| S3 | Public MCP with unauthenticated write | Retire; native `ks_*` tools + PAT-gated `/mcp-server` replace it |
| S4 | Six SECURITY DEFINER functions executable by `anon`; `matter_time_ledger` view is SECURITY DEFINER | Revoke anon EXECUTE; convert view to SECURITY INVOKER; set `search_path` on all 17 flagged functions |
| S5 | `documents` bucket public; buckets listable | Private bucket + signed URLs; drop broad SELECT policies |
| S6 | Hardcoded JWT in `webhook-time-entry` comments; webhook unauthenticated | Shared-secret header, rotate the anon key at merge |
| S7 | `/diag` and `/admin/data-tables` (raw table dumps) reachable by anyone | Instructor-only routes |
| S8 | Leaked-password protection off; Postgres 17.4 unpatched | Enable; upgrade (Rose's project is already on 17.6) |

A deliberate teaching option: keep a **sanitised copy** of the old
wide-open configuration as a Week-4/Week-8 artefact — "here is the security
scan of the system you used all term" is a memorable lesson in what
vibe-coding defers. The live system, however, gets locked.

### 4.2 Performance (the classroom meltdown)

The cascade math: one hour-field keystroke → assignment trigger →
`sync_task_assignment_hours_to_time_entries` → time-entry triggers →
task-hours recompute → matter-fees recompute → realtime broadcast to every
connected student → each client refetches. Multiply by 35 students.

1. Port only a **consolidated trigger set**: one AFTER trigger per hot table
   calling a single `ks.recompute_matter(matter_id)` that is debounced via a
   lightweight queue table.
2. Move derived aggregates (`actual_hours`, matter fees) to the recompute
   function; stop storing them redundantly.
3. Keep/finish the client-side work that exists (debounce hooks, one realtime
   channel per matter with server-side filters — not table-wide broadcasts).
4. Verified indexes on `tasks(matter_id)`, `task_assignments(task_id, profile_id)`,
   `time_entries(matter_id, entry_date)`, `notifications(user_id, read)`.
5. Add a load smoke-test script (35 concurrent writers) to CI so the fix is
   *demonstrated*, not asserted — the Lovable history shows why that matters.

### 4.3 Frontend / UX

- **Split `MatterDetail.tsx` (2,645 lines)** into tab components; it is where
  every classroom hour is spent and where every regression will hide.
- **One login page**; remove demo-mode dead ends; a visible "Acting as"
  chip with a switcher replaces the buried profile logic.
- **Instructor console** (new, small): group↔matter mapping, member list with
  Rose-side status, per-student activity (from `performed_by`), term reset
  button wired to the existing `reset-processor`.
- **Presence indicators** ("Lily Chen is editing this task" — actually
  "Group F · Sarah") to make concurrent editing legible rather than
  mysterious.
- Keep the marketing site exactly as is — it is good, and it is quoted in
  the course guide.

### 4.4 Teaching-feature roadmap (mapped to the course guide)

| Week | Exists | Add |
|---|---|---|
| 1 Scoping/Gantt | Gantt + import/export + rebaseline | Estimate-vs-actual variance view per task (feeds the cognitive-bias discussion) |
| 2 Teams/communication | Task assignment | Stakeholder register per matter; comms log the Rose W2 workflow can read |
| 3 Process/design thinking | — | Intake pipeline states on `client_intake` (it already collects submissions; make them a workable queue with SLA timestamps for process-mapping) |
| 4 Data/AI/legaltech | Reports pages | The Rose↔K&S integration itself becomes the Week-4 case study; per-matter metrics endpoint for "measuring success" |
| 7 Right-sourcing | Rates on profiles | ALSP/outsourced-provider flag on assignments so the outsourcing exercise has data |
| 8 Ethics/CX/EX | Time ledger (already used by Rose W8 v2) | `performed_by` attribution; NPS/feedback capture on matter close (feeds the CX audit with real data) |
| 9 Change management | — | Feature-flag table so a "rollout" can be staged live in class as the Kotter exercise |
| 10 Assessment | reset-processor | Per-group export pack (matter state + ledger + activity) for marking |

### 4.5 Rebuild or enhance?

**Enhance, not rebuild.** The domain model is sound, the feature surface fits
the course, and the website must stay. What's actually broken — identity,
RLS, trigger storms, one monolithic component — is surgical work on a system
of this size (~32k lines, 13 tables). A rebuild would burn the teaching break
re-implementing features that already work, and Lovable-era defects would be
replaced by rewrite-era defects. The one component I would rewrite outright
is `MatterDetail.tsx`, and the one subsystem I would delete outright is the
public MCP.

---

## 5. Phased delivery

**Phase 0 — before Week 10 (this week, ~half a day, no user-visible change)**
Perimeter only, nothing that could break presentations: revoke anon EXECUTE
on the six definer functions; secure the webhook; instructor-gate `/diag` and
`/admin/data-tables`; snapshot the database (pre-merge baseline + marking
evidence); leave everything else untouched.

**Phase 1 — teaching break (the merge, ~3–5 working days)**
`ks` schema in Rose's project; consolidated triggers + indexes ported *as
part of* the migration (never port the storm); data migrated; RLS on; edge
functions ported (gantt-import, rebaseline, reset; batch-update absorbed into
the backend); K&S frontend re-pointed with `db: { schema: 'ks' }`; real
login + "Acting as"; `performed_by` columns; provisioning/deprovisioning
hooks wired into Rose's group flows; old project paused (kept as rollback
for one term, then deleted).

**Phase 2 — early next term (~1 week)**
`ks_*` chat/agent tools in Rose (retiring the connector approach in the
Week-8 runsheet); instructor console; MatterDetail split; presence; load
smoke-test in CI.

**Phase 3 — through next term (incremental)**
Teaching-feature roadmap (§4.4), prioritised by the weeks you teach first;
NPS capture; per-group assessment exports.

**Decision needed from you:** Merge vs Federate (§2) — everything after
Phase 0 depends on it. Phase 0 is safe under either and I can start on it
immediately.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Merge breaks something mid-discovery | All work in the teaching break; old project paused not deleted; snapshot restore tested before cutover |
| Lovable DB integration lost (Option A) | Accepted and documented; schema work moves to the Rose migration flow; Lovable retained for UI |
| PostgREST multi-schema quirks (`ks` exposure, generated types) | Spike this first in Phase 1, day one — it is the only genuinely novel plumbing |
| RLS breaks a page that assumed open tables | Phase 1 includes a full click-through of every dashboard route as each policy lands; students never see intermediate states |
| Two `profiles` concepts (Rose `user_profiles`, K&S persona `profiles`) confuse future work | Naming rule everywhere: `ks.profiles` is renamed `ks.fee_earners` during the port |
| Trigger consolidation changes computed totals | Recompute function validated against a pre-migration snapshot of all matter aggregates; any drift is a bug |
