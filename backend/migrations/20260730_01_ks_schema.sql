-- =====================================================================
-- 20260730_01 — Kendry & Slate practice-management system: `ks` schema
--
-- Merges the former Lovable-managed K&S Supabase project into Rose.Lawyer.
-- Table and column names are IDENTICAL to the source (minimising frontend
-- change); what is deliberately NOT ported:
--
--   · The 27-trigger cascade. One assignment edit used to run
--     update_task_hours_from_assignments TWICE (duplicate triggers), plus
--     maintain_time_entry_sync, plus update_matter_on_task_change, each
--     re-updating tasks/matters and re-firing their triggers. Replaced by
--     statement-level AFTER triggers with transition tables and a single
--     recompute pass per statement.
--   · user_roles + app_role enum (privilege-escalation surface). Admin is
--     Rose's public.user_profiles.is_admin, via ks.is_admin().
--   · RLS-off. Every table gets RLS: authenticated users read the firm's
--     book; writes require matter membership; admin everywhere.
--
-- New for the merge:
--   · ks.matter_groups  — matter ↔ Rose user_groups (class groups)
--   · ks.matter_members — matter ↔ auth.users, maintained by provisioning;
--     ON DELETE CASCADE from auth.users = deprovisioning on user delete
--   · performed_by on the working tables — the real student (operator),
--     distinct from the persona fee-earner in user_id/assigned_to.
--     ON DELETE SET NULL: deleting a student keeps the ledger, anonymised.
--
-- Run AFTER this in the dashboard (cannot be done in SQL):
--   Settings → API → Exposed schemas: add `ks`
-- =====================================================================

create schema if not exists ks;

grant usage on schema ks to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tables (source-identical columns, plus performed_by where noted)
-- ---------------------------------------------------------------------

create table if not exists ks.profiles (
  id uuid primary key,                -- fee earner (fictional persona)
  email text not null,
  full_name text,
  role text default 'staff',
  hourly_rate numeric,
  cost_rate numeric default 0,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  created_by uuid references ks.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references ks.clients(id) on delete cascade,
  name text not null,
  title text,
  email text not null,
  phone text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.matters (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references ks.clients(id) on delete cascade,
  title text not null,
  description text,
  status text default 'active',
  matter_type text,
  lead_partner_id uuid references ks.profiles(id),
  hourly_rate numeric,
  fee_type text default 'hourly_rates',
  fixed_fee numeric,
  total_fees numeric default 0,
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.tasks (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ks.matters(id) on delete cascade,
  title text not null,
  description text,
  status text default 'open',
  priority text default 'medium',
  assigned_to uuid references ks.profiles(id),
  workstream text,
  phase text,
  commencement_date date,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_total_hours numeric default 0,
  actual_hours numeric default 0,
  order_position integer not null default 1,
  created_by uuid references ks.profiles(id),
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references ks.tasks(id) on delete cascade,
  user_id uuid not null references ks.profiles(id) on delete cascade,
  estimated_hours numeric not null default 0,
  actual_hours numeric not null default 0,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ks.time_entries (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ks.matters(id) on delete cascade,
  task_id uuid references ks.tasks(id) on delete cascade,
  user_id uuid references ks.profiles(id),   -- persona the time is booked to
  performed_by uuid references auth.users(id) on delete set null,  -- the student
  date date not null,
  hours numeric not null,
  hourly_rate numeric,
  billable boolean default true,
  description text not null,
  source text not null default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  attendees uuid[] default '{}',
  matter_id uuid references ks.matters(id),
  created_by uuid references ks.profiles(id),
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references ks.matters(id) on delete cascade,
  task_id uuid references ks.tasks(id),
  title text not null,
  description text,
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  file_type text not null,
  version integer not null default 1,
  uploaded_by uuid references ks.profiles(id),
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ks.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  category text,
  access_level text default 'general',
  created_by uuid references ks.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ks.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,               -- persona OR real user id (see app)
  title text not null,
  message text not null,
  link_url text,
  read boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ks.system_settings (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  value text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Merge tables: group mapping and membership (provisioning target)
-- ---------------------------------------------------------------------

create table if not exists ks.matter_groups (
  matter_id uuid not null references ks.matters(id) on delete cascade,
  group_id uuid not null references public.user_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (matter_id, group_id)
);

create table if not exists ks.matter_members (
  matter_id uuid not null references ks.matters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  added_by uuid,
  created_at timestamptz not null default now(),
  primary key (matter_id, user_id)
);

-- ---------------------------------------------------------------------
-- Indexes (the ones the old system was missing where it hurt)
-- ---------------------------------------------------------------------

create index if not exists idx_ks_tasks_matter on ks.tasks(matter_id);
create index if not exists idx_ks_tasks_assigned on ks.tasks(assigned_to);
create index if not exists idx_ks_assignments_task on ks.task_assignments(task_id);
create index if not exists idx_ks_assignments_user on ks.task_assignments(user_id);
create unique index if not exists uq_ks_assignment on ks.task_assignments(task_id, user_id);
create index if not exists idx_ks_time_matter_date on ks.time_entries(matter_id, date);
create index if not exists idx_ks_time_task on ks.time_entries(task_id);
create index if not exists idx_ks_time_performed on ks.time_entries(performed_by);
create index if not exists idx_ks_notifications_user on ks.notifications(user_id, read);
create index if not exists idx_ks_events_matter on ks.calendar_events(matter_id);
create index if not exists idx_ks_documents_matter on ks.documents(matter_id);
create index if not exists idx_ks_members_user on ks.matter_members(user_id);
create index if not exists idx_ks_matter_groups_group on ks.matter_groups(group_id);

-- ---------------------------------------------------------------------
-- Helper + aggregate functions
-- ---------------------------------------------------------------------

-- Admin = Rose admin. SECURITY DEFINER so the check doesn't depend on the
-- caller's RLS view of user_profiles; search_path pinned.
create or replace function ks.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.user_profiles where user_id = auth.uid()),
    false
  );
$$;

create or replace function ks.can_write_matter(m_id uuid)
returns boolean
language sql stable security definer
set search_path = ks, public
as $$
  select ks.is_admin()
      or exists (select 1 from ks.matter_members mm
                 where mm.matter_id = m_id and mm.user_id = auth.uid());
$$;

create or replace function ks.matter_of_task(t_id uuid)
returns uuid
language sql stable security definer
set search_path = ks
as $$
  select matter_id from ks.tasks where id = t_id;
$$;

-- Fees: sum of billable ledger value; fixed-fee matters report the fixed fee.
create or replace function ks.calculate_matter_fees(m_id uuid)
returns numeric
language sql stable
set search_path = ks
as $$
  select case
    when (select fee_type from ks.matters where id = m_id) = 'fixed_fee'
      then coalesce((select fixed_fee from ks.matters where id = m_id), 0)
    else coalesce((select sum(coalesce(hours,0) * coalesce(hourly_rate,0))
                   from ks.time_entries
                   where matter_id = m_id and billable), 0)
  end;
$$;

-- The single recompute pass. Everything the old cascade did, once.
create or replace function ks.recompute(task_ids uuid[], matter_ids uuid[])
returns void
language plpgsql
set search_path = ks
as $$
begin
  -- Suppress the manual-adjustment logger for our own writes to tasks.
  perform set_config('ks.suppress_adjustment', '1', true);

  if task_ids is not null and array_length(task_ids, 1) > 0 then
    update ks.tasks t set
      actual_hours = coalesce((select sum(hours) from ks.time_entries te where te.task_id = t.id), 0),
      estimated_total_hours = coalesce((select sum(estimated_hours) from ks.task_assignments ta where ta.task_id = t.id), 0)
    where t.id = any(task_ids);
  end if;

  if matter_ids is not null and array_length(matter_ids, 1) > 0 then
    update ks.matters m set
      total_fees = ks.calculate_matter_fees(m.id),
      start_date = (select min(commencement_date) from ks.tasks where matter_id = m.id and commencement_date is not null),
      end_date   = (select max(due_date)::date    from ks.tasks where matter_id = m.id and due_date is not null),
      updated_at = now()
    where m.id = any(matter_ids);
  end if;

  perform set_config('ks.suppress_adjustment', '0', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers — consolidated
-- ---------------------------------------------------------------------

create or replace function ks.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','clients','client_contacts','matters','tasks','task_assignments','time_entries','calendar_events','documents','knowledge_documents','notifications','system_settings']
  loop
    execute format('drop trigger if exists set_updated_at on ks.%I', t);
    execute format('create trigger set_updated_at before update on ks.%I for each row execute function ks.set_updated_at()', t);
  end loop;
end;
$$;

-- BEFORE insert/update on time_entries: validation + rate derivation
-- (preserves handle_time_entry_change semantics) + operator stamp.
create or replace function ks.time_entry_before()
returns trigger
language plpgsql
set search_path = ks
as $$
declare
  lawyer_id uuid;
  rate numeric;
begin
  if new.matter_id is null then
    raise exception 'time_entries.matter_id cannot be NULL';
  end if;
  if new.date is null then
    new.date := current_date;
  end if;
  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;
  if new.hourly_rate is null then
    lawyer_id := coalesce(new.user_id, (select assigned_to from ks.tasks where id = new.task_id));
    select coalesce(p.hourly_rate, m.hourly_rate, 0) into rate
    from ks.matters m
    left join ks.profiles p on p.id = lawyer_id
    where m.id = new.matter_id;
    new.hourly_rate := coalesce(rate, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists time_entry_before on ks.time_entries;
create trigger time_entry_before
  before insert or update on ks.time_entries
  for each row execute function ks.time_entry_before();

-- AFTER statement on time_entries: one recompute per statement. Separate
-- functions per operation because the available transition tables differ.
create or replace function ks.time_entries_after_ins_fn()
returns trigger language plpgsql set search_path = ks as $$
declare t_ids uuid[]; m_ids uuid[];
begin
  select array_agg(distinct task_id) filter (where task_id is not null),
         array_agg(distinct matter_id)
    into t_ids, m_ids from new_rows;
  perform ks.recompute(t_ids, m_ids);
  return null;
end; $$;

create or replace function ks.time_entries_after_upd_fn()
returns trigger language plpgsql set search_path = ks as $$
declare t_ids uuid[]; m_ids uuid[];
begin
  select array_agg(distinct task_id) filter (where task_id is not null),
         array_agg(distinct matter_id)
    into t_ids, m_ids
  from (select task_id, matter_id from new_rows
        union all select task_id, matter_id from old_rows) x;
  perform ks.recompute(t_ids, m_ids);
  return null;
end; $$;

create or replace function ks.time_entries_after_del_fn()
returns trigger language plpgsql set search_path = ks as $$
declare t_ids uuid[]; m_ids uuid[];
begin
  select array_agg(distinct task_id) filter (where task_id is not null),
         array_agg(distinct matter_id)
    into t_ids, m_ids from old_rows;
  perform ks.recompute(t_ids, m_ids);
  return null;
end; $$;

drop trigger if exists time_entries_after_ins on ks.time_entries;
create trigger time_entries_after_ins
  after insert on ks.time_entries
  referencing new table as new_rows
  for each statement execute function ks.time_entries_after_ins_fn();

drop trigger if exists time_entries_after_upd on ks.time_entries;
create trigger time_entries_after_upd
  after update on ks.time_entries
  referencing new table as new_rows old table as old_rows
  for each statement execute function ks.time_entries_after_upd_fn();

drop trigger if exists time_entries_after_del on ks.time_entries;
create trigger time_entries_after_del
  after delete on ks.time_entries
  referencing old table as old_rows
  for each statement execute function ks.time_entries_after_del_fn();

-- task_assignments: preserve the auto-sync-to-ledger semantics (this is how
-- students record hours from the grid), then recompute ONCE per statement.
create or replace function ks.assignment_sync_row()
returns trigger
language plpgsql
set search_path = ks
as $$
declare
  delta numeric;
  t record;
  rate numeric;
begin
  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;
  delta := coalesce(new.actual_hours, 0) - coalesce(old.actual_hours, 0);
  if tg_op = 'UPDATE' and delta <> 0 then
    select tk.title, tk.matter_id, tk.commencement_date into t
    from ks.tasks tk where tk.id = new.task_id;
    select coalesce(p.hourly_rate, m.hourly_rate, 0) into rate
    from ks.matters m
    left join ks.profiles p on p.id = new.user_id
    where m.id = t.matter_id;
    insert into ks.time_entries
      (matter_id, task_id, user_id, performed_by, date, hours, description, hourly_rate, billable, source)
    values
      (t.matter_id, new.task_id, new.user_id, coalesce(auth.uid(), new.performed_by),
       coalesce(t.commencement_date, current_date), delta,
       case when delta > 0 then 'Auto-sync increase: ' || t.title
            else 'Auto-sync reduction: ' || t.title end,
       rate, true,
       case when delta > 0 then 'auto-sync' else 'adjustment' end);
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_sync on ks.task_assignments;
create trigger assignment_sync
  before insert or update on ks.task_assignments
  for each row execute function ks.assignment_sync_row();

-- The ledger insert above already recomputes the task/matter via the
-- time_entries statement trigger. Assignment *estimate* changes and
-- deletes still need their own recompute:
create or replace function ks.assignments_after_fn()
returns trigger language plpgsql set search_path = ks as $$
declare t_ids uuid[]; m_ids uuid[];
begin
  if tg_op = 'DELETE' then
    select array_agg(distinct task_id) into t_ids from old_rows;
  else
    select array_agg(distinct task_id) into t_ids from new_rows;
  end if;
  select array_agg(distinct matter_id) into m_ids
  from ks.tasks where id = any(coalesce(t_ids, '{}'));
  perform ks.recompute(t_ids, m_ids);
  return null;
end; $$;

drop trigger if exists assignments_after_ins on ks.task_assignments;
create trigger assignments_after_ins
  after insert on ks.task_assignments
  referencing new table as new_rows
  for each statement execute function ks.assignments_after_fn();

drop trigger if exists assignments_after_upd on ks.task_assignments;
create trigger assignments_after_upd
  after update on ks.task_assignments
  referencing new table as new_rows
  for each statement execute function ks.assignments_after_fn();

drop trigger if exists assignments_after_del on ks.task_assignments;
create trigger assignments_after_del
  after delete on ks.task_assignments
  referencing old table as old_rows
  for each statement execute function ks.assignments_after_fn();

-- tasks: notification on (re)assignment; manual actual_hours edits logged as
-- adjustment ledger entries (Week-8-relevant behaviour, preserved); matter
-- dates/fees via recompute. Column-scoped so recompute's own writes to
-- actual_hours/estimated_total_hours do NOT re-fire it.
create or replace function ks.task_row_changes()
returns trigger
language plpgsql
set search_path = ks
as $$
declare
  delta numeric;
begin
  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;

  -- assignment notification (kept from notify_task_assignment)
  if (tg_op = 'INSERT' and new.assigned_to is not null)
     or (tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null) then
    insert into ks.notifications (user_id, title, message, link_url)
    values (new.assigned_to, 'New Task Assigned',
            'You have been assigned a new task: ' || new.title,
            '/dashboard/matter/' || new.matter_id || '/task/' || new.id);
  end if;

  -- manual edit of task.actual_hours → adjustment entry in the ledger
  -- (preserves log_task_completed_hours_adjustment, minus its infinite-loop
  -- guard dance: recompute suppresses us via the GUC instead)
  if tg_op = 'UPDATE'
     and current_setting('ks.suppress_adjustment', true) is distinct from '1'
     and new.actual_hours is distinct from old.actual_hours then
    delta := coalesce(new.actual_hours, 0) - coalesce(old.actual_hours, 0);
    if delta <> 0 then
      insert into ks.time_entries
        (matter_id, task_id, user_id, performed_by, date, hours, description, billable, hourly_rate, source)
      values
        (new.matter_id, new.id, coalesce(new.assigned_to, old.assigned_to), auth.uid(),
         coalesce(new.commencement_date, current_date), delta,
         'Adjustment for task: ' || new.title, true, null, 'adjustment');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists task_row_changes on ks.tasks;
create trigger task_row_changes
  before insert on ks.tasks
  for each row execute function ks.task_row_changes();

drop trigger if exists task_row_changes_upd on ks.tasks;
create trigger task_row_changes_upd
  before update of title, status, assigned_to, actual_hours, due_date, commencement_date, matter_id on ks.tasks
  for each row execute function ks.task_row_changes();

-- NOTE: transition tables cannot be combined with UPDATE OF column lists,
-- so the update trigger fires on every task UPDATE and self-suppresses via
-- the ks.suppress_adjustment GUC when the update came from ks.recompute()
-- (the GUC is '1' for the duration of recompute's own statements).
create or replace function ks.tasks_after_ins_fn()
returns trigger language plpgsql set search_path = ks as $$
declare m_ids uuid[];
begin
  select array_agg(distinct matter_id) into m_ids from new_rows;
  perform ks.recompute(null, m_ids);
  return null;
end; $$;

create or replace function ks.tasks_after_upd_fn()
returns trigger language plpgsql set search_path = ks as $$
declare m_ids uuid[];
begin
  if current_setting('ks.suppress_adjustment', true) = '1' then
    return null;  -- update originated from ks.recompute(); nothing to do
  end if;
  select array_agg(distinct matter_id) into m_ids from new_rows;
  perform ks.recompute(null, m_ids);
  return null;
end; $$;

create or replace function ks.tasks_after_del_fn()
returns trigger language plpgsql set search_path = ks as $$
declare m_ids uuid[];
begin
  select array_agg(distinct matter_id) into m_ids from old_rows;
  perform ks.recompute(null, m_ids);
  return null;
end; $$;

drop trigger if exists tasks_after_ins on ks.tasks;
create trigger tasks_after_ins
  after insert on ks.tasks
  referencing new table as new_rows
  for each statement execute function ks.tasks_after_ins_fn();

drop trigger if exists tasks_after_upd on ks.tasks;
create trigger tasks_after_upd
  after update on ks.tasks
  referencing new table as new_rows
  for each statement execute function ks.tasks_after_upd_fn();

drop trigger if exists tasks_after_del on ks.tasks;
create trigger tasks_after_del
  after delete on ks.tasks
  referencing old table as old_rows
  for each statement execute function ks.tasks_after_del_fn();

-- profile rate change → recompute affected matters (rare; simple)
create or replace function ks.profile_rate_change()
returns trigger language plpgsql set search_path = ks as $$
declare m_ids uuid[];
begin
  if new.hourly_rate is distinct from old.hourly_rate then
    select array_agg(distinct matter_id) into m_ids
    from ks.tasks where assigned_to = new.id;
    perform ks.recompute(null, m_ids);
  end if;
  return new;
end; $$;

drop trigger if exists profile_rate_change on ks.profiles;
create trigger profile_rate_change
  after update of hourly_rate on ks.profiles
  for each row execute function ks.profile_rate_change();

-- ---------------------------------------------------------------------
-- Ledger view — SECURITY INVOKER (the old one was SECURITY DEFINER)
-- ---------------------------------------------------------------------

create or replace view ks.matter_time_ledger
with (security_invoker = true)
as
select te.id as entry_id,
       te.matter_id,
       m.title as matter_title,
       te.task_id,
       t.title as task_title,
       t.phase,
       te.date,
       te.user_id,
       p.full_name as lawyer_name,
       te.performed_by,
       up.display_name as operator_name,
       te.hours,
       te.hourly_rate,
       coalesce(te.hours, 0) * coalesce(te.hourly_rate, 0) as cost,
       te.description,
       te.source,
       te.created_at
from ks.time_entries te
left join ks.tasks t on t.id = te.task_id
left join ks.matters m on m.id = te.matter_id
left join ks.profiles p on p.id = te.user_id
left join public.user_profiles up on up.user_id = te.performed_by
order by te.matter_id, te.task_id, te.created_at;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['profiles','clients','client_contacts','matters','tasks','task_assignments','time_entries','calendar_events','documents','knowledge_documents','notifications','system_settings','matter_groups','matter_members']
  loop
    execute format('alter table ks.%I enable row level security', t);
  end loop;
end;
$$;

-- Read: any authenticated user sees the firm's book (deliberate pedagogy).
do $$
declare t text;
begin
  foreach t in array array['profiles','clients','client_contacts','matters','tasks','task_assignments','time_entries','calendar_events','documents','knowledge_documents','system_settings','matter_groups','matter_members']
  loop
    execute format('drop policy if exists ks_read_all on ks.%I', t);
    execute format('create policy ks_read_all on ks.%I for select to authenticated using (true)', t);
  end loop;
end;
$$;

-- Writes scoped to matter membership (or admin).
drop policy if exists ks_write on ks.matters;
create policy ks_write on ks.matters for update to authenticated
  using (ks.can_write_matter(id)) with check (ks.can_write_matter(id));

drop policy if exists ks_write_ins on ks.tasks;
create policy ks_write_ins on ks.tasks for insert to authenticated
  with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_upd on ks.tasks;
create policy ks_write_upd on ks.tasks for update to authenticated
  using (ks.can_write_matter(matter_id)) with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_del on ks.tasks;
create policy ks_write_del on ks.tasks for delete to authenticated
  using (ks.can_write_matter(matter_id));

drop policy if exists ks_write_ins on ks.task_assignments;
create policy ks_write_ins on ks.task_assignments for insert to authenticated
  with check (ks.can_write_matter(ks.matter_of_task(task_id)));
drop policy if exists ks_write_upd on ks.task_assignments;
create policy ks_write_upd on ks.task_assignments for update to authenticated
  using (ks.can_write_matter(ks.matter_of_task(task_id)))
  with check (ks.can_write_matter(ks.matter_of_task(task_id)));
drop policy if exists ks_write_del on ks.task_assignments;
create policy ks_write_del on ks.task_assignments for delete to authenticated
  using (ks.can_write_matter(ks.matter_of_task(task_id)));

drop policy if exists ks_write_ins on ks.time_entries;
create policy ks_write_ins on ks.time_entries for insert to authenticated
  with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_upd on ks.time_entries;
create policy ks_write_upd on ks.time_entries for update to authenticated
  using (ks.can_write_matter(matter_id)) with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_del on ks.time_entries;
create policy ks_write_del on ks.time_entries for delete to authenticated
  using (ks.can_write_matter(matter_id));

drop policy if exists ks_write_ins on ks.calendar_events;
create policy ks_write_ins on ks.calendar_events for insert to authenticated
  with check (matter_id is null or ks.can_write_matter(matter_id));
drop policy if exists ks_write_upd on ks.calendar_events;
create policy ks_write_upd on ks.calendar_events for update to authenticated
  using (matter_id is null or ks.can_write_matter(matter_id))
  with check (matter_id is null or ks.can_write_matter(matter_id));
drop policy if exists ks_write_del on ks.calendar_events;
create policy ks_write_del on ks.calendar_events for delete to authenticated
  using (matter_id is null or ks.can_write_matter(matter_id));

drop policy if exists ks_write_ins on ks.documents;
create policy ks_write_ins on ks.documents for insert to authenticated
  with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_upd on ks.documents;
create policy ks_write_upd on ks.documents for update to authenticated
  using (ks.can_write_matter(matter_id)) with check (ks.can_write_matter(matter_id));
drop policy if exists ks_write_del on ks.documents;
create policy ks_write_del on ks.documents for delete to authenticated
  using (ks.can_write_matter(matter_id));

-- Admin-only writes: firm reference data.
do $$
declare t text;
begin
  foreach t in array array['profiles','clients','client_contacts','knowledge_documents','system_settings','matter_groups','matter_members']
  loop
    execute format('drop policy if exists ks_admin_write on ks.%I', t);
    execute format('create policy ks_admin_write on ks.%I for all to authenticated using (ks.is_admin()) with check (ks.is_admin())', t);
  end loop;
end;
$$;

-- Matter creation/deletion: admin only (matters are provisioned per group).
drop policy if exists ks_admin_matters_ins on ks.matters;
create policy ks_admin_matters_ins on ks.matters for insert to authenticated
  with check (ks.is_admin());
drop policy if exists ks_admin_matters_del on ks.matters;
create policy ks_admin_matters_del on ks.matters for delete to authenticated
  using (ks.is_admin());

-- Notifications: own rows (works for persona ids too — the app filters).
drop policy if exists ks_notif_select on ks.notifications;
create policy ks_notif_select on ks.notifications for select to authenticated using (true);
drop policy if exists ks_notif_write on ks.notifications;
create policy ks_notif_write on ks.notifications for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table ks.tasks, ks.task_assignments, ks.time_entries, ks.matters, ks.notifications;
exception when duplicate_object or undefined_object then null;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants (RLS is the gate; grants let PostgREST through)
-- ---------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema ks to authenticated;
grant select on ks.matter_time_ledger to authenticated;
grant all on all tables in schema ks to service_role;
grant execute on all functions in schema ks to authenticated, service_role;
revoke all on schema ks from anon;
