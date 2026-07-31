# LAWS3850 Week 8 (v2) — run sheet

Professional ethics · Client experience · Employee experience

## What this week is

**Five workflows** (one hour), a responsible-AI playbook, five clause templates
and fourteen Library documents in one folder — **Week 8 — Ethics, CX & EX**.
The matter documents live separately in **Case file — NexaCare / Whitegum**,
because several weeks use them.

### Harmonised 31 July 2026

Week 8 had grown two of everything: twelve workflows across two Library folders
with two sets of reference material, which is roughly two and a half hours of
work. The v1 content (a student guide plus the case documents) and the v2
content (reference notes plus eight ethics scenarios) had been built at
different times and never reconciled.

Now: one folder, one student guide, five activities. Seven workflows were
deleted — *AI use decision*, *Client feedback synthesis*, *LPM ethics check*,
*Moments that matter*, *Professional obligations — verify before you rely*,
*Service recovery response*, *Workload & wellbeing rebalance*. Their prompts
survive in `seed/week8_v2.sql` if you ever want one back.

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

## The 60-minute flow — five activities

Harmonised 31 July 2026. Week 8 had twelve workflows and two Library folders,
which is roughly two and a half hours of work and two competing sets of
reference material. It is now **one folder, one student guide, five
activities**. The other seven workflows were deleted.

| Min | Activity | Workflow |
|---|---|---|
| 0–10 | **Baseline.** Audit the client experience on your own matter. Where is it most at risk, and why is that a communication failure rather than a legal one? | Client experience (CX) audit & scorecard |
| 10–22 | **Ethics triage.** The eight scenarios as a tabular grid, then Tabular Ask across it: which share a root cause? Which would a client never discover? | Ethics scenario triage (tabular) |
| 22–32 | **The team side.** EX pulse read out of the K&S time ledger — load, concentration, level fit, supervision. | Team experience (EX) & psychological-safety pulse |
| 32–42 | **Design.** The client happy path, one page. Week 9 implements this, so keep it. | Client happy-path map |
| 42–57 | **Deliverable.** Assemble, create tracked commitments, export the Process report. | CX/EX remediation pack |

Three minutes spare, which you will need.

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
