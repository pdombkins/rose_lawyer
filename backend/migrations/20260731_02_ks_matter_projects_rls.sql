-- =====================================================================
-- ks.matter_projects — RLS, grant, and group scoping.
--
-- Applied 2026-07-31 via the Supabase connector as three migrations:
--   ks_matter_projects_rls · ks_matter_projects_grant ·
--   ks_matter_projects_rls_group_scoped
--
-- WHY IT MATTERS NOW
-- The K&S matter workspace reads this table directly to resolve "which Rose
-- project belongs to this matter" for the embedded Rose panel. It shipped in
-- 20260731_01 with neither RLS nor a grant, because the sync writes it from
-- triggers running as the table owner and nothing had read it as a user yet.
--
-- THREE SEPARATE THINGS, all needed:
--   1. RLS enabled       — every other ks table has it.
--   2. GRANT SELECT      — RLS decides which ROWS you see; it does not give
--                          access to the table. Without this the panel fails
--                          with "permission denied for table matter_projects".
--   3. Group scoping     — the first policy tested the matter only. NexaCare
--                          maps to six projects, one per group, so a student
--                          could read all six mapping rows and the panel's
--                          "take the first" would point five students out of
--                          six at another group's project. Rose refuses to
--                          open a project you cannot read, so this was a
--                          broken panel rather than a leak of matter content —
--                          but the rows should not be visible either.
--
-- Verified live, one student per group: each resolves NexaCare to exactly
-- their own group's project, and their own matter to its single project.
-- =====================================================================

alter table ks.matter_projects enable row level security;

-- Read-only for users; the mapping is maintained by ks.sync_matter_project()
-- running as the table owner, so there is deliberately no write policy.
grant select on ks.matter_projects to authenticated;

-- Membership test by uid OR email, matching lib/groupAccess.ts — a cohort is
-- added by email before anyone has signed in, so uid alone is not enough.
-- SECURITY DEFINER because `authenticated` cannot read public.user_group_members.
create or replace function ks.is_in_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, ks
as $$
  select exists (
    select 1
    from public.user_group_members m
    where m.group_id = p_group_id
      and (
        m.user_id = auth.uid()
        or lower(trim(m.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      )
  );
$$;

drop policy if exists matter_projects_read_scoped on ks.matter_projects;
create policy matter_projects_read_scoped
  on ks.matter_projects
  for select
  to authenticated
  using (
    ks.can_read_matter(matter_id)
    and (group_id is null or ks.is_in_group(group_id))
  );
