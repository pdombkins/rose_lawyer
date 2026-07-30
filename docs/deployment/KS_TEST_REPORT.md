# Kendry & Slate — full system test

**Date:** 30 July 2026 · Tested against the live Rose.Lawyer project.

Every result below came from executing against the real database and live
endpoints, not from reading code. Test writes were made and rolled back; final
row counts confirm no residue.

---

## Four real bugs found and fixed

### 1. Realtime was completely dead (CRITICAL)

All six `postgres_changes` subscriptions still specified `schema: 'public'`,
but the tables moved to `ks` in the merge. **No live update would ever have
fired** — students would edit tasks and hours and see nothing change on each
other's screens until a manual refresh, which is precisely the collaborative
behaviour the app exists to demonstrate.

Fixed in `MatterDetail.tsx` (4) and `multi-resource-tasks-table.tsx` (2).

### 2. DELETE events were being dropped

`replica_identity` was PK-only, so a DELETE writes no `matter_id` — and the
subscriptions filter on `matter_id=eq.<id>`. Deletes therefore never matched
the filter and were discarded. A deleted task would vanish for its author and
linger for everyone else.

Fixed: `REPLICA IDENTITY FULL` on tasks, task_assignments, time_entries,
matters, notifications (migration `ks_realtime_replica_identity`).

### 3. Manually editing task hours threw an error (CRITICAL)

```
tuple to be updated was already modified by an operation triggered by
the current command
```

A normal classroom action failed outright. My merge port had folded two jobs
into one BEFORE UPDATE trigger — stamping `performed_by` and writing an
'adjustment' ledger entry. The ledger insert fires the statement trigger,
which calls `ks.recompute()`, which updates the very row still being updated;
Postgres refuses that from a BEFORE trigger. The pre-merge system logged
adjustments from an AFTER trigger, which is why it never hit this.

Fixed by splitting the trigger (migration `20260730_03_ks_fix_task_adjustment`).

### 4. Every time-entry report failed for students (CRITICAL)

```
permission denied for table user_profiles
```

`ks.matter_time_ledger` joins `public.user_profiles` to show `operator_name`.
Rose deliberately locks that table down — RLS on, **zero policies**, no grant
to `authenticated` — because Rose only reads it via its backend using the
service-role key. A SECURITY INVOKER view inherits the caller's rights, so the
join was refused for anyone who isn't service-role.

Fixed with a SECURITY DEFINER helper `ks.operator_name(uuid)`, so row scoping
still comes from the ks RLS policies and only the name lookup is elevated. The
same problem affected the K&S `useAuth` admin check, now routed through the
existing `ks.is_admin()` RPC.

---

## Test results

### Trigger & recompute chain — PASS

| Action | Expected | Result |
|---|---|---|
| INSERT time entry 3.5h @ $400 | task hours +3.5, matter fees +$1,400 | exact |
| UPDATE entry to 10h | fees +$4,000 from baseline | exact |
| DELETE entry | both return to baseline | exact |
| Assignment `actual_hours` +2 | auto-sync ledger entry created, task hours +2 | pass |
| Assignment `estimated_hours` +5 | `estimated_total_hours` +5 | pass |
| Manual edit of task `actual_hours` | 'adjustment' entry logged, no error | pass (after fix 3) |

No recursion, no drift; all state restored.

### Row-level security — PASS

Simulated a student (Group A membership, admin removed) via JWT claims.

| Check | Result |
|---|---|
| Matters visible | **2 of 7** — Group A + shared NexaCare |
| Clients visible | 2 (not the full client book) |
| Tasks / time entries visible | 85 / 120 |
| INSERT into another group's matter | `new row violates row-level security policy`, **0 rows written** |
| UPDATE another group's task | no-op (row invisible) |
| Write to own matter | allowed |

An earlier version of this test appeared to show the foreign insert succeeding.
That was a flaw in the test, not the policy: the INSERT's source SELECT read a
task the student couldn't see, so it inserted zero rows and raised nothing.
Re-run with a direct VALUES insert, RLS refused it properly.

### Edge functions — PASS

All four deployed to the Rose project with `verify_jwt: true`.

| Caller | Result |
|---|---|
| No Authorization header | 401 (platform) |
| Malformed token | 401 `UNAUTHORIZED_INVALID_JWT_FORMAT` |
| **Valid anon key** (ships in the frontend bundle, so publicly known) | 401 `Invalid or expired session.` — caught by `requireAdmin`, not the platform |

That third row is the one that matters: the anon key is a signed JWT and
satisfies `verify_jwt`, so without the admin guard anyone could have triggered
a term reset.

### Reports, charts and tables — PASS

Under student scope: ledger 120 rows · assignments 149 · report join 149 ·
documents 39 · calendar events 84 · knowledge docs 5 · fee earners 8 ·
2 active matters · 68 open tasks · 332.5 hours · $178,775.
`ks.is_admin()` correctly returns false for a student.

### End-to-end propagation — PASS

A student inserts a 4h @ $300 time entry:

```
ledger +4h / +$1,200 · matter fees +$1,200 · task actual_hours +4
· operator attributed to the real student (not the persona)
```

This is the chain you asked about: data entered in a table updates the
backend, and the matter fees, task hours and ledger views that feed the
charts and reports all follow automatically.

---

## Outstanding — needs your action

**The Rose backend has not been redeployed.** `/ks/health` and
`/ks/tasks/reorder` return 404 on Railway; `/health` returns 200, so the
service is up but running the pre-`ks` build. Task reordering still works via
the client-side fallback, so nothing is broken for students — but the batched
path and the audit log are inactive until you push.

**The frontend fixes are not deployed either** — realtime will stay dead until
`/firm` is rebuilt and redeployed.

```bash
cd ~/mike-OSS && rm -f .git/HEAD.lock .git/index.lock && \
git add -A && git commit -m "fix(ks): realtime schema, delete events, task adjustment trigger, ledger permissions

Realtime subscriptions still targeted schema 'public' after the merge, so no
live update fired at all. Replica identity was PK-only, so DELETE events were
dropped by the matter_id filter. The adjustment logger ran as a BEFORE trigger
and deadlocked against its own recompute. The ledger view joined a table
students cannot read." && git push
```

Railway redeploys on push. Then rebuild and deploy the frontend:

```bash
/Users/Peter_Dombkins/mike-OSS/Cutover\ K\&S.command
```

**Then verify realtime in the browser** — the one thing I cannot test from
here. Open the same matter in two windows, edit an assignment's hours in one,
and confirm the other updates without a refresh.
