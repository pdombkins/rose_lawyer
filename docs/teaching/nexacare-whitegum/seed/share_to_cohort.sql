-- =====================================================================
-- Share every instructor-owned workflow with every student in a group.
--
-- WHY THIS FILE EXISTS
-- Workflow visibility is per-EMAIL, not per-group: resolveWorkflowAccess()
-- in backend/src/routes/workflows.ts matches either workflows.user_id or a
-- row in workflow_shares keyed on the caller's email. There were ZERO rows in
-- workflow_shares as at 30 July 2026, which means no student had ever been
-- able to see or run any teaching workflow, Week 7 or Week 8 included.
--
-- Run this AFTER every seed (week8_v2.sql, week9.sql, and anything later).
-- Idempotent — the NOT EXISTS guard means re-running adds only what is new.
-- =====================================================================

insert into workflow_shares (workflow_id, shared_by_user_id, shared_with_email, allow_edit)
select w.id, w.user_id, lower(trim(m.email)), false
from workflows w
cross join (select distinct lower(trim(email)) as email from user_group_members) m
where w.user_id = 'a3e483e5-0e15-4eec-9bac-a41e364a7e30'   -- instructor account
  and not exists (
    select 1 from workflow_shares s
    where s.workflow_id = w.id
      and s.shared_with_email = lower(trim(m.email))
  );

-- Read-only on purpose: allow_edit = false. Students duplicate a workflow if
-- they want to change it (POST /workflows/:id/duplicate), which keeps the
-- instructor copy authoritative and makes each group's edits their own.

select count(*) as shares,
       count(distinct workflow_id) as workflows,
       count(distinct shared_with_email) as students
from workflow_shares;
