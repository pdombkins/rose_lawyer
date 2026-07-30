# Rose × Kendry & Slate — merge cutover

**Status: CUTOVER COMPLETE — 30 Jul 2026.**

Kendry & Slate is live at **https://rose.lawyer/firm**, served from the Rose
Cloudflare Worker, reading the `ks` schema in the Rose Supabase project.

Verified end to end in a real browser session:

| Check | Result |
|---|---|
| `/firm`, `/firm/dashboard`, `/firm/about` | 200 |
| Dashboard renders migrated data | 7 active matters, 47 open tasks, Group A + NexaCare matters present |
| Shared session (SSO) | A Rose login was picked up by K&S with no second sign-in |
| RLS holding | Anonymous read of `ks` → 401 |
| Lovable | Fully removed from the build; the site no longer depends on it |

---

## What is already done (verified)

| | Evidence |
|---|---|
| `ks` schema in Rose's project — 14 tables, 13 indexes, RLS on every table | applied as migrations `ks_schema_01_tables/02_logic/03_rls` |
| All K&S data migrated | 8 profiles · 7 clients · 9 contacts · 7 matters · 266 tasks · 423 assignments · 517 time entries · 265 events · 72 documents · 5 KB docs · 61 settings |
| Trigger cascade replaced (27 → statement-level, one recompute per statement) | **Zero drift**: recomputed `total_fees` matches the old cascade's figures exactly on all 7 matters |
| Auto-provisioning / deprovisioning | End-to-end test passed: roster add → 2 memberships (group matter + shared NexaCare); roster remove → 0. Roster restored to 36 |
| Frontend de-Lovabled | `lovable-tagger`, `@lovable.dev/mcp-js`, `src/lib/mcp/`, `supabase/functions/mcp/` all removed; zero residual references |
| Real auth | `ProtectedRoute` enforces sign-in (was a no-op); demo mode and the synthetic `admin` persona deleted; `/diag` and `/admin/data-tables` now instructor-only |
| Rose side | Sidebar "Kendry & Slate" link; `/login?returnTo=` support; `/firm/:path*` SPA rewrite; `npm run build` now builds K&S first |

**One thing you should know:** all 35 student accounts are gone from
`auth.users` — only your three remain (gmail, PwC, UNSW). The class roster
(36 rows across 6 groups) is intact, so nothing is lost. If you deleted them
deliberately after the invite incident, this is the ideal state: the new
provisioning triggers will place each student into their group's K&S matter
automatically the moment they accept their invitation. If you did **not**
delete them, tell me before re-inviting.

---

## Cutover

### 1. Expose the `ks` schema (must be first — nothing works without it)

Supabase dashboard → **Settings → API → Exposed schemas** → add `ks`
alongside `public`. Then verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://vmdswdlkaxlklgvsvuqi.supabase.co/rest/v1/matters?select=id&limit=1" \
  -H "apikey: sb_publishable_EfbhXx3f1fdgHta5N1OmkA_zDGt98p" \
  -H "Accept-Profile: ks"
```

`200` = exposed. `404`/`406` = not saved yet.

### 2. Build and check locally

```bash
cd ~/mike-OSS/ks-frontend && npm install && npm run build
```

Then run both apps together and click through:

```bash
cd ~/mike-OSS/frontend && npm run build:firm && npm run dev
```

Open `http://localhost:3000/firm` — the marketing site should load, and
`/firm/dashboard` should demand sign-in. Sign in as yourself; you're an admin,
so you should reach every screen.

**What to click through** (RLS is new, so this is the real test): Dashboard →
a matter → Gantt → Tasks → Time entry → Reports → CRM → Knowledge → Calendar →
Admin. Anything that renders empty where it shouldn't is an RLS policy to
loosen, not a data problem — the row counts above confirm the data is there.

### 3. Deploy

```bash
cd ~/mike-OSS/frontend && npm run deploy
```

Then verify the SPA fallback works on the real domain:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://rose.lawyer/firm/dashboard
```

### 4. Point students at the new URL

`https://rose.lawyer/firm` replaces `https://kendry-slate.lovable.app`.
The Week 1–9 class materials and the LAWS3850 Class & Reading Guide all cite
the Lovable URL, so those need updating before next term.

### 5. Close Lovable — only after 2–4 succeed

Keep the Lovable project alive until you've taught one session on the new URL.
When you're ready: export anything you want to keep, then delete the project
and close the account. The old `Kendry & Slate OS` Supabase project should be
**paused, not deleted**, for one term as a rollback.

---

## Remaining work (specified, not yet built)

These were in the plan and are not done. None of them block the cutover.

1. **`ks_*` chat/agent tools in Rose** (`ks_get_matter`, `ks_list_tasks`,
   `ks_time_ledger`, `ks_record_time_entry`). Until these land, the six Week-8
   workflows that reference the K&S connector still expect the old public MCP
   — which is now removed. **Either** build these before teaching Week 8 again,
   **or** keep the old Lovable MCP endpoint alive as a stopgap. This is the one
   real dependency between the merge and the Week-8 material.
2. **Edge functions** — `gantt-import-processor`, `rebaseline-processor`,
   `reset-processor` still live in the old project and are unported. The Gantt
   import/export and term-reset features will not work until they are deployed
   to Rose's project and re-pointed at `ks`. `batch-update-tasks` should be
   absorbed into the Rose backend rather than ported. `webhook-time-entry` has
   a hardcoded JWT in its comments and should be deleted, not ported.
3. **Instructor console** — group↔matter mapping UI, per-student activity from
   `performed_by`, term reset. Currently the mapping is SQL-only.
4. **`MatterDetail.tsx` split** (2,645 lines) and presence indicators.
5. **Load smoke-test** (35 concurrent writers) to *demonstrate* the trigger fix
   rather than assert it. The zero-drift result proves correctness, not
   concurrency behaviour.

---

## Rollback

If the deployed `/firm` misbehaves, the old system is still live and unchanged
at `kendry-slate.lovable.app` pointing at its own database. Roll back by
telling students to use the old URL; nothing in Rose's project needs undoing,
because the `ks` schema is additive and Rose's own tables were untouched.

The one exception: the provisioning triggers fire on `auth.users` and
`public.user_group_members`. They only ever write to `ks.matter_members`, so
they cannot affect Rose behaviour, but if you want them off:

```sql
drop trigger if exists ks_provision_on_user_created on auth.users;
drop trigger if exists ks_provision_on_group_member on public.user_group_members;
```
