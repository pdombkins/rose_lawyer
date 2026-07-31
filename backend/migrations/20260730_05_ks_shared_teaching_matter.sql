-- Applied 2026-07-30 via the Supabase connector (migration ks_shared_teaching_matter).
-- NexaCare is the shared case study: every group works it, and the Week-8/9
-- exercises put students inside it as personas who hold no `tasks.assigned_to`
-- ownership (Mia Rossi and Aisha Rahman between them carry 51 of its task
-- assignments and own zero tasks). The persona filter in MattersList therefore
-- hid the matter from exactly the people the exercises are written around.
--
-- A shared teaching matter is exempt from the persona filter. RLS is unchanged:
-- students still only read matters they are a ks.matter_members of, so this
-- widens nothing — it stops a UI filter hiding a matter they can already read.
alter table ks.matters
  add column if not exists shared_teaching boolean not null default false;

comment on column ks.matters.shared_teaching is
  'Shared case-study matter used by every student group. Exempt from the persona filter in the UI: all students see it whichever persona they select, regardless of task assignment. Does not affect RLS.';

update ks.matters
set shared_teaching = true
where title ilike '%NexaCare%';
