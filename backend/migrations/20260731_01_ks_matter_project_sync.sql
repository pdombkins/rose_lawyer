-- =====================================================================
-- A Rose project for every K&S matter, kept in sync automatically.
--
-- WHY
-- Students work a matter in K&S and do the legal work on it in Rose. Until
-- now the two were linked only by convention: six Rose projects existed, all
-- named for NexaCare, and the six group matters (CloudTech, Barangaroo,
-- Meridian, Australian Mining, Global Logistics, TechFlow) had no Rose
-- project at all.
--
-- MODEL
-- `ks.matter_projects` maps matter -> project. Deliberately many-to-many:
-- NexaCare is worked by all six groups and already has six per-group Rose
-- projects containing real student work, so it maps to all six. A new matter
-- gets exactly one.
--
-- ACCESS
-- Nothing bespoke. `project_group_grants` already gives a user_group the
-- 'editor' role on a project, and `lib/groupAccess.ts` resolves that by email
-- so it works before a student has ever signed in. This migration just keeps
-- those grants equal to `ks.matter_groups`. A student therefore reaches
-- exactly the Rose projects for the matters they are on — no more.
--
-- DELETION
-- `auto_created` marks projects this sync made. Deleting a matter deletes
-- only those. The six pre-existing NexaCare projects are mapped with
-- auto_created = false, so no trigger can ever destroy the work already in
-- them. That is a deliberate departure from "delete the matter, delete the
-- project": silently discarding a cohort's chats and tabular reviews because
-- someone tidied up a matter is not a trade worth making.
-- =====================================================================

create table if not exists ks.matter_projects (
  matter_id    uuid not null references ks.matters(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  auto_created boolean not null default true,
  -- When a matter maps to one project per group (a shared teaching matter),
  -- this pins the project to its group so grants stay one-to-one. Null =
  -- grant to every group on the matter (the normal single-project case).
  group_id     uuid references public.user_groups(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (matter_id, project_id)
);

create index if not exists matter_projects_project_idx
  on ks.matter_projects (project_id);

comment on table ks.matter_projects is
  'Maps a K&S matter to its Rose project(s). auto_created = this sync made it and may delete it; false = pre-existing, never auto-deleted.';

-- ---------------------------------------------------------------------
-- Who owns a synced project: the creator of one of the matter's groups
-- (i.e. the instructor). Falls back to any admin, so the function still
-- works for a matter created before its groups are attached.
-- ---------------------------------------------------------------------
create or replace function ks.matter_project_owner(p_matter_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    (select g.created_by::text
       from ks.matter_groups mg
       join public.user_groups g on g.id = mg.group_id
      where mg.matter_id = p_matter_id
        and g.created_by is not null
      order by g.created_at
      limit 1),
    (select up.id::text
       from public.user_profiles up
      where up.is_admin
      order by up.created_at
      limit 1)
  );
$$;

-- ---------------------------------------------------------------------
-- The whole sync, idempotent: ensure a project exists for the matter, keep
-- its name current, and make project_group_grants equal ks.matter_groups.
-- Safe to call as often as you like.
-- ---------------------------------------------------------------------
create or replace function ks.sync_matter_project(p_matter_id uuid)
returns void
language plpgsql
security definer
set search_path = ks, public
as $$
declare
  v_matter   record;
  v_owner    text;
  v_project  uuid;
begin
  select id, title, status into v_matter from ks.matters where id = p_matter_id;
  if not found then return; end if;

  v_owner := ks.matter_project_owner(p_matter_id);
  if v_owner is null then
    -- No instructor and no admin: nothing sensible to own the project.
    -- Leave the matter unmapped rather than create an orphan.
    return;
  end if;

  select mp.project_id into v_project
  from ks.matter_projects mp
  where mp.matter_id = p_matter_id
  order by mp.auto_created, mp.created_at
  limit 1;

  if v_project is null then
    insert into public.projects (user_id, name, practice, visibility, shared_with)
    values (v_owner, v_matter.title, 'Legal Project Management', 'private', '[]'::jsonb)
    returning id into v_project;

    insert into ks.matter_projects (matter_id, project_id, auto_created)
    values (p_matter_id, v_project, true);

    insert into public.project_members (project_id, user_id, role, added_by)
    values (v_project, v_owner::uuid, 'owner', v_owner::uuid)
    on conflict do nothing;
  else
    -- Keep the name aligned when a matter is renamed, but only for projects
    -- this sync created; a hand-named project is the instructor's to control.
    update public.projects p
       set name = v_matter.title, updated_at = now()
     where p.id = v_project
       and p.name is distinct from v_matter.title
       and exists (
         select 1 from ks.matter_projects mp
         where mp.matter_id = p_matter_id and mp.project_id = p.id and mp.auto_created
       );
  end if;

  -- Grants = the matter's groups, across every project mapped to the matter.
  insert into public.project_group_grants (project_id, group_id, role, added_by)
  select mp.project_id, mg.group_id, 'editor', v_owner::uuid
  from ks.matter_projects mp
  join ks.matter_groups mg
    on mg.matter_id = mp.matter_id
   and (mp.group_id is null or mp.group_id = mg.group_id)
  where mp.matter_id = p_matter_id
    and not exists (
      select 1 from public.project_group_grants pg
      where pg.project_id = mp.project_id and pg.group_id = mg.group_id
    );

  -- Revoke grants for groups no longer on the matter. Scoped to projects
  -- mapped to THIS matter, so a project shared for another reason is safe.
  delete from public.project_group_grants pg
  using ks.matter_projects mp
  where pg.project_id = mp.project_id
    and mp.matter_id = p_matter_id
    and not exists (
      select 1 from ks.matter_groups mg
      where mg.matter_id = p_matter_id
        and mg.group_id = pg.group_id
        and (mp.group_id is null or mp.group_id = mg.group_id)
    );
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function ks.matters_project_sync_ins()
returns trigger language plpgsql as $$
begin
  perform ks.sync_matter_project(new.id);
  return null;
end $$;

create or replace function ks.matters_project_sync_upd()
returns trigger language plpgsql as $$
begin
  if new.title is distinct from old.title then
    perform ks.sync_matter_project(new.id);
  end if;
  return null;
end $$;

-- Deleting a matter deletes only the projects this sync created. The mapping
-- row is already gone by then (FK cascade), so capture the ids first.
create or replace function ks.matters_project_sync_del()
returns trigger language plpgsql
security definer
set search_path = ks, public
as $$
begin
  delete from public.projects p
  where p.id in (
    select mp.project_id from ks.matter_projects mp
    where mp.matter_id = old.id and mp.auto_created
  );
  return old;
end $$;

create or replace function ks.matter_groups_project_sync()
returns trigger language plpgsql as $$
begin
  perform ks.sync_matter_project(coalesce(new.matter_id, old.matter_id));
  return null;
end $$;

drop trigger if exists matters_project_sync_ins on ks.matters;
create trigger matters_project_sync_ins
  after insert on ks.matters
  for each row execute function ks.matters_project_sync_ins();

drop trigger if exists matters_project_sync_upd on ks.matters;
create trigger matters_project_sync_upd
  after update on ks.matters
  for each row execute function ks.matters_project_sync_upd();

-- BEFORE delete: the FK from ks.matter_projects cascades on matter delete, so
-- an AFTER trigger would find the mapping already gone.
drop trigger if exists matters_project_sync_del on ks.matters;
create trigger matters_project_sync_del
  before delete on ks.matters
  for each row execute function ks.matters_project_sync_del();

drop trigger if exists matter_groups_project_sync on ks.matter_groups;
create trigger matter_groups_project_sync
  after insert or delete on ks.matter_groups
  for each row execute function ks.matter_groups_project_sync();

-- ---------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------
-- 1. NexaCare keeps its six existing per-group Rose projects. Mapped with
--    auto_created = false so no delete can ever take the students' work.
-- Pinned to its own group: without group_id these six projects would each be
-- granted to all six groups, handing every group access to every other
-- group's NexaCare workspace.
insert into ks.matter_projects (matter_id, project_id, auto_created, group_id)
select m.id, p.id, false, g.id
from ks.matters m
cross join public.projects p
join public.user_groups g
  on g.name like 'LAWS3850%' and right(g.name, 1) = right(p.name, 1)
where m.shared_teaching
  and p.name like 'NexaCare — Whitegum Acquisition — Group%'
on conflict do nothing;

-- 2. Every other matter gets its own project.
select ks.sync_matter_project(m.id) from ks.matters m order by m.title;
