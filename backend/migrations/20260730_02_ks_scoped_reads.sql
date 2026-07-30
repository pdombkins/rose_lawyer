-- 20260730_02 — Scope K&S reads to a student's own matter(s).
-- APPLIED to the Rose.Lawyer project on 30 Jul 2026 (migration ks_scoped_reads).
--
-- The initial merge gave every authenticated user firm-wide READ with writes
-- scoped to membership. Instructor decision (30 Jul): students should only see
-- their assigned matter plus the shared NexaCare case study. Membership already
-- encodes exactly that — ks.sync_user_memberships grants the group's matter
-- plus NexaCare (mapped to every group) — so read becomes the same test as write.
--
-- Admins keep full visibility via ks.is_admin().
--
-- Deliberately left firm-wide (still ks_read_all): ks.profiles (fee-earner
-- directory — needed to render assignments/rates on your own matter),
-- ks.knowledge_documents (firm library, not matter data), ks.system_settings
-- (app config + job state).

create or replace function ks.can_read_matter(m_id uuid)
returns boolean
language sql stable security definer
set search_path = ks, public
as $$
  select ks.is_admin()
      or exists (select 1 from ks.matter_members mm
                 where mm.matter_id = m_id and mm.user_id = auth.uid());
$$;

grant execute on function ks.can_read_matter(uuid) to authenticated, service_role;

drop policy if exists ks_read_all on ks.matters;
create policy ks_read_scoped on ks.matters for select to authenticated
  using (ks.can_read_matter(id));

drop policy if exists ks_read_all on ks.tasks;
create policy ks_read_scoped on ks.tasks for select to authenticated
  using (ks.can_read_matter(matter_id));

drop policy if exists ks_read_all on ks.task_assignments;
create policy ks_read_scoped on ks.task_assignments for select to authenticated
  using (ks.can_read_matter(ks.matter_of_task(task_id)));

drop policy if exists ks_read_all on ks.time_entries;
create policy ks_read_scoped on ks.time_entries for select to authenticated
  using (ks.can_read_matter(matter_id));

drop policy if exists ks_read_all on ks.documents;
create policy ks_read_scoped on ks.documents for select to authenticated
  using (ks.can_read_matter(matter_id));

drop policy if exists ks_read_all on ks.calendar_events;
create policy ks_read_scoped on ks.calendar_events for select to authenticated
  using (matter_id is null or ks.can_read_matter(matter_id));

drop policy if exists ks_read_all on ks.clients;
create policy ks_read_scoped on ks.clients for select to authenticated
  using (
    ks.is_admin()
    or exists (
      select 1 from ks.matters m
      join ks.matter_members mm on mm.matter_id = m.id
      where m.client_id = ks.clients.id and mm.user_id = auth.uid()
    )
  );

drop policy if exists ks_read_all on ks.client_contacts;
create policy ks_read_scoped on ks.client_contacts for select to authenticated
  using (
    ks.is_admin()
    or exists (
      select 1 from ks.matters m
      join ks.matter_members mm on mm.matter_id = m.id
      where m.client_id = ks.client_contacts.client_id and mm.user_id = auth.uid()
    )
  );

drop policy if exists ks_read_all on ks.matter_members;
create policy ks_read_scoped on ks.matter_members for select to authenticated
  using (user_id = auth.uid() or ks.is_admin());

drop policy if exists ks_read_all on ks.matter_groups;
create policy ks_read_scoped on ks.matter_groups for select to authenticated
  using (ks.can_read_matter(matter_id));

comment on function ks.can_read_matter(uuid) is
  'True when the current user is a member of the matter, or an admin. Read scope == write scope: a student sees their group matter plus the shared NexaCare case study.';
