# hours-processor — recovered 30 Jul 2026

This function was live in the old Kendry & Slate Supabase project
(`kjjjlawgemmqaxgawaoe`, version 24) but was **NOT** present in the Lovable
code export. It is invoked by `SystemPerformanceTab.tsx` (the "prefill hours"
admin tool) and would have been lost when that project was deleted.

Source retrieved via the Supabase Management API and saved here as
`index.ts` before any deletion. It has NOT been ported to the `ks` schema —
see docs/design/2026-07-30_ks-gaps-plan.md, Track B.

Known issues carried over from the original (fix during the port):
- `verify_jwt: false` and service-role key — unauthenticated, bypasses RLS.
- Writes `actual_hours` directly on task_assignments and `status`/`actual_hours`
  on tasks, then relies on the OLD trigger cascade to reconcile. Under the new
  consolidated triggers it must call `ks.recompute()` instead.
- Stores job state as JSON blobs in `system_settings` (category `hours_jobs`),
  which is why that table has 61 rows.
