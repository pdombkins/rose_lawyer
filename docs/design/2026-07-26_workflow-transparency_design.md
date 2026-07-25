# Workflow transparency build — 2026-07-26

Makes workflows inspectable before, during and after a run. Five changes, one
underlying idea: a workflow should be a **declared process** you can read,
argue with and edit — not an opaque prompt.

## The core object: the workflow blueprint

`backend/src/lib/workflows/blueprint.ts`

A workflow is authored as free text (`prompt_md`) or tabular columns. One LLM
call derives a typed spec from it and caches it in `workflow_blueprints`,
keyed by a sha256 of the workflow source so it invalidates automatically when
the instructions change.

Per step: `name`, `objective`, `role`, `depends_on`, `inputs[]`, `outputs[]`,
`quality_criteria[]` (testable, id'd `S2-Q1`), `silent_failure {risk, modes[],
mitigation}`, `max_rework`. Plus a workflow-wide `silent_failure_overview`
(overall risk, hotspots, notes).

The blueprint is **descriptive, never authoritative on access** — tool
allowlists are still derived server-side from the role (`roleToolsets`).
`blueprintToPlan()` turns it into an `AgentPlan`; `stepInstruction()` inlines
the objective, I/O, acceptance criteria and known failure modes into the
instruction the agent receives, so the agent is told the rubric it will be
graded against.

Cached per `workflow_id`, so built-in workflows (string ids like
`builtin-coc-dd-tabular-review`) and user workflows (uuids) share one store.
Duplicating a workflow copies the blueprint across, so the copy opens fully
described rather than blank.

**Cost note:** the first open of any workflow triggers one blueprint call
(recorded to `query_costs` with source `workflow_blueprint`). Every subsequent
open is a cache read until the instructions change.

## 1. Workflow overview page

`WorkflowProcessMap.tsx` · `WorkflowBlueprintPanel.tsx` ·
`WorkflowDetailPage.tsx`

The detail page is now tabbed: **Overview** (default) and **Instructions** /
**Columns**.

Overview renders:

- a **process map** — steps banded into columns by longest-path dependency
  depth (so same-column steps run in parallel), with SVG connectors drawn from
  measured DOM positions so they stay attached when cards reflow;
- a **step card** each: objective, inputs (with source), outputs, acceptance
  criteria with the reason each matters, and how the step can fail silently;
- a **silent-AI-failure overview** — overall risk plus per-step hotspots, each
  linking to its card.

The map component is shared with the run page.

## 2. Duplicate & edit with AI

`POST /workflows/:id/duplicate` · `POST /workflows/:id/edit-chat` ·
`WorkflowEditChatModal.tsx`

Available on every workflow, including read-only built-ins — taking a copy is
how you edit one you don't own. The user names the copy, then describes
changes in plain English. The model returns a **complete** revised
`skill_md` (and columns, for tabular) plus a bullet list of what changed.
Nothing is written until the user clicks Apply.

The editor prompt is opinionated on one point: if the user asks for a step
that summarises operative legal text, it adds an explicit verbatim-extraction
sub-step first and says so in its reply.

## 3. Pre-flight silent-failure gate

`backend/src/lib/workflows/preflight.ts` · `PreflightGate.tsx`

After the project and documents are chosen and before anything runs, the
attached documents are actually opened and sampled (6k chars each, ≤12 docs),
then re-scored against each blueprint step.

Two layers:

- **structural** (deterministic, not left to a model): documents with
  near-zero extractable text — scans, image PDFs — which cause confabulation
  rather than an error; no documents attached; total volume over ~400k chars;
  plus any step the blueprint already rated high risk.
- **model**: mismatch between attached documents and the step's declared
  inputs, summarisation steps pointed at dense heavily-qualified drafting,
  jurisdictional assumptions, "not found" collapsing into "not applicable".

`overall_risk: "high"` sets `requires_confirmation`, and the run is created
with status `paused` — the plan exists, the steps exist, nothing has executed.
The user gets exactly two ways out: **Continue anyway**, or **Stop & edit the
workflow**. Resolved via `POST /agents/:id/preflight-decision`.

The gate fails *open but loud*: if the assessment call errors, the user is
told the check didn't run rather than shown a false all-clear.

## 4. Senior-partner review + live run visibility

`backend/src/lib/agents/partnerReview.ts` · `executor.ts` ·
`(pages)/agents/page.tsx`

**The review loop.** After each step produces output, a separate reviewer pass
adjudicates it against that step's acceptance criteria: per-criterion verdict
(`met` / `partially_met` / `not_met` / `cannot_assess`) with reasons, plus an
inference assessment (`verbatim` / `low` / `moderate` / `high`) with the
specific inferential statements named. On `rework`, `reworkPreamble()` is
appended to the instruction and the step re-runs, up to `max_rework`.

Three deliberate choices:

- The reviewer **never rewrites the work** — a reviewer that quietly fixes
  things is itself a silent failure. It adjudicates and explains.
- `cannot_assess` is treated as a **defect, not a pass**.
- The decision is **derived, not trusted**: an `accept` alongside any `not_met`
  criterion is coerced to `rework`.
- If the reviewer itself fails, the step is let through but marked `degraded`,
  and the UI says the step was *not* reviewed. Silently dropping the gate is
  the exact failure this feature exists to prevent.
- If the partner never accepts, the handoff to downstream steps carries the
  unresolved objections rather than presenting the output as clean.

Ad-hoc agent runs (no blueprint) get `implicitBlueprintStep()` — source
traceability and no-confabulation criteria — so the gate applies there too.

**Live visibility.** Steps render **expanded by default** (the state set now
tracks what the user has explicitly *collapsed*). Each shows the step
objective, sources consulted, the model's **thinking** trace, and the partner
review. The process map sits above with the current step highlighted, a
`Now on step N: <name>` chip, and a distinct **reworking** state for a step
the partner has sent back. Reasoning is streamed live via a new
`agent_step_reasoning` run event.

## 5. Completion report

`backend/src/lib/agents/report.ts` · `GET /agents/:id/report`

Two artefacts on completion: the **output** (terminal steps — those nothing
else depends on) and the **process report**.

The report is assembled from persisted data only — no extra LLM call, so it
cannot itself hallucinate. Per step: objective, status, attempt count,
reasoning trace, sources actually touched (documents, playbooks, knowledge
searches, citations checked, documents produced), every partner review, and
the inference level. Run-level: overall inference (worst of any step),
`reworked_positions`, and `unreviewed_positions` — steps that completed
without a full review, surfaced in red.

Exportable as DOCX/PDF/MD via the existing C040 path, with an Output /
Process report selector.

## Assistant workflows: run mode

The Use modal now offers **Guided workflow** (default — agent runtime, process
map, review gate, report) or **Assistant chat** (the previous behaviour:
workflow applied as a skill in an ordinary chat, no step review or report).
Tabular workflows still create a Tabular Review, but pass the pre-flight gate
first.

## Migration

`backend/migrations/20260726_01_workflow_blueprints.sql` — run in the Supabase
SQL editor.

- `workflow_blueprints` (workflow_id text pk, blueprint jsonb, source_hash)
- `agent_runs.blueprint`, `agent_runs.preflight`
- `agent_steps.review`, `agent_steps.attempt`

## Incidental fix

`POST /workflows/:id/compile` selected a non-existent `skill_md` column
(`prompt_md` is the column; `skill_md` is only the API-facing alias), so
compiled plan templates were built from an empty instruction string.

## New `query_costs` sources

`workflow_blueprint` · `workflow_preflight` · `workflow_edit` ·
`partner_review`
