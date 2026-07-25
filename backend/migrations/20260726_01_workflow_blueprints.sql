-- Migration date: 2026-07-26
-- Workflow transparency build:
--   * workflow_blueprints — structured, step-by-step spec derived from a
--     workflow's instructions (objective / inputs / outputs / quality
--     criteria / silent-AI-failure exposure per step). Cached per workflow
--     and invalidated by source_hash so system workflows (string ids) and
--     user workflows (uuid ids) share one store.
--   * agent_runs.blueprint  — the blueprint the run was launched against.
--   * agent_runs.preflight  — the pre-run document/silent-failure assessment
--     and the user's decision at the gate.
--   * agent_steps.review    — senior-partner adjudication of the step output
--     against its quality criteria (verdict, reasons, inference level).
--   * agent_steps.attempt   — how many times the step has been re-processed
--     after a senior-partner rework instruction.

create table if not exists public.workflow_blueprints (
  workflow_id text primary key,          -- uuid string OR 'builtin-…' id
  owner_id uuid,                          -- null for system workflows
  blueprint jsonb not null,
  source_hash text not null,              -- sha256 of prompt_md + columns
  model text,
  generated_at timestamptz not null default now()
);
create index if not exists workflow_blueprints_owner_idx
  on public.workflow_blueprints(owner_id);

alter table public.workflow_blueprints enable row level security;

alter table public.agent_runs
  add column if not exists blueprint jsonb;
alter table public.agent_runs
  add column if not exists preflight jsonb;

alter table public.agent_steps
  add column if not exists review jsonb;
alter table public.agent_steps
  add column if not exists attempt int not null default 1;
