-- 20260730_03 — FIX: manual edits of ks.tasks.actual_hours failed.
-- APPLIED to Rose.Lawyer on 30 Jul 2026 (migration ks_fix_task_adjustment_trigger).
--
-- Symptom: updating a task's actual_hours raised
--   "tuple to be updated was already modified by an operation triggered by
--    the current command"
-- and the edit was rejected. This is a normal classroom action, so it would
-- have surfaced in the first session.
--
-- Cause: the merge port folded two jobs into one BEFORE UPDATE trigger on
-- ks.tasks — stamping performed_by, and logging an 'adjustment' ledger entry.
-- The ledger insert fires the time_entries statement trigger, which calls
-- ks.recompute(), which UPDATEs ks.tasks — the row still being updated.
-- Postgres refuses that from a BEFORE trigger. The pre-merge system logged
-- adjustments from an AFTER trigger, which is why it never hit this.
--
-- Fix: split the responsibilities.
--   BEFORE UPDATE → performed_by stamp + assignment notification (other
--                   tables only, so safe in BEFORE)
--   AFTER UPDATE  → adjustment ledger entry, guarded by ks.suppress_adjustment
--                   so recompute's own writes don't re-enter

create or replace function ks.task_row_changes()
returns trigger
language plpgsql
set search_path = ks
as $$
begin
  if new.performed_by is null then
    new.performed_by := auth.uid();
  end if;

  if (tg_op = 'INSERT' and new.assigned_to is not null)
     or (tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null) then
    insert into ks.notifications (user_id, title, message, link_url)
    values (new.assigned_to, 'New Task Assigned',
            'You have been assigned a new task: ' || new.title,
            '/dashboard/matter/' || new.matter_id || '/task/' || new.id);
  end if;

  return new;
end;
$$;

create or replace function ks.task_adjustment_after()
returns trigger
language plpgsql
set search_path = ks
as $$
declare
  delta numeric;
begin
  if current_setting('ks.suppress_adjustment', true) = '1' then
    return null;
  end if;

  if new.actual_hours is distinct from old.actual_hours then
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
  return null;
end;
$$;

drop trigger if exists task_adjustment_after on ks.tasks;
create trigger task_adjustment_after
  after update of actual_hours on ks.tasks
  for each row execute function ks.task_adjustment_after();
