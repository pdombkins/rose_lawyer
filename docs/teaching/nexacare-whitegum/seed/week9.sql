-- =====================================================================
-- LAWS3850 (T2 2026) — WEEK 9
-- Transformation and change management
--
-- Ten workflows, a change-management playbook and five templates, built on
-- the NexaCare/Whitegum matter in the Kendry & Slate system.
--
-- SOURCES ANCHORED IN THE PROMPTS
--   Kotter (1995) 'Leading Change: Why Transformation Efforts Fail' HBR —
--     the eight steps and, more usefully, the eight ERRORS.
--   Rogers & Bell (2022) 'Transforming the legal profession: an interview
--     study of change managers in law' (2022) 42(3) Legal Studies 446.
--   Rogers, E (2003) Diffusion of Innovations — the adopter curve.
--   Vroom, Expectancy Theory (Expectancy × Instrumentality × Valence).
--   Prosci ADKAR; Prosci change-impact assessment.
--   Beckhard-Harris change formula, D × V × F > R.
--   Ipsos Australia Trustworthiness Rankings 2024.
--   Week-9 slide aphorisms, used verbatim as tests students must apply.
--
-- WHY THIS WEEK USES REAL DATA
-- Rogers & Bell's participants are emphatic that lawyers move on evidence,
-- not exhortation — one notes that lawyers' rationality means "data was
-- needed". Kotter's first error is failing to establish urgency. So every
-- exercise here starts from what the K&S database actually says, and the
-- database says something genuinely uncomfortable:
--
--   NexaCare: 49 tasks · 0 completed · all 49 past their due date
--             650 estimated hours vs 27 hours ever recorded
--             45 of 49 tasks carry zero recorded time
--   Firm-wide ledger: 0 'manual' entries · 275 'adjustment' · 32 'auto-sync'
--
-- The matter is planned but not tracked, and time is reconstructed rather
-- than recorded. That is the burning platform. Students are NOT told these
-- numbers — the first workflow makes them find them, because a change case
-- someone else handed you is not a change case you can defend.
--
-- NOTE ON plan_template
-- Execution derives from `prompt_md` via the workflow BLUEPRINT (one LLM call,
-- cached in workflow_blueprints), not from `plan_template` — nothing in the
-- backend reads that column except the /compile route that writes it. The
-- plan_template blocks below are therefore documentation of the intended step
-- structure, and a starting point if you ever run /compile. The prompt is what
-- actually drives the run, which is why the prompts here are long.
--
-- INSTRUCTOR: run in the Supabase SQL editor against the Rose.Lawyer project.
-- Workflows are instructor-owned and shared to the cohort.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Change urgency — the evidence (W9)   [Kotter 1 · D × V × F > R]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Change urgency — the evidence (W9)',
  'assistant',
  $md$
Build the evidence base for change on the NexaCare matter, then turn it into a
case for urgency that a sceptical partner could not wave away.

Kotter's first and most common error is failing to establish a high enough
sense of urgency — and he is blunt about why it fails: executives
"underestimate how hard it can be to drive people out of their comfort zones"
and overestimate how much they have already succeeded. Rogers and Bell found
the legal-specific version of this: their change managers reported that
lawyers' habitual rationality means change has to arrive with **data**
establishing the need for it. Exhortation does not move a partnership.

So this workflow produces numbers before it produces arguments.

## Step 1 — Find out what is actually true

Use the K&S tools. Do not assume any figure; retrieve it.

- `ks_get_matter` — fee basis, fees recorded to date, estimated vs actual
  hours in total, task counts by status and phase.
- `ks_list_tasks` — per task: `estimated_total_hours` against `actual_hours`,
  status, due date. Count how many tasks are past due and not completed.
  Count how many carry **zero** recorded time.
- `ks_time_ledger` — the `source` field distinguishes `manual`,
  `auto-sync`, `adjustment` and `prefill` entries. Count each. Ask yourself
  what it means if one of those categories is empty.
- `ks_list_staff` — charge-out rates and internal cost rates, so you can put
  a dollar figure on unrecorded effort.

## Step 2 — State the gap, precisely

Write the current state in numbers, not adjectives. At minimum:

- planned effort versus recorded effort, as hours and as a percentage;
- proportion of tasks with no time recorded at all;
- proportion of tasks past their due date;
- the composition of the time ledger by source;
- an estimate of unbilled or unrecoverable value, showing your working and
  stating which rate you used and why.

**"A well-defined problem is a problem half-solved."** If your problem
statement contains the words "better", "improve" or "more efficient" without
a number attached, it is not yet well defined.

## Step 3 — Apply the change formula

Beckhard-Harris: **D × V × F > R**. Dissatisfaction with the status quo,
multiplied by Vision of what is possible, multiplied by First concrete steps,
must exceed Resistance. It is a product, not a sum: if any term is zero, the
change does not happen.

Score each term for K&S right now, 0–5, with your evidence:

- **D** — who is actually dissatisfied? Not who *should* be. Partners with a
  full order book may be perfectly content.
- **V** — is there any articulated future state, or only complaints?
- **F** — is there a first step someone could take on Monday?
- **R** — what specifically is resisting? Name it.

Then say which term is weakest and therefore where effort should go first.
Most change programmes over-invest in V and under-invest in D.

## Step 4 — Write the urgency case

One page. Lead with the number that is hardest to argue with. Anticipate the
three objections a partner would actually raise — including "the data is
wrong because nobody records time properly", which is not a refutation of
your case but a restatement of it.

## Constraints

- Every figure must be traceable to a tool call. If a number cannot be
  retrieved, say so — an honest gap in the evidence is itself a finding, and
  it is usually the most interesting one.
- Do not manufacture a crisis. Kotter warns against urgency built on
  fabrication; Rogers and Bell's participants describe scepticism spreading
  "like an oil slick" when change managers oversell. Overstating the case is
  the fastest way to lose a room of lawyers.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Change urgency — the evidence",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Retrieve the evidence base for the NexaCare matter using ks_get_matter, ks_list_tasks, ks_time_ledger and ks_list_staff. Report factually: total estimated vs actual hours; count and percentage of tasks with zero recorded time; count past due and not completed; ledger entry counts broken down by source; charge-out and cost rates. Do not interpret yet — just establish what is true, and flag anything you could not retrieve."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "State the gap in numbers, with working shown for any derived figure (especially unrecorded value — name the rate used and justify it). Then score D, V, F and R from 0-5 with evidence for each, note that the formula is multiplicative, and identify the weakest term. Challenge the analysis: who is genuinely dissatisfied versus who ought to be?"
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Write a one-page urgency case leading with the least arguable number. Include a short section anticipating the three objections a partner would actually raise, including 'the data is wrong because nobody records time properly' — explain why that objection restates the problem rather than refuting it. Keep every claim traceable to a retrieved figure."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Change urgency — the evidence (W9)');


-- ---------------------------------------------------------------------
-- 2. Guiding coalition & diffusion map (W9)   [Kotter 2 · Rogers 2003]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Guiding coalition & diffusion map (W9)',
  'assistant',
  $md$
Decide who leads the change at Kendry & Slate, and — the harder question —
who you approach first.

## The two frameworks

**Kotter's error 2** is failing to create a sufficiently powerful guiding
coalition. He observes that renewal efforts often start with just one or two
people, that the coalition must grow over time, and that in firms of any size
it needs enough positional power, expertise and credibility that those left
out cannot easily block progress. Crucially: the coalition must include
people who are not in the formal senior team, and efforts that rely on a
staff head or a group without strong line leadership "never achieve the power
that is required".

**Rogers' diffusion curve** (from the slides): Always · Early adopters ·
Early majority · Late majority · Laggards · Never. The slide asks the
question this workflow exists to answer — *where do you start?*

The intuitive answer is "start with the enthusiasts". The better answer is
usually "start where a win will be visible to the early majority", because
the early majority take their cue from respected peers rather than from
enthusiasts, whom they often discount.

## Method

1. **Profile the firm.** Use `ks_list_staff` for roles and rates, and
   `ks_list_tasks` on the NexaCare matter to see who actually holds the work.
   Position matters, but so does workload: someone carrying a third of the
   matter has practical veto power regardless of title.
2. **Place each of the eight personas on the diffusion curve**, with a
   one-line justification grounded in something observable — their role, the
   work they hold, their rate, the pattern of their recorded time. Where you
   are inferring from character rather than evidence, label it as inference.
3. **Assemble the guiding coalition.** Kotter's test: enough power that those
   left out cannot block it; enough expertise for informed decisions; enough
   credibility that the announcement is taken seriously; enough leadership to
   drive it. Name who is in, and — just as important — name who is
   deliberately out and what risk that creates.
4. **Apply Rogers and Bell on legitimacy.** Their change managers had to
   establish pragmatic, cognitive and moral legitimacy with the lawyers they
   sought to influence. Several described themselves as a **"translation
   layer"** between lawyers and everyone else. Who at K&S can play that role,
   and what makes them credible to a partner? Note their finding that a
   change leader's own legal background cuts both ways — it buys entry, but
   can also trap them in the profession's existing assumptions.
5. **Choose the entry point.** Which persona, which matter, which phase do
   you start with — and why that one? State what makes the win visible to the
   people you actually need to convert.

## Output

The diffusion placement with justifications; the proposed coalition with
Kotter's four tests applied; the named translation layer; the entry point
with reasoning; and the specific blocking risk you are accepting.

## Constraints

- "Never" is a legitimate placement. Kotter is clear that some resistance is
  not winnable and should be worked around rather than converted — but say
  what working around them costs.
- Do not place every partner as a laggard. Rogers and Bell record the
  partnership structure as a structural barrier (short-term profit sharing
  over long-term investment), which is a systems problem, not a character
  flaw in individual partners.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Guiding coalition & diffusion map",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Profile the firm using ks_list_staff (roles, charge-out and cost rates) and ks_list_tasks on the NexaCare matter (who holds which work, how much of it, in which phase). Produce a table per persona: role, rate, tasks held, share of matter effort. Distinguish observed facts from inference."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Place each persona on Rogers' diffusion curve (Always / Early adopters / Early majority / Late majority / Laggards / Never) with a justification tied to the evidence from step 1, labelling inferences as such. Then assemble a guiding coalition and test it explicitly against Kotter's four requirements — position power, expertise, credibility, leadership. Name who is excluded and the blocking risk that creates."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Identify who can act as the 'translation layer' (Rogers & Bell) and what gives them legitimacy with partners — pragmatic, cognitive and moral. Then choose the entry point (persona, matter, phase) and argue why a win there becomes visible to the early majority rather than only to enthusiasts. Close with the cost of working around anyone placed at 'Never'."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Guiding coalition & diffusion map (W9)');


-- ---------------------------------------------------------------------
-- 3. Change vision on a page (W9)   [Kotter 3]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Change vision on a page (W9)',
  'assistant',
  $md$
Write the vision for the change you are proposing at Kendry & Slate — most
likely the client-engagement happy path developed in Week 8 — on a single
page.

## Kotter's test

Error 3 is lacking a vision. His practical test is unforgiving:

> If you cannot communicate the vision to someone in five minutes or less and
> get a reaction that signifies both understanding and interest, you are not
> done.

A vision is not a plan, a budget, or a set of programmes. Kotter's example of
failure is a four-inch-thick book of procedures with no clarifying direction.
The vision says where the firm is going and why that is better; the plans say
how.

## Method

1. **Anchor in the current state.** Reference the evidence from *Change
   urgency — the evidence (W9)*. A vision that does not answer a documented
   problem is decoration.
2. **Describe the future state concretely**, along the CX lifecycle stages
   the firm already uses: Awareness & Consideration · Engagement & Onboarding
   · Legal Service Delivery · Aftercare & Loyalty. For each, one sentence on
   what is different, expressed as something a client or a lawyer would
   notice — not as a system or a policy.
3. **Say what will NOT change.** This is the step most groups skip and the
   one that most reduces resistance. Partners fear that "transformation"
   means losing professional judgement, client relationships, or autonomy
   over their own matters. Name explicitly what is protected.
4. **Make it five-minute testable.** Write the version you would say out loud.
   Then compress it to three sentences. If the three-sentence version is
   incoherent, the page is not finished.
5. **Attach three measures.** *"If a change happens in the forest but nobody
   is around to measure it, did it make a difference?"* Each measure needs a
   current baseline drawn from the K&S data, a target, and a date. Use
   `ks_get_matter` and `ks_time_ledger` to establish the baselines.

## Output

The one-page vision; the three-sentence spoken version; what is explicitly
protected; and the three measures with baseline, target and date.

## Constraints

- No jargon that a client would not use. If the vision needs a glossary, it
  is a plan wearing a vision's clothes.
- **"Don't wait for perfect, you'll always be waiting."** A vision that
  depends on a system nobody has procured yet is not actionable. At least one
  element must be achievable with what the firm has today.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Change vision on a page",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Establish baselines for the three measures the vision will carry, using ks_get_matter and ks_time_ledger on the NexaCare matter (e.g. proportion of tasks with recorded time, ledger composition by source, planned vs recorded hours, tasks past due). Report each baseline with the figure and how it was derived."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Write the one-page vision anchored to the documented current state, describing the future state across the four CX lifecycle stages in terms a client or lawyer would notice. Include an explicit section on what will NOT change — professional judgement, client relationships, autonomy over matters. Then produce the three-sentence spoken version."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Apply Kotter's five-minute test: could this be delivered verbally and produce understanding and interest? Flag any sentence that is a plan rather than a vision, and any jargon a client would not use. Confirm at least one element is achievable with the firm's current tools. Attach the three measures with baseline, target and date."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Change vision on a page (W9)');


-- ---------------------------------------------------------------------
-- 4. Communicate the vision — audience pack (W9)   [Kotter 4 · trust]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Communicate the vision — audience pack (W9)',
  'assistant',
  $md$
Turn the vision into what each audience at Kendry & Slate actually needs to
hear, and design how it will be said.

## Kotter's arithmetic

Error 4 is **undercommunicating the vision by a factor of ten** — and he
means the figure literally. In successful transformations, leaders use every
existing channel, fold the vision into routine business (a management review
becomes a discussion of how the proposal advances the vision), and above all
**walk the talk**: nothing undermines change more than senior people
behaving inconsistently with what they have announced.

## The trust dimension

The slides close on the Ipsos Australia Trustworthiness Rankings, and the
point is uncomfortable: lawyers do not sit high on public trust, and internal
trust in firm management is often lower still. Rogers and Bell record
"diminished trust within the legal organisation" as an explicit barrier to
change, alongside unclear accountability between managers and employees.

So the question is not only *what is the message* but *who can say it and be
believed*. A message from a source the audience does not trust is worse than
no message, because it consumes the opportunity.

## Method

For each audience — partners (James Bentley, Priya Iyer), senior associates
(Lily Chen, David O'Connell), junior associates (Aisha Rahman, Tom Nguyen),
legal assistant (Mia Rossi), and the client (NexaCare) — specify:

| Element | What to decide |
|---|---|
| What they need to know | The one thing, not the full vision |
| What they will ask first | Be honest; it is usually about them |
| Who delivers it | And why that person is believed by this audience |
| Channel and cadence | Existing channels, per Kotter |
| What would destroy it | The specific inconsistent behaviour that would kill credibility here |

Then:

1. **Draft the actual words** for the two hardest audiences. Not talking
   points — sentences someone could say.
2. **Design the walk-the-talk test.** Name one behaviour, by one named
   person, that would visibly demonstrate the vision within two weeks. Also
   name the behaviour that would visibly contradict it, so the coalition
   knows what it has committed to avoiding.
3. **Build the repetition schedule.** Where does this appear in existing
   forums over the first 90 days? Kotter's point is that the vision must ride
   on routine, not on special events.

## Constraints

- Do not write announcements that only work if everyone is already
  persuaded. Assume a sceptical audience — Rogers and Bell describe lawyers'
  scepticism as habitual and professionally trained.
- Address the client audience differently: NexaCare has commercial
  expectations, and Jonathan Wu (GC) has said "no surprises". Any process
  change that touches their experience must be communicated before it is
  visible to them, not after.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Communicate the vision",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Use ks_list_staff and ks_list_tasks to establish what each persona actually does on the NexaCare matter — the work they hold determines what they will ask first. Summarise per audience: role, workload, and what in the proposed change touches their day directly."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Build the audience table for all eight personas plus the client: what they need to know, what they will ask first, who delivers it and why that person is believed by this audience, channel and cadence using existing forums, and the specific inconsistent behaviour that would destroy credibility with them. Then draft actual spoken sentences for the two hardest audiences."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Design the walk-the-talk test: one visible behaviour by one named person within two weeks, and the specific contradicting behaviour the coalition is committing to avoid. Produce the 90-day repetition schedule mapped onto existing forums rather than new meetings. Finally, stress-test every message against a sceptical reader and against Jonathan Wu's 'no surprises' expectation for anything client-visible."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Communicate the vision — audience pack (W9)');


-- ---------------------------------------------------------------------
-- 5. Change impact assessment (W9) — TABULAR, one row per persona
--    Straight from the slide: for each persona — change type, current
--    state, future state, degree of impact, transition strategy.
--    Rows come from the Library folder "W9 — persona change profiles".
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, practice, language, jurisdictions, columns_config)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Change impact assessment (W9)',
  'tabular',
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $cols$[
    {
      "index": 0,
      "name": "Persona",
      "type": "text",
      "prompt": "Who is this? Name, role and their part in the NexaCare matter. Keep it to one line."
    },
    {
      "index": 1,
      "name": "Change type",
      "type": "text",
      "prompt": "Classify what changes for this person: process, technology, role/responsibility, mindset, or a combination. Prosci's framing — be specific about which of their working practices the change actually touches. 'Everything' is not a classification."
    },
    {
      "index": 2,
      "name": "Current state",
      "type": "text",
      "prompt": "How this person works today, described behaviourally and where possible with evidence from the K&S data (tasks held, time recorded, entry sources). Not how the process is documented — how it is actually done."
    },
    {
      "index": 3,
      "name": "Future state",
      "type": "text",
      "prompt": "How this person works after the change, at the same level of behavioural specificity. If you cannot describe a Tuesday morning in the future state, it is not defined yet."
    },
    {
      "index": 4,
      "name": "Degree of impact",
      "type": "risk",
      "prompt": "Rate the impact on this person: Low, Medium, High or Critical. Rate the impact ON THEM, not the importance of their support to you — those are different, and conflating them is why change plans over-serve senior people and blindside juniors."
    },
    {
      "index": 5,
      "name": "What they lose",
      "type": "text",
      "prompt": "Name the specific loss — autonomy, status, a familiar routine, a source of expertise-based value, informal discretion, or time. 'People are resistant to loss, not change.' If you have written 'nothing', you have not looked hard enough; even a beneficial change costs someone the competence they had built."
    },
    {
      "index": 6,
      "name": "Adoption effort",
      "type": "duration",
      "prompt": "Realistic time for this person to reach proficiency — including the productivity dip while they are learning. Express in days or weeks and state your assumption."
    },
    {
      "index": 7,
      "name": "Cost of their non-adoption",
      "type": "money",
      "prompt": "Estimated cost in AUD if this person does not adopt: unrecorded time at their charge-out rate, rework, or delay. Use ks_list_staff for rates. If it genuinely cannot be quantified, enter 0 and say why — an unquantifiable impact is still a finding."
    },
    {
      "index": 8,
      "name": "Transition strategy",
      "type": "text",
      "prompt": "The specific intervention for this person: training, coaching, involvement in design, incentive change, or removal of a barrier. Name who delivers it and when. A strategy that is only 'communicate the benefits' is not a strategy — it is the absence of one."
    },
    {
      "index": 9,
      "name": "Adoption signal",
      "type": "text",
      "prompt": "The observable behaviour that tells you this person has actually adopted — something you could see in the K&S data or in a meeting, not something they say in a survey. 'If a change happens in the forest but nobody is around to measure it, did it make a difference?'"
    }
  ]$cols$::jsonb
where not exists (select 1 from workflows w where w.title = 'Change impact assessment (W9)');


-- ---------------------------------------------------------------------
-- 6. Resistance & loss map (W9)   [Rogers & Bell · "resistant to loss"]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Resistance & loss map (W9)',
  'assistant',
  $md$
Work out what the change actually costs each person at Kendry & Slate, and
design responses that address the loss rather than arguing with the person.

## The reframe this workflow is built on

**"People are resistant to loss, not change."** Treating resistance as
irrationality is the most common and least useful diagnosis. If someone is
resisting, the working assumption is that they are correctly perceiving a
cost that your plan has not accounted for.

Rogers and Bell's findings sharpen this for law specifically:

- **Structural, not personal.** The partnership model shares profits among
  partners rather than reinvesting them, which biases the firm toward
  short-term planning. Resistance to a two-year programme may be a rational
  response to an incentive structure, not obstinacy.
- **Autonomy and status.** Status professions were characterised by high
  autonomy; managerial change is "typically or immediately thought to have a
  threatening, controlling presence". LPM tooling can read as surveillance.
- **Scepticism is trained.** Lawyers are professionally rewarded for doubting
  claims and finding the flaw. One participant described scepticism spreading
  "like an oil slick over the audience".
- **But scepticism is an asset.** The slides put it directly: *"the
  competitiveness of lawyers is a vastly under-utilised asset."* Rogers and
  Bell's participants describe lawyers' scepticism and risk-sensitivity as
  *conducive* to good change when it is engaged rather than suppressed — a
  sceptic who is convinced becomes your most credible advocate, because
  everyone knows they were hard to convince.

## Method

1. **For each persona, name the loss.** Use `ks_list_tasks` and
   `ks_time_ledger` to ground this: someone whose expertise is knowing where
   things are loses that value when the system makes it findable by anyone.
2. **Classify the resistance.**
   - *Rational* — they have correctly identified a real cost.
   - *Structural* — the incentive system punishes the new behaviour.
   - *Identity* — it threatens what makes them a professional.
   - *Experiential* — they have seen initiatives fail before.
   Each requires a different response. Only one of them is addressed by more
   communication.
3. **Design the response to the loss.** For a rational objection, either
   compensate the loss or accept and state the trade-off honestly. For a
   structural one, the fix is the incentive, not the person — say what would
   have to change and who owns it. For identity, involvement in design tends
   to work where persuasion does not. For experiential, the answer is
   evidence and a small reversible first step.
4. **Recruit two sceptics.** Identify the two personas most likely to attack
   the plan, and design their role in improving it — what specifically would
   you ask them to stress-test? Say what you would do if their critique is
   correct.
5. **Name what you cannot address.** Some losses are real and uncompensated.
   Say so plainly. A change plan that claims everyone wins is not credible to
   an audience trained to find the flaw.

## Output

The loss map by persona; resistance classified by type; a response per type;
the two named sceptics with their assigned critique; and an honest list of
uncompensated losses.

## Constraints

- Do not use the word "buy-in" without saying what is being bought and what
  it costs.
- Keep the analysis behavioural and professional. This is about work,
  incentives and identity at work — not about personality or wellbeing.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Resistance & loss map",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Use ks_list_staff, ks_list_tasks and ks_time_ledger to establish what each persona currently holds and does on the NexaCare matter — the work, the hours, the entry patterns. This is the evidence for what each of them would actually lose. Report per persona: role, rate, work held, and anything in the data suggesting where their practical value or discretion sits."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "For each persona name the specific loss, then classify the likely resistance as Rational, Structural, Identity or Experiential, with reasoning. Draw explicitly on Rogers & Bell: partnership incentives biasing toward short-term planning; autonomy and status in a status profession; trained scepticism. Flag where resistance is a correct reading of a real cost your plan has not yet addressed."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Design a response matched to each resistance type — compensate or honestly trade off the rational, fix the incentive for the structural, involve in design for identity, provide evidence and a small reversible step for experiential. Then nominate two sceptics and specify exactly what you would ask them to stress-test, and what you would do if they are right. Close with an honest list of losses you cannot compensate."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Resistance & loss map (W9)');


-- ---------------------------------------------------------------------
-- 7. Expectancy Theory motivation design (W9)   [Vroom]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Expectancy Theory motivation design (W9)',
  'assistant',
  $md$
Work out whether the people you need to change actually have a reason to,
using Vroom's Expectancy Theory.

## The model

Motivation = **Expectancy × Instrumentality × Valence**

- **Expectancy** — "if I put in the effort, can I actually do this?"
  Undermined by inadequate training, unrealistic workload, or tools that do
  not work.
- **Instrumentality** — "if I do it well, will the promised outcome actually
  follow?" Undermined by broken past promises and by reward systems that
  measure something else.
- **Valence** — "do I even want that outcome?" Undermined by rewards designed
  for the designer rather than the recipient.

Like D × V × F, this is **multiplicative**. A junior who believes they can do
it and trusts the reward will follow, but does not value the reward, is
unmotivated. Most change programmes address only Expectancy — they train
people — and are then surprised.

## Method

1. **For each persona, score E, I and V from 0 to 5**, with a reason for
   each. Use the K&S data to ground Expectancy in particular: someone already
   holding a large share of the matter has a real capacity constraint, and no
   amount of enthusiasm changes that. `ks_list_tasks` and `ks_time_ledger`
   will show you who is loaded.
2. **Multiply, and rank.** Identify who has the lowest product and — more
   usefully — *which term* is dragging it down. The intervention follows from
   the term, not the score.
3. **Test Instrumentality hard.** At K&S, what does the firm actually reward?
   If associates are assessed on billable hours and realisation, and the
   change asks them to spend time on recording and planning that does not
   bill, then Instrumentality is near zero no matter what anyone announces.
   This is the same structural point Rogers and Bell make about partnership
   incentives — and it is usually the real blocker.
4. **Design one intervention per weak term**, naming who owns it:
   - low E → training, capacity relief, a simpler first step, better tooling
   - low I → change the measure, or make the link visible and public
   - low V → find a reward this person actually values (time back,
     recognition, autonomy, better work) rather than one you would value
5. **Check for the free-rider problem.** Where a benefit is collective (the
   firm looks better to clients) but the cost is individual (my Friday
   afternoon), Valence collapses. Say how you close that gap.

## Output

The E × I × V table with scores, reasons and products; the binding constraint
per persona; one owned intervention per weak term; and your answer to the
collective-benefit/individual-cost problem.

## Constraints

- Do not propose incentives the firm cannot actually authorise. If the fix
  requires changing the associate assessment framework, say so and name whose
  decision that is — an unfundable recommendation is a way of avoiding the
  problem.
- Be honest where the answer is "this person has no rational reason to
  adopt". That is a finding, and it tells you the change design is wrong,
  not the person.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Expectancy Theory motivation design",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Establish capacity and reward context from the K&S data: ks_list_staff for roles and rates, ks_list_tasks for how much of the matter each persona holds, ks_time_ledger for recording patterns. Identify who is genuinely capacity-constrained — this grounds Expectancy in fact rather than assumption."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Score Expectancy, Instrumentality and Valence 0-5 per persona with reasons, compute the product, and identify the binding term for each. Interrogate Instrumentality specifically against what the firm actually measures and rewards (billable hours, realisation) versus what the change asks for — and state plainly where the reward system contradicts the request."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Design one intervention per weak term with a named owner, matched to the term rather than generic. Address the collective-benefit/individual-cost problem explicitly. Flag any intervention that requires authority the change team does not have, naming whose decision it is, and identify any persona who has no rational reason to adopt — treating that as a design fault rather than a personal failing."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Expectancy Theory motivation design (W9)');


-- ---------------------------------------------------------------------
-- 8. Quick wins — 90 day plan (W9)   [Kotter 5 & 6 · measurement]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Quick wins — 90 day plan (W9)',
  'assistant',
  $md$
Design the first ninety days: the obstacles you will remove, the wins you
will engineer, and how each will be measured.

## Kotter on wins

Error 5 is failing to remove obstacles to the vision — and he is specific
that the big obstacles must be confronted, not worked around, because leaving
one visible blocker in place tells everyone the change is optional.

Error 6 is failing to create short-term wins, and the distinction he draws is
the one that matters here:

> Creating short-term wins is different from hoping for short-term wins.

Hoping is passive. Creating means actively engineering a visible, unambiguous
improvement within 6–18 months — and for a 90-day plan, sooner. Without them,
too many people give up or join the resistance.

Error 7 is declaring victory too soon. A quick win is evidence, not
completion.

## Method

1. **Identify the obstacles.** From the evidence work and the resistance map:
   what specifically prevents the future state? Separate:
   - *structural* — systems, processes, incentives
   - *capability* — people do not know how
   - *authority* — nobody is empowered to decide
   For each, say whether you are removing it or routing around it, and what
   routing around it costs.
2. **Design three quick wins.** Each must be:
   - **visible** — someone outside the coalition notices
   - **unambiguous** — not arguable as a fluke or as reclassification
   - **measurable in the K&S data** — name the query or view that will show it
   - **deliverable in 90 days** with existing resources
   Establish the baseline now using `ks_get_matter`, `ks_list_tasks` and
   `ks_time_ledger`, so the before/after is not contested later.
3. **Sequence them** across the INITIATE / EMBED / BUILD framing from the
   slides. Which win buys the credibility needed for the next, harder step?
4. **Write the measurement plan.** For each win: baseline figure, target,
   measurement date, who reports it, and where it is published. *"If a change
   happens in the forest but nobody is around to measure it, did it make a
   difference?"*
5. **Set the anti-victory rule.** State explicitly what you will say when the
   first win lands, to prevent Kotter's error 7. What is the sentence that
   celebrates the win and keeps the urgency?

## Output

The obstacle list with remove/route decisions; three engineered quick wins
with baselines, targets and measurement dates; the sequence with reasoning;
and the anti-victory statement.

## Constraints

- **"Tolerance for mistakes: for people (high); for technology (zero)."**
  A quick win that depends on people not making mistakes will fail. A quick
  win that depends on a tool working perfectly first time will also fail —
  so choose wins with a manual fallback.
- No win may require data the firm does not currently capture. If the measure
  needs new instrumentation, building that instrumentation is the win.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Quick wins — 90 day plan",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Establish measurable baselines from the K&S data for anything a quick win might move: proportion of tasks with recorded time, ledger composition by source, tasks past due, planned vs recorded hours, matter fees. For each baseline name the tool call that produced it, so the same measure can be re-run in 90 days."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "List the obstacles to the future state, classified as structural, capability or authority, and decide for each whether to remove or route around it — stating the cost of routing around. Apply Kotter's point that visible unremoved blockers signal the change is optional."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Design three engineered quick wins — visible, unambiguous, measurable in the K&S data, deliverable in 90 days with existing resources — each with baseline, target, measurement date, reporter and publication venue. Sequence them across INITIATE / EMBED / BUILD, explaining which win buys credibility for the next. Ensure each has a manual fallback. Close with the anti-victory statement that celebrates the first win without declaring the change finished."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Quick wins — 90 day plan (W9)');


-- ---------------------------------------------------------------------
-- 9. Kotter readiness review (W9)   [the eight ERRORS, as a rubric]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Kotter readiness review (W9)',
  'assistant',
  $md$
Review a change plan against the eight ways Kotter says transformations fail.
Run this on your own group's plan before you present it.

Kotter frames his article around errors rather than steps for a reason: the
steps describe what success looks like, but the errors describe what people
actually do. Review against the errors.

**Paste the plan into your request**, or name the workflow runs that produced
it.

## The rubric

Assess each, Met / Partially met / Not met, with the specific evidence from
the plan — quote it — and what would have to change.

| # | Error | The test to apply |
|---|---|---|
| 1 | Not establishing a great enough sense of urgency | Is there evidence a sceptic could not dismiss? Kotter's marker: roughly 75% of management genuinely convinced the status quo is unacceptable. Would 75% of K&S agree? |
| 2 | Not creating a powerful enough guiding coalition | Does it have position power, expertise, credibility and leadership? Does it extend beyond the formal hierarchy? Is it led by a line leader rather than a staff function? |
| 3 | Lacking a vision | Can it be conveyed in five minutes and produce understanding *and* interest? Or is it a set of plans and programmes? |
| 4 | Undercommunicating the vision by a factor of ten | Does it use existing channels and routine business, repeatedly? Is there a walk-the-talk commitment by a named person? |
| 5 | Not removing obstacles to the new vision | Are the big obstacles confronted, or all of them routed around? Is any obstacle a person with authority, and is that addressed? |
| 6 | Not systematically planning for and creating short-term wins | Are wins **engineered** with baselines and dates, or merely hoped for? |
| 7 | Declaring victory too soon | Is there an explicit anti-victory rule? Does the plan run past the first win? |
| 8 | Not anchoring changes in the corporation's culture | Does it say how the new way becomes "how we do things here" — through demonstrated results, promotion criteria, and succession? |

## Additional tests from this week

- **Rogers and Bell — structural realism.** Does the plan account for the
  partnership incentive structure, or does it assume goodwill will overcome
  it? Does it identify a translation layer with legitimacy?
- **D × V × F > R.** Is any term effectively zero? If so the plan fails
  regardless of how good the other three are.
- **Measurement.** Does every claimed improvement have a baseline drawn from
  the K&S data and a date? *"If a change happens in the forest…"*
- **Honesty test.** Does the plan admit any uncompensated loss, or does it
  claim everyone wins? A plan where everyone wins has not been tested against
  a sceptical reader.
- **Tolerance rule.** *"Tolerance for mistakes: for people (high); for
  technology (zero)."* Does the plan assume people will be perfect, or that
  the tooling will be?

## Output

The eight-error scorecard with quoted evidence; the additional tests; the
three highest-priority gaps in order; and a single sentence naming the most
likely cause of failure for this specific plan.

## Constraints

- Be a hard marker. A plan that scores "Met" on all eight has almost
  certainly not been read carefully — Kotter's whole point is that these
  errors are the norm, not the exception.
- Quote the plan when you assess it. An assessment that does not cite the
  text cannot be acted on.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Kotter readiness review",
    "steps": [
      {
        "role": "review",
        "position": 1,
        "depends_on": [],
        "instruction": "Score the plan against all eight Kotter errors — Met / Partially met / Not met — quoting the specific text of the plan as evidence for each and stating what would have to change. Apply the stated test for each error, including whether roughly 75% of K&S management would genuinely agree the status quo is unacceptable."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Apply the additional tests: structural realism against the partnership incentive model and the presence of a legitimate translation layer (Rogers & Bell); whether any term of D x V x F is effectively zero; whether every claimed improvement carries a K&S baseline and a date; whether any uncompensated loss is admitted; and whether the plan assumes perfect people or perfect technology."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Rank the three highest-priority gaps with what to do about each, and close with one sentence naming the most likely cause of failure for this particular plan. Be a hard marker — flag explicitly if the plan scored well everywhere, since that usually indicates a shallow reading rather than an excellent plan."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Kotter readiness review (W9)');


-- ---------------------------------------------------------------------
-- 10. Week 9 change pack (W9)   [assessment deliverable · export]
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
  'Week 9 change pack (W9)',
  'assistant',
  $md$
Assemble your group's change management approach into the deliverable, and
export it.

Run this **after** the urgency, coalition, vision, impact-assessment,
resistance, expectancy and quick-wins workflows. It consumes their outputs.

## What the pack contains

1. **The case for change** — one page, evidence-led, from *Change urgency*.
   Lead with the number.
2. **The vision** — one page plus the three-sentence spoken version, and what
   is explicitly protected.
3. **Guiding coalition and diffusion map** — who leads, who you start with,
   and why.
4. **Change impact assessment** — the per-persona table from the tabular
   review, exported as a grid.
5. **Resistance and loss** — classified, with matched responses and the
   honest list of what you cannot compensate.
6. **Motivation design** — the E × I × V table and the interventions.
7. **90-day plan** — obstacles, three engineered quick wins with baselines,
   targets and dates, and the anti-victory rule.
8. **Measurement appendix** — every baseline with the K&S query that produced
   it, so the next cohort can re-run them.

## Method

1. **Gather and de-duplicate.** The same root cause will appear in the
   urgency evidence, the resistance map and the obstacle list under three
   different names. Collapse them and say so — that collapsing is analysis,
   not tidying.
2. **Check the golden thread.** Every intervention must trace back to a
   documented problem, and every documented problem must have an
   intervention or an explicit decision not to address it. Produce that
   traceability as a short table. A recommendation with no problem behind it
   is a solution someone brought with them.
3. **Save reusable artefacts** with `save_clause`, tagged `w9`: the change
   impact assessment template, the quick-win measurement card, and the
   communication plan skeleton. These outlive the assessment.
4. **Create the commitments** with `add_list_item` on the project — the
   90-day actions, each with a named owner and a real due date. This passes
   through the approval gate; read what you are approving.
5. **Export** to DOCX or PDF. Choose the **Process report** rather than the
   Output report if you want the reasoning and the partner-review verdicts
   visible — for a change plan, showing how you reached a position is often
   more persuasive than the position.

## Constraints

- Maximum ten pages excluding appendices. Kotter's failure example is a
  four-inch-thick book of procedures; length is not rigour.
- Every number must carry its source. A figure without a tool call behind it
  will be marked as an assertion.
- **"Don't wait for perfect, you'll always be waiting."** Submit the plan
  that could start on Monday over the plan that would be complete in a month.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Week 9 change pack",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Gather the outputs of the earlier Week-9 workflows and de-duplicate aggressively — identify where the same root cause appears under different names across the urgency evidence, resistance map and obstacle list, and collapse them, stating what was merged and why. Re-verify the headline figures with ks_get_matter and ks_time_ledger so nothing stale reaches the pack."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Assemble the eight sections in order, keeping to ten pages excluding appendices. Build the golden-thread traceability table linking every intervention to a documented problem and every problem to an intervention or an explicit decision not to act. Save the reusable templates with save_clause tagged w9: change impact assessment, quick-win measurement card, communication plan skeleton."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Create the 90-day commitments as list items via add_list_item, each with a named owner and real due date, warning the student that this passes through the approval gate. Then check every number carries its source, flag any unsourced assertion, and advise on the export: Output report versus Process report, noting that for a change plan the visible reasoning and review verdicts are often the more persuasive artefact."
      }
    ]
  }$json$
where not exists (select 1 from workflows w where w.title = 'Week 9 change pack (W9)');


-- =====================================================================
-- PLAYBOOK — change management standards
-- =====================================================================
insert into playbooks (owner_id, name, agreement_type, description)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30',
       'Change management standards (W9)',
       'Firm policy',
       'What Kendry & Slate expects of any change initiative, drawn from Kotter (1995), Rogers & Bell (2022), Rogers'' diffusion curve, Vroom''s expectancy theory and the D x V x F > R formula. Used to review a proposed change approach. Teaching material for LAWS3850 Week 9.'
where not exists (select 1 from playbooks where name = 'Change management standards (W9)');

insert into playbook_rules (playbook_id, position, topic, preferred, acceptable_fallback, dealbreaker, severity, notes)
select p.id, v.position, v.topic, v.preferred, v.acceptable_fallback, v.dealbreaker, v.severity, v.notes
from playbooks p
cross join (values
  (1, 'Evidence for urgency',
   'The case for change leads with figures drawn from the practice-management data, each traceable to a query that can be re-run.',
   'Qualitative evidence from named people, attributed and dated, where the data does not yet exist.',
   'Urgency asserted from opinion alone, or from a crisis that has been manufactured for effect.',
   'high',
   'THE FIRST OF THE TWO RULES A CHANGE PLAN MOST OFTEN FAILS. Kotter error 1. Rogers & Bell: lawyers require data establishing the need. An overstated case spreads scepticism "like an oil slick".'),
  (2, 'Guiding coalition',
   'Coalition has position power, expertise, credibility and leadership, extends beyond the formal hierarchy, and is led by a line leader.',
   'A smaller coalition with a named plan to grow it, and an identified executive sponsor.',
   'Change driven by a staff function alone, or by one enthusiast with no positional power.',
   'high',
   'Kotter error 2: groups without strong line leadership never achieve the power required.'),
  (3, 'Vision',
   'Conveyable in five minutes, producing understanding and interest; states what changes AND what is explicitly protected.',
   'A longer vision with a tested five-minute version prepared for verbal delivery.',
   'A set of plans, budgets or programmes presented as a vision.',
   'high',
   'Kotter error 3. Naming what is protected is the highest-leverage element for a partnership audience.'),
  (4, 'Communication',
   'Rides on existing routine forums, repeatedly, with a named person committed to a visible walk-the-talk behaviour.',
   'A defined communication schedule with named owners, even if new forums are required.',
   'A single launch announcement with no repetition, or senior behaviour that visibly contradicts the message.',
   'high',
   'Kotter error 4 — undercommunication by a factor of ten. Inconsistent senior behaviour is the fastest killer.'),
  (5, 'Impact assessment',
   'Every affected persona has change type, current state, future state, degree of impact, what they lose, and a transition strategy with a named owner.',
   'Impact assessed by role group rather than individual, where the population is large.',
   'No impact assessment, or one that records no loss for anyone.',
   'high',
   'Prosci CIA structure per the Week-9 slide. "People are resistant to loss, not change" — a CIA with no losses has not been done.'),
  (6, 'Motivation',
   'Expectancy, Instrumentality and Valence tested per persona, with the reward system checked for contradiction.',
   'Motivation addressed for the most affected groups, with a stated reason for excluding others.',
   'Reliance on communicating benefits as the sole motivational mechanism.',
   'medium',
   'Vroom. The multiplicative form means a zero on any term is fatal; Instrumentality usually fails first because the reward system measures something else.'),
  (7, 'Quick wins',
   'At least three engineered wins, each visible, unambiguous, measurable against a captured baseline, and deliverable within 90 days.',
   'Two engineered wins where scope genuinely does not support three.',
   'Wins that are hoped for rather than planned, or that cannot be measured with data the firm captures.',
   'high',
   'Kotter errors 5 and 6. "Creating short-term wins is different from hoping for short-term wins."'),
  (8, 'Not declaring victory early',
   'An explicit anti-victory rule stating what will be said when the first win lands, and a plan that runs beyond it.',
   'A stated review point after the first win with criteria for continuing.',
   'The programme is scheduled to close at the first success.',
   'medium',
   'Kotter error 7. Celebrating a win while keeping urgency is a specific skill; write the sentence in advance.'),
  (9, 'Anchoring in culture',
   'States how the new way becomes normal: demonstrated results, promotion and assessment criteria, and succession.',
   'A defined owner for embedding, with a date for revisiting assessment criteria.',
   'No consideration of how the change survives its sponsor leaving.',
   'medium',
   'Kotter error 8. Rogers & Bell: the partnership structure resists changes that outlast the individuals who championed them.'),
  (10, 'Structural realism',
   'The plan names the incentive structures working against it — billable-hour targets, realisation, profit-sharing horizons — and either addresses them or states the accepted risk.',
   'Structural barriers documented and escalated to those with authority to change them.',
   'A plan that assumes goodwill will overcome the incentive system.',
   'high',
   'THE SECOND OF THE TWO RULES A CHANGE PLAN MOST OFTEN FAILS. Rogers & Bell''s central structural finding. This is the rule most change plans fail, and failing it quietly is worse than failing it loudly.'),
  (11, 'Honest losses',
   'The plan states which losses cannot be compensated and who bears them.',
   'Losses documented with a commitment to revisit compensation.',
   'A plan asserting that everyone benefits.',
   'medium',
   'A sceptical professional audience will find the unacknowledged loss faster than you can present past it.'),
  (12, 'Measurement',
   'Every claimed improvement has a baseline figure, a target, a date, a named reporter and a publication venue.',
   'Baseline and target defined, with measurement responsibility assigned even if the venue is undecided.',
   'Improvements claimed without a baseline, or measures that cannot be produced from captured data.',
   'high',
   '"If a change happens in the forest but nobody is around to measure it, did it make a difference?"')
) as v(position, topic, preferred, acceptable_fallback, dealbreaker, severity, notes)
where p.name = 'Change management standards (W9)'
  and not exists (select 1 from playbook_rules r where r.playbook_id = p.id and r.position = v.position);


-- =====================================================================
-- CLAUSES / TEMPLATES
-- =====================================================================
insert into clauses (owner_id, title, agreement_type, body, guidance, tags)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30', v.title, v.agreement_type, v.body, v.guidance, v.tags
from (values
  ('Change impact assessment — persona row (W9)', 'Internal',
   E'Persona: [name, role, part in the matter]\nChange type: [process / technology / role / mindset — be specific about which practices are touched]\nCurrent state: [how they actually work today, behaviourally, with evidence]\nFuture state: [how they work after — describe a Tuesday morning]\nDegree of impact: [Low / Medium / High / Critical — impact ON THEM, not their importance to you]\nWhat they lose: [autonomy / status / routine / expertise-based value / discretion / time]\nAdoption effort: [time to proficiency, including the productivity dip]\nCost of non-adoption: [$, using their charge-out rate]\nTransition strategy: [intervention — owner — date]\nAdoption signal: [the observable behaviour that proves it, visible in the data]',
   'The slide''s CIA structure with two additions that do the real work: "what they lose" and "adoption signal". If the loss row says "nothing", the assessment is incomplete — even a beneficial change costs someone the competence they had built. If the adoption signal is a survey response rather than an observable behaviour, you cannot tell whether the change happened.',
   array['w9','change','impact-assessment','teaching']),
  ('Quick-win measurement card (W9)', 'Internal',
   E'Win: [what visibly improves]\nWhy it is visible: [who outside the coalition notices, and how]\nBaseline: [figure] measured on [date] via [K&S query or tool call]\nTarget: [figure] by [date]\nReported by: [name] · Published at: [forum]\nManual fallback: [what happens if the tooling fails]\nWhat this win buys: [the next, harder step it makes possible]\nAnti-victory line: [the sentence that celebrates without declaring the change finished]',
   'Kotter''s distinction between creating and hoping for short-term wins. The baseline must be captured BEFORE the intervention or the before/after will be contested — and it will be contested, by people trained to contest things. The manual fallback exists because "tolerance for mistakes: for people (high); for technology (zero)".',
   array['w9','change','quick-wins','teaching']),
  ('Change communication plan skeleton (W9)', 'Internal',
   E'Audience: [group or named person]\nThe one thing they need to know: [not the whole vision]\nWhat they will ask first: [be honest — it is usually about them]\nDelivered by: [name] — believed by this audience because [reason]\nChannel: [existing forum] · Cadence: [frequency over 90 days]\nWhat would destroy credibility: [the specific inconsistent behaviour]\nWalk-the-talk commitment: [named person, visible behaviour, by date]',
   'Kotter''s error 4 is undercommunication by a factor of ten, so the cadence column matters more than the wording. The "delivered by / believed because" pairing is the trust element from the Ipsos ranking discussion: a true message from an untrusted source is worse than silence, because it burns the opportunity.',
   array['w9','change','communication','teaching']),
  ('Resistance response record (W9)', 'Internal',
   E'Person / group: [name]\nWhat they lose: [specific]\nResistance type: [Rational / Structural / Identity / Experiential]\nEvidence: [what they said or did, or what the data shows]\nResponse: [compensate · honest trade-off · fix the incentive · involve in design · evidence + reversible first step]\nOwner: [name] · By: [date]\nIf their objection is correct: [what changes in the plan]\nUncompensated? [yes/no — if yes, who bears it and has that been said out loud]',
   'The "if their objection is correct" line is the point of the record. Resistance treated as an obstacle to be overcome produces worse plans than resistance treated as information. Rogers & Bell''s participants describe lawyers'' scepticism as conducive to good change when engaged — a convinced sceptic is your most credible advocate precisely because everyone knows they were hard to convince.',
   array['w9','change','resistance','teaching']),
  ('D × V × F > R scorecard (W9)', 'Internal',
   E'Change: [what is being proposed]\n\nD — Dissatisfaction with the status quo: [0-5]\n  Who is actually dissatisfied (not who should be): [names]\n  Evidence: [data or quotes]\nV — Vision of what is possible: [0-5]\n  Is a future state articulated, or only complaints? [assessment]\nF — First concrete steps: [0-5]\n  What could someone do on Monday? [specific]\nR — Resistance: [0-5]\n  Named sources: [structural / identity / rational / experiential]\n\nProduct (D × V × F): [n] vs R: [n]\nWeakest term: [which] → effort goes here first\nWhy the usual answer is wrong: [most programmes over-invest in V and under-invest in D]',
   'Beckhard-Harris. The multiplicative form is the teaching point: a brilliant vision multiplied by zero dissatisfaction is zero. Scoring D honestly is uncomfortable in a firm that is currently profitable, which is exactly why it is the term to score first.',
   array['w9','change','dvf','teaching'])
) as v(title, agreement_type, body, guidance, tags)
where not exists (select 1 from clauses c where c.title = v.title);

-- =====================================================================
-- SUPERSEDED — remove the v1 Week-9 stub
-- 'Change plan — Kotter 8-step (W9)' is a 175-character prompt that the
-- workflows above replace (urgency, coalition, vision, communication and the
-- readiness review each do a piece of it, properly). Guarded: it only goes if
-- no tabular review was ever built from it, and workflow_shares cascades.
-- =====================================================================
delete from workflows w
where w.title = 'Change plan — Kotter 8-step (W9)'
  and length(coalesce(w.prompt_md, '')) < 500
  and not exists (select 1 from tabular_reviews tr where tr.workflow_id = w.id);

commit;
