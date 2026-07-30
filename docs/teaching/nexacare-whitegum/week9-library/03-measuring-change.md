# Measuring change in the K&S system — Week 9 method note

How to get a defensible baseline out of the Kendry & Slate practice-management
data using Rose's `ks_*` tools. This note gives you the **method**, not the
answers. The numbers are deliberately not printed here — a case for change that
someone handed you is not a case for change you can defend under questioning.

## The tools

| Tool | What it gives you | Use it for |
|---|---|---|
| `ks_list_matters` | Every matter you can see, with status, fee type and total fees | Orientation; finding your matter id |
| `ks_get_matter` | One matter with its task plan, estimated and actual hours, dates and team | Plan-versus-actual; overdue analysis |
| `ks_list_tasks` | Tasks filtered by status, workstream or phase | Where the plan is failing, and in which phase |
| `ks_time_ledger` | Time entries with `source` and `operator_name` | **The most important one.** How time was captured, and by whom |
| `ks_list_staff` | Fee earners with charge-out and cost rates | Converting hours into dollars |
| `ks_record_time_entry` | Writes a time entry (approval-gated) | Only where an exercise calls for it |

You can see your own group's matter plus the shared NexaCare matter. That is
the scope by design; it is also a constraint on your comparisons, and you
should say so in your plan rather than write around it.

## Six baselines worth having

Ask Rose for each of these. Record the figure, the date you took it, and the
tool call that produced it — the measurement appendix in your change pack is
that list.

1. **Plan-versus-actual on the matter.** Total estimated hours in the task
   plan against total hours ever recorded. The ratio is the headline number of
   your case for change, and it will do more work than any adjective.
2. **Task completion.** How many tasks are complete, and how many are past
   their due date. Report both. One without the other is arguable.
3. **Coverage.** How many tasks carry zero recorded time. This distinguishes
   "we are behind" from "we are not tracking", which are different problems
   with different fixes.
4. **Capture method.** The time ledger by `source`. Contemporaneous entries
   versus entries created by adjustment or sync. This is the sharpest number
   available to you, because it speaks to whether the record can be relied on
   at all.
5. **Concentration.** Recorded hours by person and by rate. Who is actually
   carrying the matter, and what does that cost per hour?
6. **Cost of the gap.** Unrecorded planned hours × the relevant charge-out
   rate. Treat this as an exposure figure, not a loss — and say which it is.

## Three traps

**The zero-is-good trap.** A low recorded-hours figure can mean the work has
not been done, or that it has been done and not recorded. Those imply opposite
interventions. Distinguish them with a second query before you build an
argument on either.

**The precision trap.** "$186,000 of unrecorded exposure" invites an argument
about the $6,000. "Roughly a quarter of a million dollars of planned work with
no time against it" does not. Match the precision of the claim to the
precision of the evidence.

**The seeded-data trap.** This is a teaching database. Some figures are
extreme because they were built to be. Say what you are assuming: that the
pattern is real even where the magnitude is illustrative. An examiner respects
a stated assumption and marks down a hidden one.

## What good looks like

Every number in your change pack should carry, in a footnote or an appendix
line, the tool call that produced it and the date. Any figure that does not is
an assertion, and a partnership audience will treat it as one.

If a claim cannot be measured with data the firm actually captures, that is
itself a finding — write it down as a measurement gap rather than deleting the
claim.
