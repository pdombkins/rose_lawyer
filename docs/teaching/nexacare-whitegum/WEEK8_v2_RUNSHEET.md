# LAWS3850 Week 8 (v2) — run sheet

Professional ethics · Client experience · Employee experience

## What changed from v1

The eight Week-8 workflows had prompts of 117–214 characters and were all
`type='assistant'`. They now carry the actual frameworks from the slides and
readings, and four new exercises broaden the feature coverage.

| | v1 | v2 |
|---|---|---|
| Workflows | 8 | 12 |
| Median prompt length | ~160 chars | ~3,500 chars |
| Rose features exercised | Agent runtime only | Agent runtime, tabular review + Tabular Ask, Deep-verify, knowledge base, playbooks, clauses, lists, export, MCP connector |
| Evidence base | Student imagination | K&S practice-management MCP (real tasks, time ledger, rates) |

## Setup before class

1. **Run the seed.** `seed/week8_v2.sql` in the Supabase SQL editor.
2. **Upload the Library content** from `week8-library/docx/`:
   - `02-cx-ex-reference.docx`, `03-ethics-ai-reference.docx`,
     `04-values-and-evp.docx`, `01-nps-verbatims.docx` → Library, then
     **Index to knowledge base** (needed for workflows 5 and 11).
   - `docx/scenarios/*.docx` (8 files) → Library. These are the rows for the
     tabular workflow, so each must be a separate document.
3. **Connect the K&S practice-management MCP** —
   `https://kjjjlawgemmqaxgawaoe.supabase.co/functions/v1/mcp`. See the caveat
   below; this currently needs a decision from you.
4. **Check the Jade toggle is OFF** (the default). Workflow 10 depends on the
   AustLII human-verification path, which is the pedagogical point.

## The 60-minute flow

| Min | Activity | Workflow |
|---|---|---|
| 0–10 | **Baseline.** Each group audits the client experience on their own matter. Where is it most at risk, and why is it a communication rather than legal failure? | Client experience (CX) audit & scorecard |
| 10–20 | **Ethics triage.** Run the eight scenarios as a tabular grid. Then use Tabular Ask across the grid: which scenarios share a root cause? Which would the client never discover? | Ethics scenario triage · Tabular Ask |
| 20–30 | **Verify.** Take the triage output and verify every rule reference. Students record their own verdicts. Expect roughly a third to be partially wrong on effect while correct on citation — that is the teaching moment. | Professional obligations — verify before you rely |
| 30–40 | **The team side.** EX pulse from the time ledger, then rebalance the workload and cost it. The reallocation has a price, and someone has to decide whether the client is told. | Team experience (EX) pulse · Workload & wellbeing rebalance |
| 40–50 | **Synthesis.** Where do CX and EX conflict? Quantify the accelerated timetable: who decides, who pays. | Moments that matter — CX/EX map |
| 50–60 | **Deliverable.** Templates saved as clauses, commitments as tracked list items, one-page happy path, exported pack. | CX/EX remediation pack |

Workflows *Service recovery response*, *Client feedback synthesis*, *Client
happy-path map* and *AI use decision* are available for groups that move fast,
or as the basis for the Week-10 assessment.

## Facilitation prompts

- Can a strong culture prevent ethical breaches? (Green) Then: K&S's values
  say integrity; its assessment framework weights realisation rate at 20%.
  Which one is the culture?
- Where did serving the client cost the team, and who decided?
- Which Rose features support employee experience rather than just client
  experience — and do they actually, or do they only appear to?
- What is your personal rule for when you will rely on an AI statement of law?

## Assessment artefacts

The one-page happy path and the EX staffing note, both produced by the
remediation pack workflow. For an ethics week, ask for the **Process report**
export rather than the Output report — it shows the reasoning, the review
verdicts and the inference levels, which is what you are actually marking.

## Care note

The EX workflows are deliberately non-clinical and constrained to a manager's
remit. They describe work patterns, not people's psychological states. If real
student wellbeing surfaces in discussion, it belongs with UNSW support
services, not with the case study.

## K&S data access — resolved 30 Jul 2026

The earlier open item here (students couldn't add the K&S MCP connector because
Settings is admin-only) no longer applies. The connector approach was replaced
by first-class Rose tools:

| Tool | Purpose |
|---|---|
| `ks_list_matters` | Find your matter |
| `ks_get_matter` | Fee basis, totals, task counts, hours variance |
| `ks_list_tasks` | Estimate vs actual per task — the variance evidence |
| `ks_time_ledger` | The ledger, incl. `operator_name` (who really booked it) |
| `ks_list_staff` | Roles and rates for rate-mix analysis |
| `ks_record_time_entry` | **Write** — approval-gated |

Nothing to configure: every student has these automatically, and scope is
enforced server-side (their group's matter plus the shared NexaCare matter).

`ks_record_time_entry` is worth using deliberately in class. It writes to the
ledger, so it passes through the approval gate, and the entry is attributed
both to the fee-earner persona and to the student who approved it. That makes
"who recorded this hour, and on whose instruction?" a question with an
answer in the data — which is the Week-8 argument, demonstrated rather than
asserted.
