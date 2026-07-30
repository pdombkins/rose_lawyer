-- =====================================================================
-- LAWS3850 (T2 2026) — WEEK 8 v2
-- Professional ethics · Client experience (CX) · Employee experience (EX)
--
-- Replaces the eight thin Week-8 workflows (117–214 char prompts, all
-- type='assistant') with detailed prompts anchored in the Week-8 slides and
-- readings, and adds exercises that exercise the rest of Rose: tabular review,
-- deep-verify, knowledge base + playbooks, clauses, lists and export.
--
-- SOURCES ANCHORED IN THE PROMPTS
--   Rogers & Dombkins (2021) 'Balancing LPM with lawyers' professional
--     obligations' (2021) 81 LSJ 68.
--   Legg (2025) 'Better than a bot — instilling ethical judgement into the
--     lawyers of the future in the age of AI' Griffith Law Review 1.
--   Green (2017) 'Culture Hacker' chs 1–2.
--   Harvard Business Review (3 May 2023) 'Elevating the Value of Customer
--     Service through a Data-Driven Approach'.
--   Office of the NSW Legal Services Commissioner, 'Avoiding complaints'.
--   Legal Profession Uniform Law (NSW) ss 3, 172, 173; Legal Profession
--     Uniform Law Australian Solicitors' Conduct Rules 2015 rr 4, 7, 9, 17,
--     19, 37; Fair Work Act 2009 (Cth); Work Health and Safety Act 2011 (Cth).
--   Federal Court GPN-AI; Practice Note SC Gen 23; District Court GPN 2;
--     Law Society of NSW, 'A Solicitor's Guide to Responsible Use of AI'.
--
-- IMPORTANT — the prompts deliberately require students to VERIFY every rule
-- reference rather than trusting the model's recall. Rose's Jade/AustLII gate
-- and the Deep-verify report exist for exactly this, and Week 8 is where the
-- Legg reading makes that pedagogically explicit.
--
-- K&S DATA ACCESS (updated 30 Jul 2026)
-- The prompts below reference Rose's first-class K&S tools, which replaced the
-- public MCP endpoint when the systems merged:
--   ks_list_matters · ks_get_matter · ks_list_tasks · ks_time_ledger
--   ks_list_staff   · ks_record_time_entry (write — approval-gated)
-- Scope is enforced server-side: a student sees their group's matter plus the
-- shared NexaCare matter. ks_time_ledger also returns `operator_name`, the real
-- student who recorded an entry as distinct from the fee earner it is booked to.
--
-- INSTRUCTOR: workflows are instructor-owned and shared to the cohort.
-- Run in the Supabase SQL editor against the Rose.Lawyer project.
-- =====================================================================

begin;

-- Instructor account that owns the shared teaching content.
create temporary table if not exists _w8_owner as
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30'::text as user_id;


-- =====================================================================
-- PART 1 — DEEPEN THE EIGHT EXISTING WEEK-8 WORKFLOWS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. LPM ethics check (W8)
-- The Week-8 debate made operational. Now names the specific obligations
-- from the slide deck and forces the student to locate the conflict rather
-- than accept a generic "consider your ethical duties" answer.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Test a proposed commercial or delivery decision against the professional
obligations it actually engages, and identify where commercial pressure and
professional duty pull in opposite directions.

**Describe the proposed action in your request.** For example: "compress
diligence by two weeks and rely on AI first-pass review", "write down Aisha's
time so we land on the estimate we gave the client", or "report the workstream
as green because we expect to recover next week".

## Obligations to test against

Assess the action against each of these, and say explicitly which are engaged,
which are not, and why:

| Obligation | Source | The question to ask |
|---|---|---|
| Competence, diligence, promptness | ASCR r 4 | Does the compressed approach still deliver a reasonable standard of care? |
| Avoid unnecessary delay and cost | LPUL s 173 | Is the delay or cost avoidable, and who benefits from it? |
| Client empowerment and informed choice | LPUL s 3; ASCR r 7 | Does the client have what they need to make an informed decision? |
| Fair and reasonable costs | LPUL s 172 | Would the client regard this charge as fair if they saw how it arose? |
| Clear and timely communication | ASCR r 7 | Has the client been told about the change, the delay, or the cost? |
| Confidentiality | ASCR r 9 | Does the tool, platform or collaboration expose client information? |
| Avoidance of personal bias | ASCR r 17 | Whose interest is really driving this decision? |
| Duty to the court | ASCR r 19 | Does anything here risk misleading a court or tribunal? |
| Supervision of legal services | ASCR r 37 | Who is checking the AI-assisted or junior-produced work, and how? |
| Collegiality and wellbeing | Fair Work Act 2009 (Cth); WHS Act 2011 (Cth) | What does this decision cost the team? |

## Method

1. **Restate the action** in one sentence, and name who benefits from it and
   who bears the risk. Be specific — "the client" and "the firm" are not
   answers; name the person or role.
2. **Map the touchpoints.** For each obligation above, mark it Engaged / Not
   engaged / Unclear, with a one-line reason. Do not pad: an honest "not
   engaged" is more useful than a strained connection.
3. **Locate the conflict.** Rogers and Dombkins argue LPM mostly *supports*
   professional obligations — better planning means better cost control,
   clearer scope, better supervision. Identify where that holds here, and
   where it inverts: where the LPM discipline itself (the estimate, the task
   list, the status report) is what creates the ethical pressure.
4. **Apply the challenge scenarios** from the Week-8 slides where relevant:
   - Should a lawyer undertake out-of-scope work to deliver a successful outcome?
   - Should a lawyer deliver lower-quality work when directed to?
   - Can the firm charge the client for LPM itself?
   - Does the client understand the scope they actually need?
   - Are estimates accurate, or are juniors writing down time to meet them?
   - Are risks, effort or costs being under-played to win the work?
   - Is this watermelon reporting — green on the outside, red on the inside?
   - Does standardisation reduce the lawyer's capacity and responsibility for
     independent professional judgement?
5. **Name the ethical fading.** Legg's central point is that unethical choices
   rarely announce themselves; the ethical dimension quietly disappears from a
   decision framed as commercial, technical or administrative. State plainly
   what language in the proposed action is doing that work here — "efficiency",
   "commercial reality", "the client is fine with it", "everyone does this".
6. **Recommend.** Give a modified approach that keeps the commercial benefit
   where one exists, or say clearly that it cannot be salvaged. Identify what
   must be escalated to a partner, and what requires client disclosure or
   consent before proceeding.

## Constraints

- Every rule reference you rely on must be **verified, not recalled**. State
  the rule number and what you say it requires, then flag it for verification.
  Run *Professional obligations — verify before you rely (W8)* on your output.
- Do not give legal advice. This is a teaching exercise about how a lawyer
  reasons, not a substitute for professional judgement.
$md$,
  practice = 'Legal Project Management',
  jurisdictions = array['NSW','Cth'],
  plan_template = $json${
    "title": "LPM ethics check",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Restate the proposed action in one sentence. Name specifically who benefits and who bears the risk — identify people or roles, not 'the client' or 'the firm'. Then map it against each obligation in the table (ASCR rr 4, 7, 9, 17, 19, 37; LPUL ss 3, 172, 173; Fair Work Act; WHS Act), marking each Engaged / Not engaged / Unclear with a one-line reason. An honest 'not engaged' is better than a strained connection."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Locate the conflict. Identify where LPM discipline supports the obligations (per Rogers and Dombkins) and, more importantly, where the LPM artefact itself — the estimate, the task list, the status report — is what generates the ethical pressure. Apply the Week-8 challenge scenarios that fit. Rate each conflict by severity and by how likely it is to go unnoticed."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Name the ethical fading. Quote the specific words in the proposed action that reframe an ethical choice as a commercial, technical or administrative one. Then recommend: a modified approach that preserves any legitimate commercial benefit, or a clear statement that it cannot be salvaged. Identify what must go to a partner and what requires client disclosure or consent. Finally, list every rule reference relied on, flagged as requiring verification."
      }
    ]
  }$json$
where title = 'LPM ethics check (W8)';


-- ---------------------------------------------------------------------
-- 2. Client happy-path map (W8)
-- Now built on the actual CX lifecycle from the slide deck, with the
-- backstage layer that the original omitted entirely.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Map the ideal client journey for a matter across the four CX lifecycle stages,
then contrast it with what actually happened.

CX is "the sum total of the client's perceptions and feelings from interactions
with a service provider" — and it is where the service promise is made or
broken. Most CX failures in legal services are **communication** failures, not
legal ones. This exercise is designed to make that visible.

## The lifecycle to map against

**Onstage — what the client sees**

| Stage | Happy-path steps |
|---|---|
| Awareness & Consideration | Needs identified · Self service · Legal request |
| Engagement & Onboarding | First conference · Scope of work & LoE · Initiate work |
| Legal Service Delivery | Matter updates · Advice provision |
| Aftercare & Loyalty | Close & Billing · Client feedback · Further needs · After-matter review |

**Backstage — what makes it possible:** Origination · Prioritisation ·
Requirements confirmation · Team management · Work management · Business
partnering.

**Foundations:** Strategy, People and Clients; Financial performance;
Processes, technology and data.

## Method

1. **Choose a persona and hold to it.** Every judgement below is from their
   point of view, not the firm's:
   - *Dr Alexandra Keller*, CEO, NexaCare Health — "I need legal partners who
     understand the urgency and the stakes."
   - *Jonathan Wu*, General Counsel — "No surprises. I want disciplined
     scoping, clear communication, and a commercial approach."
   - *Daniel Okoye*, CIO — "Zero data loss, zero surprises. Clinical operations
     can't skip a beat during EHR migration."
   - *Isabel Moreno*, Head of Corporate Development — "Great deals are built on
     a tight thesis, clean data, and disciplined execution."
2. **For each step, specify the ideal.** What the client sees, hears and feels;
   what "good" looks like concretely (not "timely communication" but "a written
   update every Friday by 5pm naming what moved and what is at risk"); and the
   backstage activity that has to work for it to happen.
3. **Mark the moment of truth in each stage** — the single interaction where
   the service promise is most likely to break. Justify the choice.
4. **Contrast with the actual matter.** Use the K&S practice-management
   connector to ground this in evidence rather than impression: `ks_get_matter`
   and `ks_list_tasks` for status and phase, `ks_time_ledger` for what the firm
   was actually doing and when. Where the record shows a gap between two client
   touchpoints, say so and quantify it in days.
5. **Score each stage** Red / Amber / Green against the persona's stated
   priorities, and give the single highest-value fix per stage.

## Output

A stage-by-stage map, a RAG summary line, and a prioritised backlog of no more
than six improvements. For each improvement give the owner, the effort (S/M/L)
and the specific persona expectation it serves.

## Constraints

- Do not invent client feedback. If you have no evidence of how the client felt,
  say the evidence is absent — that absence is itself a finding, and it is the
  point of the HBR data-driven reading.
$md$,
  practice = 'Legal Project Management',
  plan_template = $json${
    "title": "Client happy-path map",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Confirm the chosen persona and quote their stated priority verbatim. Then gather evidence from the K&S practice-management tools: ks_get_matter for status, fee basis and totals; ks_list_tasks for phase, workstream, status and due dates; ks_time_ledger for what was actually being done and when. Build a dated timeline of client-facing touchpoints, and explicitly note the gaps between them in days."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Map the ideal journey across all four lifecycle stages and every happy-path step. For each step give: what the client sees/hears/feels, a concrete definition of good (specific enough to be auditable — a cadence, a format, a named owner), and the backstage activity that must work. Mark one moment of truth per stage and justify it."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [1, 2],
        "instruction": "Contrast ideal against actual using the timeline from step 1. Score each stage RAG from the persona's point of view, citing the specific evidence. Where evidence of client sentiment is absent, state that plainly rather than inferring it. Produce a prioritised backlog of at most six improvements with owner, effort and the persona expectation each serves."
      }
    ]
  }$json$
where title = 'Client happy-path map (W8)';


-- ---------------------------------------------------------------------
-- 3. Client experience (CX) audit & scorecard (W8)
-- Was a bare "produce a RAG scorecard". Now specifies the measurement
-- basis (NPS), the evidence source (the K&S tools), and the
-- employee-experience link that the Green reading demands.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Audit the client experience on a live matter and produce a defensible
scorecard — one built on evidence from the practice-management record, not on
impressions.

## Why measurement matters here

The HBR reading argues that client feedback only improves service when it is
treated as data: collected systematically, segmented, and connected to
operational decisions. NPS asks one question — *how likely are you to retain
and recommend us, 0–10* — and splits responses into Promoters (9–10), Passives
(7–8) and Detractors (0–6). The score is Promoters% minus Detractors%. Its
value is not the number; it is that it forces a consistent question across
every client and every matter, so trends become visible.

## Method

1. **Establish the evidence base.** From the K&S tools: `ks_get_matter` (fee
   type, hourly rate, fixed fee, total fees, dates), `ks_list_tasks` (status,
   phase, workstream, due dates, estimated vs actual hours) and
   `ks_time_ledger` (who did what, when, at what cost). Record what you
   found and, just as importantly, what the system does *not* capture.
2. **Score each touchpoint** across the four lifecycle stages on:
   - **Responsiveness** — elapsed time between a client input and a firm response.
   - **Transparency** — did the client know the position without having to ask?
   - **Cost predictability** — variance between estimate and actual, and
     whether the client was told before or after it materialised.
   - **Effort** — how much work the client had to do to get what they needed.
3. **Apply the OLSC complaint drivers** as a checklist, since these are what
   actually generate complaints to the regulator: file notes and record
   keeping; checklists and conflict checks; regular communication about the
   client's values and priorities; expectation management on delays, process
   changes, cost increases and scope; prompt responses to queries; professional
   handling of inbound calls; and clear costs disclosure.
4. **Predict the NPS.** For your chosen persona, predict their 0–10 score and
   justify it against the evidence. Then state what single change would move
   them one band — Detractor to Passive, or Passive to Promoter.
5. **Connect to the employee experience.** Green's argument is that the client
   experience is a reflection of what is happening inside the organisation:
   "what you reap on the inside is what you sow on the outside." For each Red
   or Amber touchpoint, ask whether the cause is an EX problem — capacity,
   unclear ownership, an unsustainable deadline, missing supervision — rather
   than a client-facing failure. Use `ks_time_ledger` grouped by lawyer to
   test this rather than speculating.

## Output

A RAG scorecard by touchpoint; a predicted NPS with reasoning; a ranked
improvement backlog; and a short section headed "What this tells us about the
inside", linking CX symptoms to EX causes.

## Constraints

- Distinguish evidence from inference throughout. Label inferences as such.
- Absence of data is a finding. If the record cannot tell you how the client
  experienced a stage, say so and note what the firm would have to start
  capturing.
$md$,
  plan_template = $json${
    "title": "CX audit & scorecard",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Build the evidence base from the K&S tools: ks_get_matter, ks_list_tasks and ks_time_ledger. Produce a factual summary — fee basis, total fees, task counts by status and phase, estimated vs actual hours where both exist, and time recorded by lawyer. Explicitly list what the practice-management system does NOT capture about the client's experience."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Score every touchpoint across the four lifecycle stages on responsiveness, transparency, cost predictability and client effort, citing the specific evidence for each score. Then run the OLSC complaint-driver checklist and mark each item met / not met / no evidence. Label every inference as an inference."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Predict the persona's NPS score 0-10 with reasoning tied to the evidence, and state the single change that would move them one band. Then write 'What this tells us about the inside': for each Red or Amber touchpoint, test whether the root cause is an employee-experience problem, using time recorded by lawyer as evidence. Finish with a ranked improvement backlog."
      }
    ]
  }$json$
where title = 'Client experience (CX) audit & scorecard (W8)';


-- ---------------------------------------------------------------------
-- 4. Service recovery response (W8)
-- The CX/ethics tension made concrete: an apology that is good service may
-- be a bad admission. Retains that teaching point and sharpens it.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Draft a service recovery response to a client after the firm has got something
wrong — and identify precisely where good client service and legal risk pull
against each other.

**Describe the failure in your request.** For example: "we missed the lease
consent deadline for the Parramatta premises", "the client found out about the
cost overrun from the invoice", or "we reported the workstream green for three
weeks while it was slipping".

## Why this exercise exists

Service recovery is the highest-leverage moment in CX: a well-handled failure
produces more loyalty than no failure at all. But in legal services the natural
recovery move — a full, warm, unqualified apology — can be an admission that
engages the firm's professional indemnity position. **This tension is the
exercise.** Resolving it well is a professional skill; collapsing it in either
direction is a failure.

## Method

1. **Establish the facts before the feelings.** What happened, when, who knew,
   and when the client learned of it. Use the K&S tools where it helps
   (`ks_list_tasks` for due dates and status history, `ks_time_ledger` for what
   the team was doing in the relevant window). Separate what is documented from
   what is assumed.
2. **Assess the client impact** from the persona's point of view, not the
   firm's. What did this cost them — commercially, operationally, in their own
   standing with their board or executive?
3. **Draft the response.** Structure: acknowledge specifically (not "any
   inconvenience"); explain without excusing; state what is being done now,
   with a date and a named owner; state what changes so it does not recur;
   invite a direct conversation. Match the register to the persona.
4. **Run the admission check — this is the assessed part.** Mark every sentence
   of your draft that could be read as an admission of negligence, breach of
   retainer, or acceptance of liability for loss. For each, give:
   - the words at issue,
   - why they are a good CX move,
   - what they risk professionally,
   - a redraft that preserves as much of the CX value as possible, and
   - whether the residual version still needs partner or insurer sign-off.
5. **Test the fee response separately.** Any offer to write off or discount
   fees is both a service gesture and a costs decision under LPUL s 172. Say
   who has authority to make it and what disclosure it triggers.
6. **State the obligations engaged.** At minimum consider ASCR r 4 (competence
   and diligence), r 7 (clear and timely advice), and where the failure was
   concealed or reported optimistically, the honesty dimension of r 4.

## Output

The draft response, then a separate annotated table of admission-risk
sentences, then a one-line escalation recommendation: send as drafted / send
after partner review / do not send without insurer input.

## Constraints

- Never suppress the client's right to know something went wrong in order to
  protect the firm. Managing how something is said is legitimate; concealing it
  is not, and that distinction is the point of the exercise.
$md$,
  plan_template = $json${
    "title": "Service recovery response",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Establish the factual record: what happened, when, who knew internally, and when the client learned of it. Use the K&S tools (ks_list_tasks for due dates and status, ks_time_ledger for team activity in the window) where it helps. Separate documented fact from assumption. Then assess client impact from the persona's perspective — commercial, operational and reputational."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Draft the recovery response: acknowledge specifically, explain without excusing, state the remedial action with a date and named owner, state the systemic change, and invite a direct conversation. Match register and level of detail to the persona's stated priorities."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Run the admission check. Table every sentence readable as an admission of negligence, breach of retainer or acceptance of liability. For each give the words at issue, its CX value, its professional risk, a redraft preserving as much CX value as possible, and whether it still needs partner or insurer sign-off. Assess any fee write-off separately as a costs decision under LPUL s 172, naming who has authority. Conclude with a single escalation recommendation."
      }
    ]
  }$json$
where title = 'Service recovery response (W8)';


-- ---------------------------------------------------------------------
-- 5. Client feedback synthesis — data-driven CX (W8)
-- Now points at a real seeded verbatim set (see Part 4) so students analyse
-- data rather than inventing it, per the HBR reading.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Turn unstructured client feedback into something the firm can act on — themes,
sentiment, and a small number of decisions.

Use the seeded verbatim set **"K&S client feedback — NPS verbatims (W8)"** in
the Library, or paste your own comments into the request.

## Method

1. **Classify every comment.** NPS band (Promoter 9–10 / Passive 7–8 /
   Detractor 0–6), lifecycle stage it refers to, and whether it concerns the
   *legal work*, the *service around the work*, or *cost*. Keep the counts —
   the split between these three is usually the most instructive number in the
   set, and it is usually not what lawyers expect.
2. **Calculate the NPS** and show your working. Note the sample size and say
   honestly whether it supports the conclusions you are drawing. A score from
   nine responses is an anecdote with a decimal point.
3. **Theme the comments** bottom-up. Do not force them into the lifecycle
   stages if they do not fit; a theme that cuts across stages is a more
   important finding than a tidy taxonomy. Give each theme a frequency count
   and one representative verbatim quote.
4. **Separate signal from noise.** Which themes are systemic (recurring across
   clients and matters) and which are single-client and situational? The HBR
   argument is that firms routinely over-react to the loudest comment and
   under-react to the frequent one.
5. **Identify what the feedback cannot tell you.** Who is missing from this
   data? Clients who left, clients who never complained, and the client's wider
   team who never spoke to the firm directly. Non-response is data.
6. **Recommend three actions maximum**, each with an owner, a measure, and the
   theme it addresses. Then state, for each, what would have to be true in the
   next feedback round for you to conclude it worked.

## Output

A counts table, the calculated NPS with working, a ranked theme list with
quotes, a short "who is missing" note, and at most three recommended actions.

## Constraints

- Quote verbatims exactly. Do not paraphrase a client into sounding more
  reasonable, or more damning, than they were.
- Resist the urge to explain away Detractors. The reading's point is that the
  uncomfortable comment is the valuable one.
$md$,
  plan_template = $json${
    "title": "Client feedback synthesis",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Retrieve the feedback set — search the knowledge base for 'K&S client feedback NPS verbatims' if the user has not pasted comments. Classify every comment by NPS band, lifecycle stage, and whether it concerns the legal work, the service around the work, or cost. Produce the counts table and calculate NPS showing the working, including sample size and an honest statement about what that sample can support."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Theme the comments bottom-up with frequency counts and one exact representative quote each. Do not force themes into lifecycle stages. Separate systemic themes (recurring across clients) from situational ones, and say which the firm should act on first and why."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [2],
        "instruction": "Write the 'who is missing' note — clients who left, who never complained, and stakeholders who never spoke to the firm. Then recommend at most three actions, each with owner, measure, the theme it addresses, and what would have to be true next round to conclude it worked."
      }
    ]
  }$json$
where title = 'Client feedback synthesis — data-driven CX (W8)';


-- ---------------------------------------------------------------------
-- 6. Team experience (EX) & psychological-safety pulse (W8)
-- Grounded in Green ch 1-2 and in evidence from the time ledger rather than
-- speculation about how people feel. Care note preserved and strengthened.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Assess the employee experience on a matter team, using what the record can
actually show, and recommend management actions that are within a supervising
lawyer's remit.

## The argument you are testing

Green's claim in *Culture Hacker* chs 1–2 is that culture is the collective
mindset and attitude of employees; that it is a business responsibility rather
than an HR one, owned by leaders at every level; and that it transmits directly
to the client. He relies on the employee–customer–profit chain (Sears, HBR
1998) and on evidence such as Lowe's finding a seven-figure annual sales gap
between its highest- and lowest-engaged stores. Mercedes-Benz's Steve Cannon
puts it as "customer experience is the new marketing"; Michelle Crosby puts it
as "what you reap on the inside is what you sow on the outside."

Your job is to test that claim against this team, not to assume it.

## Method

1. **Build the load picture from evidence.** From the K&S tools:
   `ks_list_staff` for roles and rates; `ks_list_tasks` filtered by assignee for
   volume, phase and due dates; `ks_time_ledger` for hours actually recorded
   by person and when. Produce a table by team member: tasks open, tasks
   overdue, hours recorded, and the ratio of estimated to actual hours on their
   tasks.
2. **Read the distribution, not the total.** Look for: work concentrated on one
   person; juniors carrying tasks above their level without recorded
   supervision; seniors doing work well below their rate; and estimate-to-actual
   ratios that are consistently wrong in one direction for one person, which
   usually means either an unrealistic plan or unrecorded effort.
3. **Test the supervision question (ASCR r 37).** Where a junior produced work
   on a task, is there any record of it being reviewed? Absence of a review
   entry is not proof of absence of review — but it is a governance finding.
4. **Assess against the team's known working patterns.** James Bentley
   (partner) is sceptical of new tooling; Lily Chen over-commits; Aisha Rahman
   is a junior associate under time pressure on her first matter of this scale;
   David O'Connell is process-rigid and audit-focused. Use these as
   *hypotheses to test against the data*, not as conclusions.
5. **Identify the four EX levers** from Green that a supervising lawyer
   actually controls: clarity of expectations; recognition of contribution;
   the tools and training provided; and whether the work is distributed in a
   way a reasonable person could sustain.
6. **Recommend management actions** — concrete, assignable, and within a
   manager's remit. For each: the action, the owner, the week it happens, and
   the observable signal that it worked.

## Output

The load table, a short findings section separating evidence from hypothesis,
a supervision note, and at most five management actions.

## Constraints — read these before running

- **Stay non-clinical.** This is an exercise in management practice, not
  psychological assessment. Do not diagnose, do not speculate about anyone's
  mental health, and do not infer distress from workload data. Describe
  observable work patterns and their management implications only.
- These are fictional personas in a teaching case study. Any resemblance to
  the experience of people in the class is coincidental, and the exercise is
  not an invitation to discuss it.
- If real wellbeing concerns arise in discussion, they belong with UNSW
  support services, not with this workflow.
$md$,
  plan_template = $json${
    "title": "Team experience (EX) pulse",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Build the load picture from the K&S tools: ks_list_staff for roles and rates, ks_list_tasks by assignee for volume/phase/due dates/overdue counts, ks_time_ledger for hours recorded per person and when. Output a table by team member covering tasks open, tasks overdue, hours recorded, and estimated-to-actual ratio. Report only what the data shows."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Read the distribution. Identify concentration of work, juniors carrying tasks above their level, seniors doing work below their rate, and systematically wrong estimate-to-actual ratios. Test the supervision question under ASCR r 37: where a junior produced work, is any review recorded? Treat the known persona working patterns as hypotheses to test against data, and say clearly where the data does not support them. Separate evidence from hypothesis explicitly."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [2],
        "instruction": "Recommend at most five management actions against Green's four controllable levers — clarity of expectations, recognition, tools and training, and sustainable distribution of work. Each action needs an owner, a week, and an observable signal of success. Keep all language non-clinical and within a supervising lawyer's remit: describe work patterns and management responses, never individuals' psychological states."
      }
    ]
  }$json$
where title = 'Team experience (EX) & psychological-safety pulse (W8)';


-- ---------------------------------------------------------------------
-- 7. Workload & wellbeing rebalance (W8)
-- Now produces an actual reallocation with a costs consequence, so the
-- ethical trade-off (rate mix vs LPUL s 172) is unavoidable.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Produce a defensible reallocation of work across a matter team that protects a
sustainable pace and still meets the client's deadline — and be explicit about
what the reallocation costs.

## The trade-off you cannot avoid

Moving work off an overloaded junior and onto a senior associate protects the
team and the quality of the work. It also increases the cost to the client,
because the senior bills at a higher rate. Under LPUL s 172 costs must be fair
and reasonable; under ASCR r 4 the work must be competent and diligent; under
ASCR r 37 it must be properly supervised. These pull in different directions
and a real reallocation has to resolve them rather than pretend they agree.

## Method

1. **Establish current state** from the K&S tools: `ks_list_staff` (roles,
   hourly rate, cost rate), `ks_list_tasks` (open, overdue, estimated vs actual
   hours, assignee, phase) and `ks_time_ledger` (recorded hours by person).
2. **Identify the binding constraint.** Is it total capacity, a single person's
   capacity, a skills gap, a sequencing problem, or an unrealistic deadline?
   The right reallocation depends entirely on which, and teams routinely solve
   the wrong one.
3. **Propose the reallocation** task by task: who holds it now, who should
   hold it, and why. Where you move work *up* the seniority ladder, say so
   explicitly.
4. **Cost it.** Using the hourly rates, calculate the fee impact of the
   reallocation. Give the delta in dollars and as a percentage of fees recorded
   to date. Then answer directly: does this need to be disclosed to the client
   before it happens, and on what basis?
5. **Consider the alternatives to spending more.** Reducing scope, re-sequencing
   so a deadline moves rather than the team, using a template or precedent
   where bespoke drafting was assumed, or telling the client the date is not
   achievable. The Week-8 challenge scenarios apply here: is the firm about to
   deliver lower-quality work because it was directed to, or to absorb
   out-of-scope work to preserve the relationship?
6. **Set the guardrail.** State what must not be sacrificed to make the plan
   work — supervision of the junior's output, verification of AI-assisted
   research, and the client's right to be told if the date is at risk.

## Output

A before/after allocation table, the costed delta with a disclosure
recommendation, the alternatives considered and rejected with reasons, and the
guardrail statement.

## Constraints

- Do not produce a plan that only works if someone routinely works
  unsustainable hours. If the deadline cannot be met without that, the finding
  is that the deadline cannot be met — say so, and say who needs to be told.
- Keep the language of workload managerial and non-clinical.
$md$,
  plan_template = $json${
    "title": "Workload & wellbeing rebalance",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Establish current state from the K&S tools: ks_list_staff (role, hourly_rate, cost_rate), ks_list_tasks (open, overdue, estimated vs actual hours, assignee, phase) and ks_time_ledger (hours by person). Then identify the binding constraint — total capacity, individual capacity, skills gap, sequencing, or an unrealistic deadline — and justify which one it is from the data."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Propose the reallocation task by task with current holder, proposed holder and reason, flagging every move up the seniority ladder. Cost it using the hourly rates: give the fee delta in dollars and as a percentage of fees recorded to date."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Answer whether the cost increase must be disclosed to the client before it happens and on what basis (LPUL s 172; ASCR r 7). Set out the alternatives to spending more — scope reduction, re-sequencing, precedent reuse, or telling the client the date is not achievable — and say why each was accepted or rejected. State the guardrails that must not be sacrificed: supervision under ASCR r 37, verification of AI-assisted work, and the client's right to know the date is at risk. If the deadline is only achievable through unsustainable hours, say the deadline is not achievable and name who must be told."
      }
    ]
  }$json$
where title = 'Workload & wellbeing rebalance (W8)';


-- ---------------------------------------------------------------------
-- 8. Moments that matter — CX/EX map (W8)
-- The synthesis exercise. Sharpened so the CONFLICT cases are the output,
-- not an afterthought.
-- ---------------------------------------------------------------------
update workflows set
  prompt_md = $md$
Find the moments where client experience and employee experience reinforce each
other, and — more importantly — the moments where serving one damages the
other. The conflicts are the deliverable.

## Why this is the synthesis exercise

Green's argument implies CX and EX move together: look after your people and
the client experience follows. That is true often enough to be a useful
management heuristic, and false often enough to be dangerous as a rule. Week 8
asks you to find the exceptions in a real matter, because those are the moments
where a supervising lawyer has to make an actual choice rather than a
comfortable one.

## Method

1. **List the candidate moments** across the matter — roughly eight to twelve.
   Use the CX lifecycle stages for the client side and the delivery record for
   the team side. Ground them in evidence from the K&S tools (`ks_list_tasks`,
   `ks_time_ledger`) rather than imagination.
2. **Classify each moment:**
   - **Reinforcing** — good for the client *and* the team. Say why, and whether
     it happened by design or by luck.
   - **Conflicting** — good for one at the other's expense.
   - **Doubly negative** — bad for both. These are usually pure process failures
     and are the cheapest to fix; find them.
3. **Work the conflicts properly.** For each conflicting moment set out:
   - what the client gains,
   - what it costs the team, in specific terms (whose evening, whose task list,
     whose learning opportunity),
   - who currently decides, and whether they see the trade-off at all,
   - whether the trade-off is *sustainable once* or *corrosive if repeated* —
     this distinction matters more than the size of the individual cost,
   - a redesign that reduces the conflict, and what it would cost to implement.
4. **Test the accelerated-timetable case specifically.** Compressing the
   timetable pleases the client and strains the team. Using the actual task and
   time data, quantify both sides as far as the evidence allows, and state who
   in the firm currently bears the cost of that decision. Note whether the
   person who makes the decision is the person who bears it — that asymmetry is
   the heart of the week's argument.
5. **Connect to Rose's own design.** Which product features here support EX
   rather than just CX? The approval gate distributes accountability away from
   the individual junior; the audit log protects the person who flagged a risk;
   the partner-review step means a rushed output is caught by process rather
   than by someone's willingness to push back. Assess honestly whether each
   actually does that, or only appears to.

## Output

The classified moment list, a worked conflict analysis for the three most
significant conflicts, the accelerated-timetable case quantified, and a short
reflection on the decision-maker/cost-bearer asymmetry.

## Constraints

- A map with no conflicts on it is a failed analysis. If you cannot find
  tensions, you are describing the firm as it would like to be seen.
- Keep team-side descriptions behavioural and non-clinical.
$md$,
  plan_template = $json${
    "title": "Moments that matter — CX/EX map",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "List eight to twelve candidate moments across the matter, grounded in evidence from the K&S tools (ks_list_tasks for phase, status, assignee and due dates; ks_time_ledger for who did what and when) plus the CX lifecycle stages. For each moment record the date or phase, the client-side effect and the team-side effect."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Classify each moment as Reinforcing, Conflicting or Doubly negative, with reasons. For reinforcing moments say whether they happened by design or by luck. Then work the three most significant conflicts in full: client gain, specific team cost, who decides, whether the decision-maker sees the trade-off, whether it is sustainable once or corrosive if repeated, and a redesign with its implementation cost."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Quantify the accelerated-timetable case from the task and time data as far as the evidence allows, and identify who bears the cost of that decision versus who makes it. Then assess Rose's own features — approval gate, audit log, partner-review step — on whether they genuinely support employee experience or only appear to. Finish with a short reflection on the decision-maker/cost-bearer asymmetry."
      }
    ]
  }$json$
where title = 'Moments that matter — CX/EX map (W8)';


-- =====================================================================
-- PART 2 — NEW EXERCISES, BROADENING FEATURE COVERAGE
--
-- The eight workflows above are all type='assistant'. These four deliberately
-- exercise the parts of Rose that Week 8 never touched:
--   9.  Tabular review + Tabular Ask
--   10. Deep-verify (the Legg reading, made operational)
--   11. Knowledge base + Playbooks
--   12. Clauses + Lists + Export
-- =====================================================================

-- ---------------------------------------------------------------------
-- 9. Ethics scenario triage (W8) — TABULAR
-- One row per scenario in the Library's "Ethics scenario pack (W8)" folder.
-- Typed columns (C015) so severity sorts, disclosure filters and cost
-- aggregates. Students then use Tabular Ask (C025) to interrogate the grid:
-- "which scenarios share a root cause?", "which would a client never find
-- out about?" — the cross-cutting question a per-document read cannot answer.
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, practice, language, jurisdictions, columns_config)
select user_id,
  'Ethics scenario triage (W8)',
  'tabular',
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $cols$[
    {
      "index": 0,
      "name": "Scenario",
      "type": "text",
      "prompt": "Summarise the scenario in one sentence: what is being proposed or has happened, and by whom."
    },
    {
      "index": 1,
      "name": "Obligations engaged",
      "type": "text",
      "prompt": "Which professional obligations does this engage? Consider ASCR rr 4 (competence, diligence, honesty), 7 (clear and timely advice), 9 (confidentiality), 17 (personal bias), 19 (duty to the court), 37 (supervision); LPUL ss 3, 172 (fair and reasonable costs), 173 (avoiding unnecessary delay and cost); Fair Work Act 2009 (Cth); WHS Act 2011 (Cth). Cite the rule number and state in your own words what it requires. Flag every citation as requiring verification — do not present recalled rule text as settled."
    },
    {
      "index": 2,
      "name": "Severity",
      "type": "risk",
      "prompt": "Rate the seriousness of the ethical problem: Low, Medium, High or Critical. Critical is reserved for conduct that would likely found a complaint to the OLSC or a disciplinary finding. Justify the rating in one line."
    },
    {
      "index": 3,
      "name": "Who bears the risk",
      "type": "text",
      "prompt": "Name the person or role who carries the consequence if this goes wrong — not 'the firm'. Distinguish who benefits from the decision from who bears its risk, and say whether they are the same person."
    },
    {
      "index": 4,
      "name": "Client disclosure required",
      "type": "boolean",
      "prompt": "Does the client have to be told, before the fact, for their consent or decision to be informed? Answer true or false and give the basis (typically LPUL s 3 or s 172, or ASCR r 7)."
    },
    {
      "index": 5,
      "name": "Cost impact",
      "type": "money",
      "prompt": "Estimated financial impact on the client in AUD, if it can be estimated from the scenario or the matter record. If it cannot be quantified, state 0 and explain in one line why not — an unquantifiable cost is still a finding."
    },
    {
      "index": 6,
      "name": "Time to detect",
      "type": "duration",
      "prompt": "How long would this plausibly go undetected — by the client, by a supervising partner, or by an audit? The scenarios that take longest to surface are usually the ones that most need a systemic control rather than individual judgement."
    },
    {
      "index": 7,
      "name": "Ethical fading language",
      "type": "text",
      "prompt": "Quote the specific words in the scenario that reframe an ethical choice as a commercial, technical or administrative one — for example 'commercial reality', 'efficiency', 'the client is comfortable', 'that's just how it's recorded'. Legg calls this ethical fading: the ethical dimension quietly disappears from the framing. If there is none, say so."
    },
    {
      "index": 8,
      "name": "Control that would prevent it",
      "type": "text",
      "prompt": "What systemic control would prevent this without relying on an individual choosing well under pressure? Consider supervision requirements, approval gates, disclosure triggers, audit trails, or estimate-revision rules. Note whether Rose itself implements anything equivalent."
    }
  ]$cols$::jsonb
from _w8_owner
where not exists (select 1 from workflows w where w.title = 'Ethics scenario triage (W8)');


-- ---------------------------------------------------------------------
-- 10. Professional obligations — verify before you rely (W8) — DEEP-VERIFY
-- The Legg reading made operational. Students take an AI-generated ethics
-- analysis and verify every legal proposition in it, recording their OWN
-- verdict per assertion. With the Jade toggle off (the default), Rose emits
-- an AustLII search link and never fetches it — the student does the
-- checking, which is the entire pedagogical point.
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select user_id,
  'Professional obligations — verify before you rely (W8)',
  'assistant',
  $md$
Take an AI-generated analysis of professional obligations and verify it, one
proposition at a time, before anyone relies on it.

**Paste the analysis into your request**, or name the workflow run you want
checked — typically the output of *LPM ethics check (W8)* or *Ethics scenario
triage (W8)*.

## Why this is the Week-8 exercise, not a technical chore

Legg's argument is that AI does not remove the need for ethical judgement; it
raises the stakes on it, because plausible-sounding output invites the lawyer
to stop thinking. Two mechanisms do the damage: **automation bias**, where a
confident answer is accepted because it is confident, and **deskilling**, where
the junior lawyer never develops judgement because the first draft always
arrives already formed.

The courts have already drawn the line. Practice Note SC Gen 23, the Federal
Court's GPN-AI and the District Court's GPN 2 permit AI for administrative
drafting, summarising, chronologies and indexes — and for written submissions
**only with source verification**. They prohibit generating affidavits, witness
statements, character references and other evidentiary material, altering or
rephrasing witness evidence, preparing expert reports without leave, and
filing submissions without manually verifying every citation. The hallucinated
citation cases catalogued at damiencharlotin.com are what happens when that
last step is skipped.

This workflow is the verification step, made explicit and recorded.

## Method

1. **Extract every checkable assertion.** Go through the analysis and pull out
   each proposition of law or regulation as a separate line: every rule number,
   every section, every statement of what a rule requires, every practice-note
   prohibition. Include assertions that sound obviously right — those are the
   ones that get through.
2. **Classify each assertion:**
   - **Citation** — a specific rule, section or practice note is named.
   - **Characterisation** — a claim about what the rule *requires or permits*.
   - **Application** — a claim that the rule applies to these facts.
   Characterisations fail verification far more often than citations, because
   the number is easy to get right and the effect is easy to get subtly wrong.
3. **Run `verify_assertions`** on the extracted list to create a Deep-verify
   report, then open `/verify` to work through it.
4. **Verify each one yourself.** Rose will give you an AustLII search link. It
   does not fetch or read AustLII — you do. Open the link, read the actual
   provision, and record your own verdict: Verified / Not verified / Partially
   correct / Could not check. Where the analysis got the effect of a rule
   subtly wrong, record that as Partially correct and say exactly what was
   wrong. That distinction is the assessed skill.
5. **Report the failure pattern.** When you have adjudicated every assertion,
   summarise: how many verified, how many did not, and — the interesting
   question — whether the failures cluster. Did the model get section numbers
   right and their effect wrong? Did it invent a plausible obligation that does
   not exist? Did it state a real rule that does not apply to these facts?
6. **Reflect, in writing.** Legg's practical prescription is reflective
   practice: deliberately processing an experience to change future behaviour.
   Answer three questions in your own words:
   - Which assertion would you have accepted without checking, and why?
   - What would have made you suspicious earlier?
   - What is your personal rule for when you will and will not rely on an AI
     statement of law?

## Output

The assertion list with classifications, the completed verification report
(every assertion adjudicated), the failure-pattern analysis, and your written
reflection.

## Constraints

- The report is not complete until **every** assertion has your verdict. An
  unadjudicated assertion is a claim nobody checked.
- Do not record a verdict you did not actually verify. That failure mode — the
  performance of checking — is worse than not checking, because it produces a
  document that says the work was done.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "Verify before you rely",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Extract every checkable proposition of law or regulation from the supplied analysis as a separate numbered line — every rule number, section, practice-note prohibition and statement of what a rule requires. Include assertions that appear obviously correct. Classify each as Citation, Characterisation or Application, and note that characterisations fail verification more often than citations."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Call verify_assertions on the extracted list to create a Deep-verify report. Return the report link and explicit instructions for the student: open /verify, work through each assertion, follow the AustLII search link, read the actual provision, and record their own verdict (Verified / Not verified / Partially correct / Could not check). Emphasise that Rose does not fetch AustLII — the human does the checking — and that 'Partially correct' is the most important category."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [2],
        "instruction": "Once verdicts are recorded, analyse the failure pattern: counts by verdict, and whether failures cluster (correct section numbers with wrong effect, invented obligations, real rules misapplied to these facts). Then prompt the student's written reflection with the three questions — which assertion they would have accepted unchecked, what should have made them suspicious, and their personal rule for relying on AI statements of law. Do not write the reflection for them; it is theirs to write."
      }
    ]
  }$json$
from _w8_owner
where not exists (select 1 from workflows w where w.title = 'Professional obligations — verify before you rely (W8)');


-- ---------------------------------------------------------------------
-- 11. AI use decision — responsible-AI playbook review (W8)
-- KNOWLEDGE BASE + PLAYBOOKS. Students propose a specific use of AI on the
-- matter and run it against the playbook seeded in Part 3, using
-- review_against_playbook and search_knowledge over the Week-8 references.
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select user_id,
  'AI use decision — responsible-AI playbook review (W8)',
  'assistant',
  $md$
Decide whether a specific proposed use of AI on this matter is permissible, and
produce a record of the decision that would survive being read back to you.

**State the proposed use in your request** with enough specificity to be
assessable. "Use AI for diligence" is not assessable. "Upload the 12 Whitegum
lease PDFs to a public chatbot and ask it to extract the consent clauses" is.

## The three lines of defence

1. **The tool** — what the technology can and cannot do reliably.
2. **The firm** — supervision, governance, the retainer and the insurer.
3. **Professional standards** — the rules that bind you personally, which no
   firm policy can waive on your behalf.

Most failures in practice happen because the first two were considered and the
third was assumed.

## Method

1. **Characterise the proposed use precisely:** what data goes in, which tool,
   who operates it, what comes out, who relies on the output, and what happens
   if the output is wrong. Vagueness at this step makes everything downstream
   worthless.
2. **Search the knowledge base** for the Week-8 reference material on
   court and regulator positions before reasoning from memory. The permitted
   and prohibited categories are specific, and getting them approximately right
   is the failure mode the exercise is designed to catch.
3. **Run it against the playbook** *Professional ethics & responsible AI (W8)*
   using `review_against_playbook`. For each rule, state whether the proposal
   is at the preferred position, an acceptable fallback, or a dealbreaker.
4. **Answer the three slide questions directly**, in your own words:
   - Should AI be able to provide legal advice — and if not, how exactly do you
     define "legal advice" such that your line is workable in practice?
   - What are the ethical *and commercial* implications of this use? Note that
     they frequently point the same way; the commercial case for verification
     is usually stronger than the ethical one, which is itself worth noticing.
   - Can hallucinations make good law? Consider what it means that a fabricated
     authority can be cited, relied on, and occasionally reproduced downstream.
5. **Decide.** Permitted as proposed / Permitted with conditions / Not
   permitted. If conditions, list them as testable requirements — "verified by
   a second reviewer against the source document before it leaves the firm",
   not "used carefully".
6. **Record the decision** so it is auditable: what was proposed, what was
   decided, on what basis, by whom, and what would change the answer.

## Output

The characterisation, the playbook review table, direct answers to the three
questions, the decision with any conditions, and the audit record.

## Constraints

- Cite the specific practice note or rule for every prohibition you assert, and
  flag each for verification. Do not assert a court position from memory — that
  would be the exact error the exercise exists to teach against.
- A decision of "permitted with conditions" where the conditions are not
  testable is a decision of "permitted". Be honest about which you are making.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "AI use decision",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Characterise the proposed use precisely: input data and its confidentiality classification, the specific tool and whether it is closed or open, the operator, the output, who relies on it, and the consequence if it is wrong. Then call search_knowledge for the Week-8 reference material on court and regulator positions on generative AI, and summarise the permitted and prohibited categories from what you retrieve rather than from memory."
      },
      {
        "role": "review",
        "position": 2,
        "depends_on": [1],
        "instruction": "Call review_against_playbook against 'Professional ethics & responsible AI (W8)'. Produce a table: rule, proposal's position, preferred / acceptable fallback / dealbreaker, and the reasoning. Cite the specific practice note or conduct rule for every prohibition asserted, and flag each citation as requiring verification."
      },
      {
        "role": "drafting",
        "position": 3,
        "depends_on": [2],
        "instruction": "Answer the three slide questions in substance: whether AI should provide legal advice and how the student defines legal advice workably; the ethical and commercial implications, noting where they align; and whether hallucinations can make good law. Then give the decision — permitted as proposed, permitted with conditions, or not permitted — with conditions expressed as testable requirements. Close with an auditable decision record: what was proposed, what was decided, on what basis, by whom, and what would change the answer."
      }
    ]
  }$json$
from _w8_owner
where not exists (select 1 from workflows w where w.title = 'AI use decision — responsible-AI playbook review (W8)');


-- ---------------------------------------------------------------------
-- 12. CX/EX remediation pack (W8) — CLAUSES + LISTS + EXPORT
-- Closes the loop: findings from the earlier workflows become saved clauses,
-- tracked list items with deadlines, and an exported artefact. This is the
-- Week-8 assessment deliverable.
-- ---------------------------------------------------------------------
insert into workflows (user_id, title, type, prompt_md, practice, language, jurisdictions, plan_template)
select user_id,
  'CX/EX remediation pack (W8)',
  'assistant',
  $md$
Turn this week's analysis into something the firm could actually adopt on
Monday: reusable templates, tracked commitments with owners and dates, and an
exportable pack.

Run this **after** the CX audit, the EX pulse and the moments-that-matter map.
It consumes their findings.

## Method

1. **Gather the findings.** Pull the improvement backlog from the CX audit, the
   management actions from the EX pulse, and the redesigns from the conflict
   analysis. De-duplicate: the same root cause usually appears in all three
   with different names, and collapsing those is most of the value here.
2. **Separate the three types of fix**, because they are adopted differently:
   - **Template** — a reusable artefact. Save it with `save_clause` so it
     exists beyond this matter.
   - **Commitment** — something a named person will do by a date. Create it
     with `add_list_item` as a task or deadline against the project.
   - **System change** — something requiring a decision above the matter team.
     These go in the pack as recommendations, not as list items, because
     creating a task nobody has authority to complete is how backlogs die.
3. **Draft the templates.** At minimum produce a client-update template that
   satisfies the OLSC expectation-management points (delays, process changes,
   cost increases, scope), and one other drawn from your own findings. Base
   them on the seeded clauses *Service recovery note (W8)* and *Team pulse
   check (W8)* where useful, but improve them against what you found — the
   seeded versions are deliberately serviceable rather than good.
4. **Create the commitments** as list items with an owner and a due date. Keep
   them few and real: five commitments that happen beat fifteen that do not.
   Note that `add_list_item` is a write tool, so it passes through the approval
   gate — you will be asked to confirm before anything is created. Read what
   you are approving; that gate is itself part of this week's argument about
   where accountability sits.
5. **Write the one-page happy path** — the Week-8 assessment artefact. The
   ideal client journey for this matter type, on a single page, in language a
   client could read.
6. **Add the EX note** — how the accelerated timetable was staffed, what it
   cost the team, and what you would do differently. Keep it behavioural and
   non-clinical.
7. **Export the pack** to DOCX or PDF. Choose the Output report if you want the
   deliverable, or the Process report if you want the record of how it was
   produced and reviewed — for an ethics week, the Process report is often the
   more interesting artefact, because it shows the reasoning and the review
   verdicts rather than only the conclusion.

## Output

Saved clauses, created list items, the one-page happy path, the EX note, and an
exported pack.

## Constraints

- Every commitment needs a named owner and a real date. "The team" and "ASAP"
  are not answers.
- If a finding cannot be turned into a template, a commitment or a system
  recommendation, it was probably an observation rather than a finding. Say so
  and drop it.
$md$,
  'Legal Project Management',
  'English',
  array['NSW','Cth'],
  $json${
    "title": "CX/EX remediation pack",
    "steps": [
      {
        "role": "research",
        "position": 1,
        "depends_on": [],
        "instruction": "Gather findings from the CX audit backlog, the EX pulse management actions and the moments-that-matter redesigns. De-duplicate aggressively — identify where the same root cause appears under different names across the three, and collapse them. Classify every surviving finding as Template, Commitment or System change, and justify each classification."
      },
      {
        "role": "drafting",
        "position": 2,
        "depends_on": [1],
        "instruction": "Draft the templates, including a client-update template covering the OLSC expectation-management points (delays, process changes, cost increases, scope). Use search_clauses to find the seeded 'Service recovery note (W8)' and 'Team pulse check (W8)' as starting points and improve on them. Save each finished template with save_clause, tagged w8 and cx-ex. Then write the one-page happy path in client-readable language, and the EX note on how the accelerated timetable was staffed — behavioural and non-clinical throughout."
      },
      {
        "role": "review",
        "position": 3,
        "depends_on": [2],
        "instruction": "Create the commitments as list items via add_list_item, each with a named owner and a real due date, using kind 'task' or 'deadline' as appropriate. Keep the set small and achievable. Warn the student that add_list_item passes through the approval gate and that they should read what they are approving. Finally, assemble the pack for export and tell the student how to export it, explaining the difference between the Output report and the Process report and why the Process report is often the more revealing artefact for an ethics exercise."
      }
    ]
  }$json$
from _w8_owner
where not exists (select 1 from workflows w where w.title = 'CX/EX remediation pack (W8)');


-- =====================================================================
-- PART 3 — PLAYBOOK AND CLAUSES
-- =====================================================================

-- Responsible-AI and professional-ethics playbook. Deliberately written as
-- positions a firm could actually hold, with dealbreakers drawn from the
-- court practice notes rather than invented. Workflow 11 reviews against it.
insert into playbooks (owner_id, name, agreement_type, description)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30'::uuid,
       'Professional ethics & responsible AI (W8)',
       'Firm policy',
       'Kendry & Slate positions on AI use, costs transparency, status reporting and supervision. Dealbreakers reflect the Federal Court GPN-AI, Practice Note SC Gen 23 and District Court GPN 2. Used by the Week-8 AI use decision workflow. Teaching material — students must verify every rule reference rather than relying on this summary.'
where not exists (select 1 from playbooks where name = 'Professional ethics & responsible AI (W8)');

insert into playbook_rules (playbook_id, position, topic, preferred, acceptable_fallback, dealbreaker, severity, notes)
select p.id, v.position, v.topic, v.preferred, v.acceptable_fallback, v.dealbreaker, v.severity, v.notes
from playbooks p
cross join (values
  (1, 'Confidential client information in AI tools',
   'Client-identifying material is processed only in a closed, contracted environment with confidentiality controls and no training on inputs.',
   'De-identified extracts in an approved tool, where re-identification is not reasonably possible and the client has been told.',
   'Entering prohibited or confidential information into an uncontrolled, unrestricted public GenAI service.',
   'critical',
   'ASCR r 9. The court practice notes treat this as a bright line. Verify the current wording of SC Gen 23 before relying on this summary.'),
  (2, 'Citation verification',
   'Every citation in anything leaving the firm is manually verified against the primary source by a named person, and the check is recorded.',
   'Verified by the drafter with a second check on anything filed or relied on externally.',
   'Filing or serving written submissions without manually verifying every citation.',
   'critical',
   'The prohibition is explicit in the practice notes. See damiencharlotin.com for the catalogue of what happens otherwise.'),
  (3, 'Evidentiary material',
   'Affidavits, witness statements and character references are drafted from the witness''s own account, without generative assistance.',
   'Generative assistance limited to formatting and structure of a document whose content is entirely witness-sourced, disclosed if asked.',
   'Using GenAI to generate, alter or rephrase evidentiary material or witness evidence.',
   'critical',
   'Distinct from the citation rule and more absolute. Altering the words of a witness is the specific mischief.'),
  (4, 'Expert reports',
   'No generative assistance in the preparation of an expert report.',
   'Only with prior leave of the court, on terms disclosed to all parties.',
   'Drafting or preparing an expert report using GenAI without prior leave of the court.',
   'critical',
   'Verify the leave requirement in the relevant court''s practice note — the position differs between jurisdictions.'),
  (5, 'Permitted administrative use',
   'Generative assistance is used freely for chronologies, indexes, witness lists, summarising and reviewing documents and transcripts, with human review before reliance.',
   'Same, with review deferred to the point of reliance rather than the point of generation, where the output is purely internal.',
   'Treating a generated chronology as verified because it looks complete.',
   'medium',
   'These uses are expressly contemplated. The risk here is complacency, not prohibition.'),
  (6, 'Supervision of AI-assisted work',
   'A named supervising solicitor reviews AI-assisted work before it is relied on, and the review is recorded against the task.',
   'Review by a solicitor of equivalent seniority where the supervisor is unavailable, recorded the same way.',
   'AI-assisted output relied on externally with no identifiable human reviewer.',
   'high',
   'ASCR r 37. The recording matters as much as the review: an unrecorded review cannot be demonstrated later.'),
  (7, 'Estimates and cost variation',
   'The client is told before costs exceed the estimate, with a revised estimate and the reason for the variation.',
   'Told at the earliest practicable point after the variation becomes apparent, with an explanation of why notice could not be given earlier.',
   'The client learns of a material overrun from the invoice.',
   'high',
   'LPUL ss 172, 174. This is the most common source of costs complaints and the easiest to prevent.'),
  (8, 'Time recording integrity',
   'Time recorded reflects time actually worked. Any write-down is a separate, visible billing decision made by someone with authority.',
   'Write-down applied at the invoice stage with the underlying entries preserved and the reason recorded.',
   'Instructing or allowing a lawyer to record less time than they worked so the matter appears to meet an estimate.',
   'high',
   'Engages honesty under ASCR r 4, costs under LPUL s 172, and — where a junior is directed to do it — supervision and wellbeing obligations. The ledger becomes evidence of the firm''s own conduct.'),
  (9, 'Status reporting',
   'Status reflects the actual position, including bad news, at the time it becomes known.',
   'Status flagged amber with a stated recovery plan and a date by which the position will be confirmed.',
   'Reporting a workstream as on track while knowing it is not — watermelon reporting.',
   'high',
   'Identified in the Week-8 slides as the most commonly reported ethical breach by project managers. Engages ASCR rr 4 and 7.'),
  (10, 'Scope changes',
   'Out-of-scope work is identified, priced and agreed with the client before it is performed.',
   'Performed and disclosed promptly where genuinely urgent, with the client given a real opportunity to decline the charge.',
   'Absorbing out-of-scope work silently, or billing it without prior agreement.',
   'medium',
   'Both failure directions are problems: silent absorption distorts the estimate and hides the true cost of the work.'),
  (11, 'Disclosure of AI use to the client',
   'The retainer states how AI is used on the matter, and material AI involvement in a deliverable is disclosed.',
   'Disclosed on request, with a firm-level policy the client can be shown.',
   'Denying or concealing AI use when asked directly.',
   'medium',
   'The obligation to disclose proactively is contested; the obligation not to mislead when asked is not.'),
  (12, 'Independent professional judgement',
   'Standardised processes and AI outputs are treated as inputs to a lawyer''s judgement, never as substitutes for it.',
   'Deviation from a standard process is permitted and recorded where the lawyer''s judgement requires it.',
   'A lawyer proceeding on an output they do not understand and cannot justify.',
   'high',
   'The Week-8 challenge scenario: does increased standardisation reduce lawyers'' capacity and responsibility for independent judgement? Legg''s deskilling argument sits here.')
) as v(position, topic, preferred, acceptable_fallback, dealbreaker, severity, notes)
where p.name = 'Professional ethics & responsible AI (W8)'
  and not exists (select 1 from playbook_rules r where r.playbook_id = p.id and r.position = v.position);


-- Clauses. Deliberately serviceable rather than excellent — workflow 12 asks
-- students to improve them against their own findings, which is a better
-- exercise than admiring a finished template.
insert into clauses (owner_id, title, agreement_type, body, guidance, tags)
select 'a3e483e5-0e15-4eec-9bac-a41e364a7e30'::uuid, v.title, v.agreement_type, v.body, v.guidance, v.tags
from (values
  ('Service recovery note (W8)', 'Client correspondence',
   E'Dear [Client],\n\nI am writing about [specific event], which occurred on [date]. [State plainly what happened and when we became aware of it.]\n\nI understand this affects [specific consequence for the client, in their terms — not "may cause inconvenience"].\n\nWhat we are doing now: [action], which [named person] will complete by [date].\n\nWhat changes so this does not recur: [systemic change, not "we will be more careful"].\n\nI would like to discuss this with you directly. I will call on [date/time], or you can reach me on [number] at any point before then.\n\n[Name]',
   'Run the admission check before sending. Mark every sentence that could be read as an admission of negligence, breach of retainer or acceptance of liability for loss, and get partner sign-off on the residual wording. Any fee write-off is a separate costs decision under LPUL s 172 and needs its own authority. Note what this template does NOT do: it does not apologise in terms. Whether it should is the exercise.',
   array['w8','cx','service-recovery','teaching']),
  ('Team pulse check (W8)', 'Internal',
   E'Matter: [matter] · Week: [date] · Prepared by: [supervising lawyer]\n\n1. Load: tasks open / overdue per person, hours recorded, estimate-to-actual ratio.\n2. Concentration: is any one person carrying a disproportionate share, and is that deliberate?\n3. Level fit: is anyone routinely working above or below their level? Note both.\n4. Supervision: for each junior-produced work item this week, who reviewed it and is that recorded?\n5. Sustainability: could this week''s pattern be repeated for a month without something breaking?\n6. Actions: [action] — [owner] — [by when] — [observable signal it worked].',
   'A management instrument, not a wellbeing assessment. Keep every entry behavioural and observable — work patterns, distribution, supervision records. Do not record inferences about anyone''s psychological state. If real wellbeing concerns arise, they belong with the firm''s own support processes, not in a matter file.',
   array['w8','ex','teaching']),
  ('Costs variation disclosure note (W8)', 'Client correspondence',
   E'Dear [Client],\n\nOur estimate for [scope] was [$X], given on [date].\n\nOur current forecast is [$Y], a variation of [$Z] ([N]%).\n\nThe variation arises from: [specific cause — scope change, unforeseen complexity, third-party delay, change of instruction]. [State which of these were foreseeable and which were not.]\n\n[Where the cause was a change of instruction: identify the instruction and its date.]\n\nBefore we continue, please confirm you wish us to proceed on this basis. If you would prefer to reduce scope, the options are: [option 1], [option 2].\n\n[Name]',
   'LPUL ss 172 and 174. The test the exercise applies: could the client have been told earlier? Answer honestly — the answer is usually yes, and the reason is usually that nobody wanted to have the conversation. Note the template forces a statement of what was foreseeable, which is the part firms most often omit.',
   array['w8','ethics','costs','teaching']),
  ('AI use record (W8)', 'Internal',
   E'Matter: [matter] · Task: [task] · Date: [date]\n\nProposed use: [what data, which tool, who operates it, what output, who relies on it].\nData classification: [client-identifying / de-identified / public].\nTool environment: [closed and contracted / open and uncontrolled].\nPlaybook position: [preferred / acceptable fallback / dealbreaker], per [rule].\nDecision: [permitted / permitted with conditions / not permitted], by [name] on [date].\nConditions (testable): [condition], verified by [name] before [event].\nWhat would change this decision: [trigger].\nVerification performed: [citations checked against source by [name] on [date]].',
   'The point of this record is that it is written before the work, not after the problem. A decision of "permitted with conditions" where the conditions are not testable is really a decision of "permitted" — the template forces that honesty by asking who verifies what, before which event.',
   array['w8','ethics','ai-governance','teaching']),
  ('Client matter update (W8)', 'Client correspondence',
   E'Matter: [matter] · Week ending [date]\n\nWhere we are: [position in plain language, no jargon].\nCompleted this week: [items].\nNext week: [items, with owners].\nAt risk: [anything that could slip, with the date it would affect and what we are doing about it]. If nothing is at risk, say so explicitly.\nCosts: [recorded to date] against [estimate]. [Flag any variation now, not at invoice.]\nWhat we need from you: [specific request, with the date it is needed by].',
   'Built against the OLSC complaint drivers: regular communication, expectation management on delays and process and cost changes, and prompt response. The "at risk" field is mandatory and must be answered even when the answer is "nothing" — a status report that only reports good news trains the client to distrust the good news too.',
   array['w8','cx','communication','teaching'])
) as v(title, agreement_type, body, guidance, tags)
where not exists (select 1 from clauses c where c.title = v.title);

commit;
