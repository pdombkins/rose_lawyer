# LAWS3850 Week 9 — run sheet

Transformation and change management · NexaCare/Whitegum · Kendry & Slate

## What this week is

Ten workflows, a change-management playbook (12 rules), five templates and
eleven Library documents. The group deliverable is a change management
approach for implementing the Week-8 client happy path on the NexaCare matter.

Week 8 asked *what should the client experience be*. Week 9 asks *why would
anyone actually change how they work*, and makes students answer it with the
firm's own data rather than with adjectives.

| | Week 8 (v2) | Week 9 |
|---|---|---|
| Workflows | 12 | 10 |
| Evidence base | K&S tasks, time ledger, rates | The same, plus the ledger's `source` column — how time was captured, not just how much |
| Rose features | Agent runtime, tabular, Deep-verify, KB, playbooks, clauses, lists, export | Agent runtime, tabular (10 typed columns), KB, playbooks, clauses, lists, export, process report |
| Deliverable | CX/EX remediation pack | Change pack (8 sections + measurement appendix) |

## The evidence this week runs on

Verified against the live database on 30 July 2026:

- NexaCare: **49 tasks, 0 completed, all 49 past their due date**
- **650 estimated hours** in the task plan against **27 hours ever recorded**
- **45 of 49 tasks carry zero recorded time**
- Firm-wide time ledger by source: **0 contemporaneous, 275 adjustment,
  32 auto-sync**
- Matter team: Bentley (partner, 17 assignments, 55 est / 1.5 act) · Chen
  (SA, 25 / 187 / 6.5) · Rahman (JA, 24 / 242 / 5) · Rossi (paralegal,
  27 / 166 / 9)

The matter is planned but not tracked, and time is reconstructed rather than
recorded. That is the burning platform, and it is genuine — nothing was
staged for this week.

**Do not give students these numbers.** Workflow 1 makes them find them. A
case for change someone handed you is not a case for change you can defend
when a partner pushes back, and being pushed back on is the entire skill.

## Setup before class

1. **Run the seed** — `seed/week9.sql` in the Supabase SQL editor. Idempotent
   (`where not exists` on every insert), so re-running is safe.
2. **Upload the Library reference notes** from `week9-library/docx/` and
   **index each to the knowledge base**:
   - `01-change-frameworks-reference.docx` — Kotter's eight errors, D×V×F>R,
     Rogers, Vroom, ADKAR, the aphorisms used as tests
   - `02-change-in-law-firms.docx` — Rogers & Bell; the six structural
     barriers named
   - `03-measuring-change.docx` — method note for the `ks_*` tools; contains
     the method, deliberately not the answers
   - `04-nexacare-change-brief.docx` — the scenario; hand this one to students
     first
3. **Upload the seven persona documents** from `week9-library/docx/personas/`
   as **separate** Library documents. They are the rows for the tabular
   workflow, so they cannot be combined into one file.
4. **Check `week8_v2.sql` has been run.** It has not been as at 30 July —
   the live Week-8 prompts are still the 117–214 character originals. Week 9
   does not depend on it, but the Week-8 happy path is the thing being
   implemented, so groups will want their own Week-8 output.

## The 60-minute flow

| Min | Activity | Workflow |
|---|---|---|
| 0–12 | **Find the burning platform.** Groups query K&S themselves. Do not preview the result. The moment the plan-versus-actual ratio lands is the lesson. | Change urgency — the evidence |
| 12–20 | **Who moves first.** Coalition against Kotter's four attributes, then map the seven personas onto Rogers' curve. Force the question: who is your design audience? | Guiding coalition & diffusion map |
| 20–28 | **Vision.** One page, then the three-sentence spoken version — and what is explicitly *protected*. Have one person from each group deliver theirs verbally, timed. | Change vision on a page · Communicate the vision |
| 28–40 | **Impact assessment.** The tabular grid across all seven personas. Ten typed columns; the two that matter are "what they lose" and "adoption signal". | Change impact assessment (tabular) |
| 40–50 | **Why would they?** Resistance and loss, then Expectancy × Instrumentality × Valence. Instrumentality reads zero for most personas; make them find that. | Resistance & loss map · Expectancy Theory motivation design |
| 50–60 | **Ninety days.** Three engineered wins with baselines, targets and dates, then hard-mark the group's own plan against the eight errors. | Quick wins — 90 day plan · Kotter readiness review |

*Week 9 change pack* is the assessment deliverable and is intended to be run
outside class.

## Facilitation prompts

- The data says 650 planned hours and 27 recorded. Give me three explanations
  other than "the team is lazy". Which one would you bet on, and what one
  query would settle it?
- Lily Chen says every hour on process comes off her target. She is right.
  What is your answer that is not "communicate the benefits harder"?
- Your impact assessment says the paralegal loses nothing. Read her second
  quote again.
- Priya Iyer isn't on this matter and doesn't care. Why is she the most
  important person in the room?
- **Why would James Bentley do this?** Not should. Would.
- Who benefits from time being recorded contemporaneously — the firm, or the
  client? Are those the same answer?

## What to expect

- **Groups will over-invest in the vision and under-invest in urgency.** It is
  the enjoyable term. The D×V×F scorecard template exists to make that visible
  to them rather than being told.
- **Almost every group's first impact assessment will record no loss for
  anyone.** The column prompt pushes back, and the playbook rule marks it as a
  defect. Let the workflow deliver that criticism rather than delivering it
  yourself.
- **The Kotter readiness review is a hard marker by design.** A group scoring
  "Met" on all eight has read the plan shallowly, and the workflow says so.
  That is the intended experience, and it is worth warning them once.
- **Time recording is a genuine ethical thread, not just an efficiency one.**
  A ledger of 0 contemporaneous entries and 275 adjustments raises questions
  under ASCR r 4 and the costs-disclosure obligations they covered earlier. If
  a group reaches that on their own, follow it.

## Assessment artefacts

The **change pack** from workflow 10 — eight sections, ten pages excluding
appendices, with a measurement appendix listing every baseline and the tool
call that produced it.

Ask for the **Process report** export rather than the Output report. For a
change plan the visible reasoning, the partner-review verdicts and the
inference levels are more informative to mark than the polished output, and
they show whether the group actually queried the data or asserted around it.

The golden-thread traceability table in the pack is the fastest thing to mark:
every intervention traced to a documented problem, every problem to an
intervention or an explicit decision not to act. Recommendations with no
problem behind them are solutions the group brought with them.

## Notes

**Read scoping.** Students see their own group's matter plus the shared
NexaCare matter. Cross-matter comparison is therefore not available to them —
`03-measuring-change.md` tells them to state that as a constraint rather than
write around it. Instructors are admins and see everything.

**`ks_record_time_entry` is approval-gated.** If an exercise leads a group to
write a time entry, they will hit the approval gate. Have them read what they
are approving; the entry stamps `performed_by` with the real student while
`user_id` stays the persona, which is the attribution point from Week 8.

**plan_template is documentation.** Execution derives from `prompt_md` via
the workflow blueprint, so if you edit a workflow, edit the prompt. The
blueprint cache is keyed on a hash of the prompt and invalidates itself.

**Care note.** The personas describe working patterns and incentives, not
psychological states. Resistance is treated throughout as information, not as
a defect in the person. If real student experience of overwork surfaces in
discussion, it belongs with UNSW support services rather than with the case
study.
