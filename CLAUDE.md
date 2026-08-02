# Memory — Rose

## Me
Peter Dombkins, Adjunct Associate Professor in Legal Transformation (UNSW). Building Rose as a **research and educational** project for teaching law students about legal technology — not for commercial use.
Email: pdombkins@gmail.com
GitHub: pdombkins/mikeOSS_Australia

## Project
**Rose** — Australian fork of Mike OSS. AI legal assistant for Australian/NZ law. **For research and educational purposes only** (not commercial; not legal advice).
- Repo: https://github.com/pdombkins/rose_lawyer
- Website: rose.lawyer
- Stack: Next.js 16 (Turbopack) frontend · Express TypeScript backend (`tsx watch`) · Supabase (auth + Postgres) · Cloudflare R2

## Key Architecture
| Layer | Detail |
|-------|--------|
| Frontend port | 3000 |
| Backend port | 3001 |
| DB | Supabase (Postgres + Auth) |
| Storage | Cloudflare R2 |
| LLM providers | Anthropic (Claude), Google (Gemini) |

## Terms & Abbreviations
| Term | Meaning |
|------|---------|
| **Rose** | The platform (Mike OSS, Australian fork) |
| **Jade** | jade.io (BarNet) — primary AU legal source when admin-approved: citation validation + judgment fetch (AI content-check). Requires BarNet's written permission for automated access |
| **AustLII** | Australasian Legal Information Institute — **default fallback, human-validated only**, when Jade access is off or unapproved. Rose never scrapes or fetches AustLII automatically (AUP prohibits automated/AI use) — it only computes an outbound AustLII search link, which the user opens and checks themselves, then records their own verdict |
| **auslaw-mcp** | Third-party MCP wrapper for AustLII — NOT used (would require automated fetch, contrary to AustLII's AUP) |
| **AGLC4** | Australian Guide to Legal Citation, 4th edition — citation format standard |
| **MNC** | Medium Neutral Citation — e.g. [2024] HCA 5 |
| **R2** | Cloudflare R2 — S3-compatible object storage for uploaded documents |
| **SSR** | Server-Side Rendering (Next.js) |
| **RLS** | Row Level Security (Supabase/Postgres) |
| **query_costs** | Supabase table recording token usage and AUD cost of every LLM call |
| **StreamChatResult** | Backend type carrying fullText + inputTokens + outputTokens + model |
| **cost badge** | Small AUD cost label shown under each assistant response |

## Legal Research Architecture (Jade primary, AustLII human-validated fallback)
- **Module**: `backend/src/lib/jade.ts` · tools `backend/src/lib/legalSourcesTools/jadeTools.ts` · route `backend/src/routes/jade.ts` (mounted at `/jade`)
- **Citation validation** (`validateJadeCitation`): HEAD check against `jade.io/mnc/{year}/{court}/{num}`
- **Case / legislation search**: returns a Jade.io search link (no authorised machine-search interface without BarNet permission)
- **Document fetch** (`fetchJadeDocument`): `jade.io/content/ext/mnc/...` (may return SPA shell)
- **Tools**: `jade_search_cases`, `jade_search_legislation`, `jade_validate_citation`, `jade_fetch_document`, `jade_format_citation`
- **⚠️ Permission**: automated Jade.io (AI content-check) access requires BarNet's prior written permission, gated behind an admin toggle (`app_settings` Jade-access-approved flag) — for research/education use only
- **AustLII fallback (default when Jade access is off/unapproved)**: Rose computes an outbound AustLII **search link** only (`austliiSearchUrl()` in `backend/src/lib/verification/assertionCheck.ts`) — it is never fetched or scraped server-side. The human user opens it in their own browser, reviews the result, and records their own verdict via `PATCH /verify/:id/assertions/:assertionId`. This is the C024 Deep-verify human self-validation path; see `/verify` page
- **No auslaw-mcp** (would require automated AustLII fetch, contrary to its AUP)

## Cost Tracking
- Costs stored in `query_costs` Supabase table (run `supabase/migrations/20240705_query_costs.sql`)
- AUD rate fetched daily from open.er-api.com; fallback 1.55
- Model prices in `backend/src/lib/pricing.ts` (retail rates — update for enterprise plans)
- SSE event `{ type: "cost", model, inputTokens, outputTokens, costUsd, costAud }` emitted before `[DONE]`

## Dev Workflow
```bash
npm run dev --prefix backend   # port 3001
npm run dev --prefix frontend  # port 3000
```
- Git lock issue: dev servers hold `.git/index.lock` — run `rm -f .git/HEAD.lock .git/index.lock` from a free Terminal tab before committing
- SQL migrations: run manually in Supabase SQL Editor (sandbox has no internet)

## Fork Scan (feature discovery)
- Upstream: `willchen96/mike` (Mike OSS). Scanner: `scripts/fork-scan/scan.mjs` — runs in background on every launch via `Start Rose.command`; report auto-opens only when new items found
- Register: `scripts/fork-scan/register.json` (seen forks/commits, feature IDs F001…). Reports: `scripts/fork-scan/reports/latest.html` + `latest.md`. Log: `last-scan.log`
- First run = full baseline; later runs incremental (skips forks whose `pushed_at` is unchanged)
- No GitHub token by default (60 req/hr); optional token via `GITHUB_TOKEN` or `scripts/fork-scan/.token` (gitignored)
- **Adoption workflow**: when Peter says "Adopt F003…" → look up ID in `register.json` → fetch `https://github.com/{repo}/commit/{sha}.patch` → adapt into Rose (respect Jade-only rules, AGPL-3.0) → set that feature's `status` to `"adopted"` in register
- Force full rescan: `node scripts/fork-scan/scan.mjs --reset`

## Adopted Fork Features (2026-07-19, branch `adopt-fork-features`)
- **F005/F004/F003/F002** (upstream catch-up): new `backend/src/lib/chat/` engine (streaming, prompts, toolDispatcher), Excel/PPT support, citation-quotes UI (document citations only), DocPanel, Library (`library_kind` on `documents`, `/library` route), review-panel polish
- **F211** (jmclark-lab): RAG knowledge base + playbooks. Embeddings = Gemini `gemini-embedding-001` @1536 dims (`backend/src/lib/llm/embeddings.ts`, GEMINI_API_KEY). KB ingests from Library: `POST /library/:documentId/index` (source='library'). Tools: `search_knowledge`, `list_playbooks`, `review_against_playbook` in `chat/tools/kbTools.ts`. Embedding spend → `query_costs` (source `kb_embedding`, estimated tokens)
- **CourtListener fully excluded** (was inherited from fork point; not exposed as tools or prompt). Jade/AustLII verification chain + admin toggle untouched
- **Excluded**: `user_profile_email` migration (schema.sql already has the column); CourtListener tools; case-citation (cluster_id) pipeline branch
- **Migrations to run** (Supabase SQL editor, in order): `20260625_01_workflow_metadata.sql`, `20260629_01_workflow_open_source_submissions.sql`, `20260703_02_project_practice.sql`, `20260704_01_chat_message_citations.sql`, `20260710_01_library_documents.sql`, `20260710_knowledge_base_and_playbooks.sql` (all in `backend/migrations/`)
- Old `chatTools.ts` / `legalSourcesTools/` removed — jade/verification tools now live in `backend/src/lib/chat/tools/`

## Competitor Scan (feature discovery)
- Tracks feature announcements from **Harvey** (harvey.ai), **Legora** (legora.com), **CoCounsel** (Thomson Reuters). Runs in parallel with the fork scan on launch via `Start Rose.command`
- Scanner: `scripts/competitor-scan/scan.mjs`. Register: `scripts/competitor-scan/register.json` (features `C001…`, grouped by capability, vendor tag). Reports: `scripts/competitor-scan/reports/latest.html` + `latest.md`. Log: `last-scan.log`
- **Two-tier**: (1) node script on every launch fetches vendor blog/release-note index pages, primes a silent baseline on first successful fetch, then flags net-new posts as `status:"new"` ("Needs triage"); (2) weekly Claude scheduled task `competitor-feature-refresh` (Mon 08:00) re-researches with web search, turns raw posts into grouped/summarised feature entries, ages old `new` flags to `seen`
- First run seeds ~29 curated baseline features (to-date). Report groups by capability (Agents & workflows, Drafting, Research & citations, Document review, Knowledge & playbooks, Voice/multimodal, Mobile/integrations, Analytics/admin, Platform/models); filter by New-only or vendor
- **Build workflow**: when Peter says "Design and build C005…" → look up the `C0xx` id in `register.json` → design + implement into Rose respecting Jade-only/AGPL/AU rules → set that feature's `status` to `"built"` in register
- Force fresh baseline: overwrite register.json with an empty shell (scanCount 0) and re-run

## Preferences
- Concise and direct responses
- No unnecessary explanation or verbosity
- Australian law context throughout

## 2026-07-20 Build — 19 competitor features + Kimi K3 (design: docs/design/2026-07-20_c-features_kimi3_design.md)
**Built** C002 C004 C007 C011 C013 C014 C015 C018 C019 C022 C024 C025 C026 C030 C031 C032 C033 C036 C040 (register statuses set to `built`) + Moonshot/Kimi K3 provider.

### Platform primitives
- **Agent runtime (P1)** `backend/src/lib/agents/` (types/planner/rolePrompts/executor/events) + `routes/agents.ts` + `/agents` page. Plan → approval gate (C030) → DAG executor (≤3 parallel steps), each step = `runLLMStream` with role-scoped `toolAllowlist`. Run kinds: assistant, workflow, draft_from_precedent (fixed 3-step plan). Costs → `query_costs` source `agent_step`.
- **Notifications (P2)** `lib/notifications.ts` + `routes/notifications.ts` + `/notifications` page + sidebar badge. Email via `RESEND_API_KEY` (env-gated) + per-user opt-in (`user_profiles.email_notifications`, Account → Features).
- **Audit + RBAC (P3)** `lib/audit.ts` (`recordAudit` in toolDispatcher/routes), `lib/rbac.ts` (org roles admin/supervisor/member; project roles owner/editor/reviewer/viewer, deny-by-default = ethical wall). `project_members` (backfilled from `shared_with`; legacy fallback still honoured in `access.ts`). Members API: GET/PUT/DELETE `/projects/:id/members`. Admin → Audit page + CSV.
- **Model registry (P4)** `lib/llm/models.ts` now data-driven (`MODEL_REGISTRY`); `pricing.ts` reads it. **Kimi K3**: provider `moonshot` via `lib/llm/openaiCompat.ts` (chat-completions). Self-host preferred: `KIMI_BASE_URL` (vLLM/SGLang; $0 recorded; `KIMI_MODEL`/`KIMI_INPUT_PRICE`/`KIMI_OUTPUT_PRICE` overrides) → fallback hosted `api.moonshot.ai/v1` (`MOONSHOT_API_KEY` env or user key).

### Features
- **Verify (C024)** `lib/verification/assertionCheck.ts` + tool `verify_assertions` + `routes/verify.ts` + `/verify` page. Jade toggle ON → AI content-check; OFF → human self-validation with outbound Jade/AustLII **search links only** (Rose never fetches AustLII); report complete only when all assertions adjudicated.
- **Regwatch (C018)** `lib/regwatch/` (curated official RSS only: FRL, ASIC, ACCC, OAIC, APRA, FWO, NZ legislation) + `routes/regwatch.ts` + `/regwatch` page; 6-hourly timer in index.ts (`REGWATCH_DISABLED=1` to disable).
- **Tabular v2** typed columns (`type`: date/money/duration/boolean/risk) + per-column `reference_document_id` (C031) in generate pipeline; `PATCH /tabular-review/:id/cells/:doc/:col` manual edit w/ AI-value provenance + edit UI in TRSidePanel (C032); completion notifications; `POST /tabular-review/ask` + TabularAskModal + agent tool `tabular_ask` (C025, `lib/tabularAsk.ts`; doc→text via `lib/extractText.ts`).
- **Knowledge** `clauses` table + `lib/clauses.ts` + `/clauses` page + tools `save_clause`/`search_clauses` (C026); playbook-builder tools `create_playbook`/`upsert_playbook_rule`/`delete_playbook_rule` + Playbooks "Build with AI" → seeded agent run (C002); org context `app_settings.org_context` (admin UI) + `user_profiles.personal_context` (Account → Features), injected in `runLLMStream` (C033); Admin → Workspace knowledge (C036).
- **Admin analytics (C004)** `GET /admin/analytics` + `/admin/analytics` page (KPIs, cost by model/feature, tool usage, **cohort comparison** via `user_profiles.cohort`, `PATCH /admin/users/:id/cohort`).
- **Exports (C040)** `lib/exports.ts` + `POST /download/export` (DOCX/PDF/MD, optional AGLC4 LLM restyle) + Export UI on agent runs.
- **MCP server (C007)** `routes/mcpServer.ts` at `/mcp-server` (Streamable-HTTP JSON-RPC; tools: search_knowledge, list_playbooks, review_against_playbook, search_clauses, jade_validate_citation, jade_format_citation, verify_assertions). PATs: `routes/pats.ts` (`/pats`, sha256-hashed, shown once).
- **C014** `POST /workflows/:id/compile` (NL → plan_template) + `POST /workflows/:id/run` (→ agent run, approval-gated). **C011/Kimi** in ModelToggle/settings.

### Migrations to run (Supabase SQL editor, in order)
`20260721_01_agent_runtime.sql` · `20260721_02_notifications.sql` · `20260721_03_audit_rbac.sql` · `20260721_04_moonshot_api_key_provider.sql` · `20260721_05_clauses.sql` · `20260721_06_workflow_plan_template.sql` · `20260721_07_regwatch.sql` · `20260721_08_org_context_pats.sql` · `20260721_09_verification_reports.sql` (all in `backend/migrations/`)

### New env vars (all optional)
`KIMI_BASE_URL` `KIMI_MODEL` `KIMI_INPUT_PRICE` `KIMI_OUTPUT_PRICE` `MOONSHOT_API_KEY` · `RESEND_API_KEY` `NOTIFICATIONS_FROM_EMAIL` · `REGWATCH_DISABLED`

## 2026-07-21 Build — C076 C077 C078 C079 + scan --no-fetch (design: docs/design/2026-07-21_c076-c079_design.md)
- **C078 cell refresh**: `regenerate-cell` now has v2 parity (C015 type hints, C031 reference doc, provenance in content JSON: `regenerated_by/at`, `superseded_manual_summary`), audit-logged, UI confirm before overwriting manual edits. Tabular pipeline now records **estimated** spend (chars/4) → `query_costs` sources `tabular` / `tabular_ask` (was previously unrecorded).
- **C079 bulk import**: `POST /clauses/import` (≤500 rows; batch embeddings; dupe-skip) + `POST /playbooks/:id/rules/import` (append). `lib/csv.ts` both ends. UI: Import CSV on /clauses (`CsvImportButton`) + playbook editor (client-side parse into draft, Save persists).
- **C077 consumption**: `query_costs.project_id` (populated by runLLMStream + tabular paths), `GET /user/usage`, `PATCH /user/budget`, `GET /projects/:id/usage`, Account → Usage page, AI-spend in ProjectDetailsModal, `costByProject` in admin analytics, soft budgets (`user_profiles.monthly_budget_aud`; daily sweep notifies at 80%+, `BudgetBanner` on assistant at 100%; NEVER blocks).
- **C076 Lists**: `list_items` table (task/fact/deadline; RBAC via project_members), `routes/lists.ts` at `/projects/:id/list`, tools `list_list_items`/`add_list_item`/`update_list_item_status` (project chats + agents; write tools = intake/drafting only, added to WRITE_TOOLS → approval gate), daily deadline sweep (72h, NotificationKind `deadline`), Lists tab on project page with Run-with-agent (links `agent_run_id`; human confirms completion).
- **scan.mjs `--no-fetch`**: report-only rebuild — no network, no scanCount bump, no new→seen aging. Use for sandbox-driven refreshes.
- **Migrations** (in order): `20260722_01_query_costs_project_budgets.sql` · `20260722_02_list_items.sql`. **New env (optional)**: `BUDGET_ALERTS_DISABLED`, `LISTS_REMINDERS_DISABLED`.

### Deferrals — all completed 2026-07-20
- ✅ AddColumnModal: "Value type" (C015) + "Reference document" (C031) selectors; saved on column config.
- ✅ "Verify citations" (ShieldCheck) button on assistant messages → creates a Deep-verify report and opens `/verify?report=…`.
- ✅ `ProjectMembersModal` (roles editor/reviewer/viewer, owner-managed, replaces PeopleModal for projects); PAT management section on Account → API Keys ("MCP access tokens", shown once, copy + revoke).
- ✅ Boot recovery: `recoverOrphanedRuns()` in executor, called 10s after startup — `running` runs resume (completed steps preserved, in-flight steps reset to pending).

## 2026-07-26 Build — Workflow transparency (design: docs/design/2026-07-26_workflow-transparency_design.md)
Workflows are now a **declared, inspectable process** rather than an opaque prompt.
- **Workflow blueprint** `backend/src/lib/workflows/blueprint.ts` — one LLM call derives a typed spec from `prompt_md`/columns: per step `name`/`objective`/`role`/`depends_on`/`inputs`/`outputs`/`quality_criteria` (id'd `S2-Q1`)/`silent_failure {risk, modes, mitigation}`/`max_rework`, plus a workflow-wide silent-failure overview. Cached in `workflow_blueprints` keyed by sha256 of the source (auto-invalidates on edit); works for builtin string ids and user uuids alike. `blueprintToPlan()` → `AgentPlan`; `stepInstruction()` inlines objective + criteria + known failure modes so the agent knows the rubric it'll be graded on. **Tool allowlists are still derived server-side from role — the blueprint never widens access.**
- **Overview page** `WorkflowProcessMap.tsx` (shared, DAG laid out by longest-path depth + measured SVG connectors) + `WorkflowBlueprintPanel.tsx`. `WorkflowDetailPage` is tabbed: Overview (default) / Instructions|Columns.
- **Duplicate & edit with AI** `POST /workflows/:id/duplicate` (works on read-only builtins; copies the blueprint across) + `POST /workflows/:id/edit-chat` (`lib/workflows/editChat.ts`) + `WorkflowEditChatModal`. Returns a complete revised `skill_md` + change list; nothing saved until Apply.
- **Pre-flight gate (C-style, before any execution)** `lib/workflows/preflight.ts` + `PreflightGate.tsx`. Samples the actual attached documents and re-scores each step. Structural checks (unreadable/scanned PDFs, no docs, >400k chars, blueprint's own high-risk steps) are deterministic; the model layer catches input/step mismatch, summarisation-of-dense-drafting, jurisdiction, "not found"→"not applicable". High risk ⇒ run created with status **`paused`** (nothing executed) and the user gets exactly two options: Continue anyway, or Stop & edit the workflow → `POST /agents/:id/preflight-decision`. Fails **open but loud** if the check itself errors.
- **Senior-partner review + rework loop** `lib/agents/partnerReview.ts`, wired into `executor.ts` `runStep()`. Per-criterion verdict + reasons + inference level (verbatim/low/moderate/high) with the inferential statements named. `rework` → `reworkPreamble()` appended, step re-runs up to `max_rework`. Reviewer never rewrites the work; `cannot_assess` is a defect not a pass; an `accept` alongside any `not_met` is coerced to `rework`; a failed reviewer marks the step `degraded` and the UI says it was NOT reviewed. Never-accepted steps hand downstream a flagged, provisional output. Ad-hoc runs get `implicitBlueprintStep()` so the gate applies there too.
- **Live run view** `(pages)/agents/page.tsx`: steps **expanded by default** (state tracks what's been *collapsed*), thinking trace shown inline (new `agent_step_reasoning` SSE event), process map above with current step + `Now on step N` chip + distinct `reworking` state.
- **Completion report** `lib/agents/report.ts` + `GET /agents/:id/report` — assembled from persisted data only (no LLM, so it can't hallucinate): per step objective/attempts/reasoning/sources actually touched/every review/inference level; run-level overall inference, `reworked_positions`, `unreviewed_positions`. Export selector: Output vs Process report (DOCX/PDF/MD).
- **Assistant workflow run mode**: Use modal offers Guided workflow (default — agent runtime, map, review, report) or Assistant chat (previous skill-in-chat behaviour). Tabular still creates a Tabular Review, but passes the gate first.
- **Fixed**: `POST /workflows/:id/compile` selected a non-existent `skill_md` column (it's `prompt_md`; `skill_md` is only the API alias), so plan templates compiled from an empty instruction.
- **Migration**: `20260726_01_workflow_blueprints.sql` (`workflow_blueprints`; `agent_runs.blueprint`/`preflight`; `agent_steps.review`/`attempt`). **New `query_costs` sources**: `workflow_blueprint`, `workflow_preflight`, `workflow_edit`, `partner_review`.

## 2026-07-24 — Legal resources tab + Jade-gating fix
- **Library → Legal resources** (new tab, `/library/resources`): combines the two former root-level design docs (`australian-legal-sources-map.md`, `citation-verification-gate.md`) plus Regwatch feeds into one list — jurisdiction, title, hyperlink, and a live AI-accessible vs user-only badge. Data: `backend/src/lib/legalResources.ts`. API: `GET /library/legal-resources` (resolves against the live `jade_access_approved` setting), `GET /jade/access-status` (lightweight non-admin boolean, used by the Agents page too). The two root markdown docs are left in place as detailed rationale; the Library tab is now the single combined reference.
- **Jade-gating fix (real gap, not just labels):** `jade_search_cases`/`jade_search_legislation`/`jade_fetch_document` in `toolDispatcher.ts`, and `jade_validate_citation` in the MCP server (`routes/mcpServer.ts`), were calling Jade.io directly with **no check** of the `jade_access_approved` admin toggle — only the dedicated `verify_citation`/`verify_assertions` tools were gated. All four now check `getJadeAccessApproved()` first and return an AustLII-search-link fallback when Jade access isn't approved.
- **Agent runtime now Jade-aware end to end:** `agents/types.ts` `ROLE_TOOLSETS` → `roleToolset()`/`roleToolsets(jadeApproved)` (also fixes a dead `jade_validate_citation` reference that had no matching tool schema — replaced with the real gated `verify_citation`). `planner.ts` (`planRun`/`sanitizePlan`) and `rolePrompts.ts` (`buildRolePrompt`) now take/compute `jadeApproved` and change both the tool allowlist and the prompt wording accordingly (Jade.io vs "AustLII manual verification only"). Call sites updated: `routes/agents.ts`, `routes/workflows.ts`, `agents/executor.ts`.
- **Agents page** (`/agents`): role-reference panel ("What each agent role uses") now fetches live Jade-access status and swaps "Jade.io — …" source chips for "AustLII — manual search link" when access isn't approved, plus a status banner at the top of the panel.
- **Group member invite/registration status** (Admin → Student groups): `GET /groups/:id` now joins the `invitations` table by email → per-member `invited` + `invited_at` (latest send). Member list shows Registered vs Not-registered, and for unregistered members whether an email invite was sent + date (hidden once registered).
- **⚠️ Superseded 2026-07-28 (see below):** the action-link approach described in the next bullet was replaced — mail scanners were redeeming the links. Keep the Resend transport; the link itself changed.
- **Group invites now sent via Resend, not Supabase's mailer:** `POST /groups/:id/invite` was using `auth.admin.inviteUserByEmail`, which routes through Supabase Auth's built-in email — rate-limited to a few/hour (`429 over_email_send_rate_limit`), so a whole class silently failed (0 auth users created, 0 `invitations` rows). Rewritten to `auth.admin.generateLink` (`invite`, falling back to `magiclink` for already-provisioned emails) to get the action link WITHOUT sending, then deliver a branded email through Resend. New `backend/src/lib/email.ts` (`isEmailConfigured`/`sendEmail`/`escapeHtml`, same transport as notifications). Requires `RESEND_API_KEY` + `NOTIFICATIONS_FROM_EMAIL` on a **Resend-verified domain** (the `onboarding@resend.dev` sender only reaches your own account email). Response shape unchanged (`invited`/`skipped_registered`/`failed`), so the invite UI + invited-date badges work without frontend changes.

## 2026-07-28 — Invite links burned by mail scanners (LAWS3850 incident)
**Symptom:** class reported no invitation email; re-inviting sent nothing; notification emails never arrived. Resend was healthy throughout (DKIM+SPF verified, all 36 invites **Delivered** 25 Jul; `rose.lawyer` shows "Partially Failed" only on the unused **inbound** MX record, which does not affect sending).

**Root cause 1 — scanner redemption.** We emailed Supabase's raw `action_link`, a **single-use GET**. UNSW's mail gateway link scanner fetched it on delivery and redeemed the token. Fingerprint in `auth.users`: all 35 students have `email_confirmed_at` == `last_sign_in_at` to the millisecond, 9–35s after `invited_at`, all inside one 2.5-minute window at 04:16 AEST, in send order. Students then got "link is invalid or has expired".
- **Fix:** `backend/src/lib/inviteLinks.ts` → `createAcceptLink(db, email, { setup? })`. Emails `/accept?token_hash=<properties.hashed_token>&type=invite|magiclink[&setup=1]` instead of `action_link`. New `frontend/src/app/accept/page.tsx` has **no `useEffect`** — it is inert on load, so a scanner GET is harmless; `supabase.auth.verifyOtp` runs only in the click handler. Used by both `POST /groups/:id/invite` and `POST /admin/invite`.
- `setup=1` routes to `/reset-password?setup=1` (now Suspense-wrapped, setup-aware copy, skips the 2.5s PASSWORD_RECOVERY wait when a session already exists). Group invites always pass `setup: true` — an existing-but-unclaimed account yields a *magiclink*, and without this the student would land in the app with no password.

**Root cause 2 — re-invites were a silent no-op.** `POST /groups/:id/invite` filtered targets with `loadProfileUsersByEmail`, but a DB trigger writes the `user_profiles` row the moment `generateLink` provisions the account — so after the first send every member looked registered (36/36 had rows) and `invited: 0`. Now uses `loadActivatedEmails` (matching `GET /:id`), plus `{ force: true }` in the body to re-send to **everyone** — required here because the scanner falsely stamped `email_confirmed_at` on all 35. UI: "Re-send to all" next to the invite button on Admin → Student groups (confirm dialog); `inviteGroup(groupId, force)` in `roseApi.ts`; audit detail gains `forced`.

**Not a bug — notification email.** `email_notifications` was **false for all 39** `user_profiles`; `sendEmailIfEnabled()` returns early on it, so no notification email had ever been sent. Opt in at Account → Features.

**If it recurs:** scanners that render JS and click buttons would still burn a token. Next escalation is emailing a 6-digit OTP (`properties.email_otp`) with no URL at all.

## 2026-07-30 — Kendry & Slate merged into Rose (Lovable retired)
K&S now runs from **https://rose.lawyer/firm** on the Rose Worker + Rose Supabase project.

- **`ks` schema** (`backend/migrations/20260730_01_ks_schema.sql`): 14 tables, RLS on all of them, 40 policies. Data migrated via a one-shot `extensions.http` pull from the old project: 8 profiles · 7 clients · 7 matters · 266 tasks · 423 assignments · 517 time entries · 265 events · 72 documents · 61 settings. **Recomputed `total_fees` matched the old cascade exactly on all 7 matters (zero drift).**
- **Trigger cascade replaced.** 27 row-level triggers (incl. duplicates firing `update_task_hours_from_assignments` twice) → statement-level AFTER triggers with transition tables calling `ks.recompute(task_ids, matter_ids)` once per statement. `ks.suppress_adjustment` GUC prevents self-retrigger. NB: Postgres forbids transition tables with `UPDATE OF <cols>`, hence the GUC guard on `tasks_after_upd_fn`.
- **Auth is real.** `ProtectedRoute` was a no-op ("No authentication required for demo mode") with 1 auth user and RLS off — that was the root of all 16 Critical findings. Now: one account per student across both apps, `ks.is_admin()` reads `public.user_profiles.is_admin`, `user_roles` (privilege-escalation surface) dropped.
- **Persona ≠ identity.** `ks.profiles` = fee earner (James, Aisha…); `performed_by` on tasks/assignments/time_entries/events/documents = the real student. Makes the time ledger attributable — feeds the Week-8 ethics exercises.
- **Provisioning.** `ks.matter_groups` (matter ↔ Rose `user_groups`) + `ks.matter_members` (matter ↔ `auth.users`). Triggers on `auth.users` insert, `user_group_members` change and `matter_groups` change call `ks.sync_user_memberships(email)`. Deprovisioning on user delete = FK cascade. Verified both directions live.
- **Same-origin = SSO.** `/firm` shares Rose's origin, so both apps use the same `sb-<ref>-auth-token`. Do NOT set a custom `storageKey` in `ks-frontend/src/integrations/supabase/client.ts`.
- **SPA fallback lives at `frontend/src/app/firm/[[...slug]]/route.ts`**, reading the shell via the Cloudflare `ASSETS` binding. Two approaches that do NOT work, both tried: a `_redirects` rule (Cloudflare rejects `/firm/* → /firm/index.html 200` as an infinite loop, and a splat there shadows real assets), and `fetch(origin + '/firm/index.html')` from the Worker (same-hostname subrequests don't reach the asset layer). There is deliberately **no** `/firm` rewrite in `next.config.ts` — `afterFiles` rewrites run before dynamic routes and would shadow the handler.
- **Build/deploy:** `Cutover K&S.command` at the repo root, or `npm run build` in `frontend/` (which now runs `build:firm` first). `date-fns` pinned to `^3.6.0` — `react-day-picker@8` peers v2/v3 and the calendar is used by MatterDetail + SystemPerformanceTab.
- **Still outstanding:** `ks_*` chat tools for Rose agents (the Week-8 workflows referenced the now-removed public MCP); edge functions `gantt-import-processor` / `rebaseline-processor` / `reset-processor` unported, so Gantt import and term reset don't work yet; instructor console; 11 npm vulnerabilities inherited from Lovable.

## 2026-07-30 (later) — Closing the two K&S merge gaps
Design: `docs/design/2026-07-30_ks-gaps-plan.md`.

### Read scope narrowed (instructor decision)
`backend/migrations/20260730_02_ks_scoped_reads.sql` — **applied**. Students now
read only their own matter(s), not the whole firm. `ks.can_read_matter()` is the
single test and equals the write test, because provisioning already grants
exactly "group matter + shared NexaCare". `clients`/`client_contacts` are
visible only via an accessible matter (else the CRM leaked the client book);
`matter_members` is own-rows-only. Deliberately still firm-wide: `ks.profiles`
(fee-earner directory — needed to render your own matter's assignments/rates),
`ks.knowledge_documents`, `ks.system_settings`.
**NB this changes Week-8 exercises that compare across matters.**

### Track A — `ks_*` agent tools (replaces the deleted public MCP)
- `backend/src/lib/chat/tools/ksTools.ts` (schemas) + `backend/src/lib/ks.ts`
  (queries) + handler in `toolDispatcher.ts` + `KS_TOOLS` in `streaming.ts`.
- Six tools: `ks_list_matters`, `ks_get_matter`, `ks_list_tasks`,
  `ks_time_ledger`, `ks_list_staff`, `ks_record_time_entry`.
- **The backend runs as service-role, so RLS does NOT apply.** Scope is enforced
  in `accessibleMatterIds()` / `assertMatterAccess()`. Any new K&S tool MUST go
  through those or the assistant becomes a way to read another group's data.
- `ks_record_time_entry` is in `WRITE_TOOLS` → approval-gated; re-checks
  membership after approval, validates the task belongs to the matter, and
  stamps `performed_by` with the real student (`user_id` stays the persona).
- Role allowlists in `agents/types.ts`: research/drafting get the full read set,
  drafting alone gets the write, verify gets none.
- `ks_time_ledger` surfaces `operator_name` — who actually booked an hour vs
  whose name it was billed under. That distinction is the Week-8 hook.

### Track B — edge functions
Was described as "Gantt import and term reset don't work". **Correction after
investigation:** every function was missing from the Rose project, but the
interactive paths all had Supabase-client fallbacks, so they degraded rather
than broke. Both `webhook-time-entry` call sites were `action: 'ping'` —
diagnostics, not the time-logging path (that always went through the client).
- **Deleted, superseded:** `time-entries`, `webhook-time-entry`,
  `batch-update-tasks`, and the old `mcp`.
- **B1 → Rose backend** (`backend/src/routes/ks.ts`, mounted `/ks`):
  `POST /ks/tasks/reorder` (validates every task id belongs to the matter, and
  only writes `order_position`) and `GET /ks/health` (replaces the ping; also
  reports the caller's K&S scope). Frontend calls them via
  `ks-frontend/src/lib/roseBackend.ts`.
- **B2 → four batch jobs re-deployed with `verify_jwt: true` + admin check**
  via `ks-frontend/supabase/functions/_shared/ksGuard.ts`. `reset-processor`
  and `hours-processor` deployed through the Management API; the two large ones
  (gantt-import 640 lines, rebaseline 652) deploy from the cutover script via
  the Supabase CLI (needs a one-off `npx supabase login`).
- **`hours-processor` was recovered from the old project** — it was live there
  but absent from the Lovable export, so it existed in exactly one place.
- **All four had `set_config('app.suppress_task_adjustment')` removed, not
  renamed.** That GUC belongs to the old 27-trigger cascade; the new schema
  uses `ks.suppress_adjustment`, managed inside `ks.recompute()`. Renaming
  would have suppressed nothing while the functions wrote aggregates the new
  triggers immediately recomputed.
- **Term reset scope narrowed:** `matters`/`clients`/`client_contacts` removed
  from `TABLES_TO_RESET`. They are the case study, and post-merge they cascade
  to `ks.matter_groups`/`ks.matter_members` — so an early reset date would have
  silently destroyed the group mapping and every student's provisioning.
- Stale references cleaned: `supabaseConfig.ts` still *asserted* the old
  project ref, and `Diagnostics.tsx` hardcoded old-project URLs.

### Still outstanding
`ks.jobs` table (job state is still JSON blobs in `system_settings`);
instructor console; `MatterDetail.tsx` split; the 35-concurrent-writer load
smoke-test; 11 npm vulnerabilities inherited from Lovable.

## 2026-07-30 — Week 9 teaching build (transformation & change management)
`docs/teaching/nexacare-whitegum/seed/week9.sql` + `WEEK9_RUNSHEET.md` +
`week9-library/`. Ten workflows, a 12-rule playbook, 5 clause templates,
4 reference notes and 7 persona documents.

- **Scenario:** implement the Week-8 client happy path on NexaCare as a 90-day
  pilot. Four behavioural asks (contemporaneous time, task status in-system,
  defined client touchpoints, visible matter plan) — no new software.
- **Evidence is real and verified against the live DB:** NexaCare 49 tasks /
  0 complete / all overdue · 650 est hours vs 27 recorded · 45 of 49 tasks
  with zero time · firm ledger 0 `manual` / 275 `adjustment` / 32 `auto-sync`.
  **Students are not told these** — workflow 1 makes them find them.
- **Workflow 5 is tabular**, 10 typed columns (`risk`, `duration`, `money`),
  one row per persona → the 7 persona docs must be uploaded as *separate*
  Library documents.
- **Workflow 9 (Kotter readiness review)** hard-marks the group's own plan
  against the eight *errors*; workflow 10 assembles + exports the pack and
  recommends the **Process report** over the Output report.
- The seed **deletes the superseded v1 stub** `Change plan — Kotter 8-step
  (W9)` (175 chars), guarded on no `tabular_reviews` referencing it.
- **Verified before shipping:** pglast (real PG grammar) parse of the whole
  file · all `$json$`/`$cols$` blocks parse as JSON · every target column
  exists · uncast jsonb literal in `INSERT…SELECT` probed live and accepted ·
  severities normalised to `low|medium|high` because
  `routes/playbooks.ts` `SEVERITIES` silently coerces anything else to
  `medium`.
- **`plan_template` is documentation only.** Nothing reads it except the
  `/compile` route that writes it — runs derive from `prompt_md` via the
  blueprint. Edit prompts, not plan templates.
- Workflows still need **sharing to the cohort in the UI** after seeding; the
  seed does not write `workflow_shares`.

## 2026-07-30 — Teaching content was invisible to the entire cohort
Found while actioning the Week-9 install. Everything seeded under the
instructor account was unreachable by students, silently — no errors, just
empty results.

| Content | Scoping | Was |
|---|---|---|
| Workflows | `user_id` OR `workflow_shares.shared_with_email` | **0 share rows** — no student had ever seen any workflow, W7/W8 included |
| Playbooks / clauses | `.eq("owner_id", caller)` | invisible |
| Knowledge base | `match_kb_chunks(match_owner := caller)` | invisible |
| Library docs | `.eq("user_id", caller)` | invisible (but see below) |
| Group project | `project_group_grants` (editor) | ✅ already correct |

**Fixes applied:**
- `seed/share_to_cohort.sql` — shares every instructor-owned workflow with
  every `user_group_members` email (792 rows created: 22 × 36, `allow_edit
  false`). **Re-run after every seed**; idempotent.
- `backend/src/lib/teachingContent.ts` — `listTeachingOwnerIds()`. Rule: a
  user in a `user_groups` row may READ the unfiled content of that group's
  `created_by`. Derived from group membership, not hardcoded, so a second
  instructor/course works unchanged. Returns `[]` for everyone else, and
  every call site treats `[]` as previous behaviour. Resolves the caller's
  email from `user_profiles` when not supplied (the tool dispatcher has no
  email, and all 36 group rows had a null `user_id`).
- Migration `20260730_04_teaching_content_visibility.sql` — adds
  `teaching_owners uuid[]` to `match_kb_chunks` and `match_clauses`.
  Additive; PostgREST resolves by argument NAME so the old overloads still
  work. **Applied.** Verified: a non-instructor uuid gets 0 rows without it
  and 5 with it.
- Read paths wired: `lib/playbooks.ts` (own copy wins over a same-named
  teaching one), `lib/clauses.ts`, `lib/knowledgeBase.ts`, `toolDispatcher`
  (lazy, cached per turn), `routes/playbooks.ts`, `routes/clauses.ts`.
  **Write paths untouched** — still `owner_id = caller`, so students
  duplicate rather than edit. Responses carry `read_only`; UI shows "Shared
  with your class" and hides delete.
- **`searchClauses` now always runs the keyword pass**, not just as a
  fallback. `match_clauses` requires `embedding is not null`, and clauses
  inserted by a seed script have no embedding — so every SQL-seeded teaching
  clause was invisible to `search_clauses` forever. (The 20 pre-existing
  clauses all have embeddings because they came through the CSV import route,
  which embeds; that's why this never showed up.)
- **Library documents deliberately NOT changed.** `ensureDocAccess` /
  `filterAccessibleDocumentIds` already admit docs linked into an accessible
  project, so the path is Admin → Documents → link the folder to the six
  group projects. Students see them in their matter, not in their Library tab.

### ✅ Both seeds RUN 2026-07-30 (via the Supabase connector)
- **week8_v2.sql** — 16 statements. Part 1 is eight plain `update workflows …
  where title = '…'` (NOT guarded inserts), so the 8 short prompts were
  genuinely replaced: 117–214 chars → 2,229–4,273. Part 2/3 inserted 4 new
  workflows + playbook + 12 rules + 5 clauses. **Those UPDATEs key on title
  alone, not `user_id`** — harmless now (one row per title) but a student
  duplicate with the same title would be overwritten. Live: 12 W8 workflows
  (11 assistant + 1 tabular).
- **week9.sql** — 14 statements. Live: 10 W9 workflows, 12 playbook rules,
  5 clauses; superseded stub deleted.
- **`severity: 'critical'` normalised to `'high'`** in the DB and in
  week8_v2.sql (4 rules). There is no CHECK constraint so it inserted fine,
  but `SEVERITY_STYLES` in `PlaybookManager.tsx` has no `critical` key (badge
  renders unstyled, select has no matching option) and `routes/playbooks.ts`
  would coerce it to `medium` on save. Emphasis moved into `notes`.
- **`share_to_cohort.sql` re-run after both** → 1,260 shares (35 workflows ×
  36 students, `allow_edit false`).
- Verified as a real student email: 35 workflows · 8 playbooks · 30 clauses ·
  15 KB chunks · 1 group project.

### 2026-07-30 — "no matters showing" follow-up
Two causes, both fixed:
1. **Account, not code.** `p.dombkins@unsw.edu.au` and `peter.dombkins@au.pwc.com` were `is_admin: false` with no `ks.matter_members` rows, so read scoping correctly returned nothing. All three Peter accounts are now admins. (Students get memberships automatically on invite acceptance; none exist yet.)
2. **Dead `'admin'` persona branch.** `MattersList.tsx` and `Dashboard.tsx` gated "see everything" / "Admin Controls" on `selectedProfile.id === 'admin'` — the synthetic persona removed during the merge. Never true, so instructors saw one persona's matters and the Admin Controls button was permanently hidden. Both now use `isAdmin` from `useAuth`.

**Design note:** `MattersList` filters matters by the *persona's* assigned tasks. That is deliberate and stays for students — RLS narrows to their own matter(s) first, so the persona filter only narrows within that. Admins bypass the persona filter only.

## 2026-08-02 — `/version` marker + K&S build output untracked
**`GET /version`** on the backend (unauthenticated) reports
`{commit, branch, deployed_at, started_at}` from Railway's
`RAILWAY_GIT_COMMIT_SHA`. Added because on 2 Aug there was no way to tell from
outside whether a backend change had reached production — `/health` only says
the process is up. Confirm a deploy with:
```
curl -s https://rose-lawyer-production.up.railway.app/version
```
and compare `commit` with `git rev-parse HEAD`.

**Frontend equivalent:** none needed — the Next build already serves
`/BUILD_ID`, and the decisive check for the assets-only failure is that a
Worker-rendered route returns 200 (`/library`) while a nonsense path returns
404. If both 404, the Worker has no script.

**`frontend/public/firm/` is now gitignored** and untracked (90 files removed
from the index). It is K&S build output staged by `npm run build:firm`, which
runs on every `npm run build` / `npm run deploy` / `Cutover K&S.command`, so it
regenerates from `ks-frontend` and never needs to be in git. Tracking it put
~100 hashed bundles into every diff and buried real changes.

## 2026-08-02 — THE REAL CAUSE: Cloudflare Workers Builds was deploying on push
The 31 Jul "assets-only Worker" outage recurred on 2 Aug after two pushes. My
31 Jul diagnosis ("almost certainly a bare `wrangler deploy`") was **WRONG**,
which is why the guard I added to `Cutover K&S.command` never fired — the bad
deploy never ran on Peter's machine at all.

**Actual cause.** A **Cloudflare Workers Build** was connected to
`pdombkins/rose_lawyer` and deployed on EVERY push, configured as:
| Setting | Value |
|---|---|
| Build command | **None** — so `opennextjs-cloudflare build` never ran, no `worker.js` |
| Deploy command | `npx wrangler deploy` |
| Root directory | **`/`** — repo root, not `frontend/` |
| Non-production branches | Enabled — any branch could deploy |

Builds completed in **0 seconds** (`started_at == completed_at`), the tell that
no build happened. Deployment history alternated perfectly: manual Wrangler
deploy (good) → git deploy (broken) → manual → git, all the way down.

**How to detect this without dashboard access:** the GitHub check-runs API.
`https://api.github.com/repos/pdombkins/rose_lawyer/commits/<sha>/check-runs`
listed `Workers Builds: rose-lawyer` (app `cloudflare-workers-and-pages`) and
`Supabase Preview`. Cloudflare's own Settings page also says
"Variables/Triggers/Logpush cannot be added to a Worker that only has static
assets" when the script is missing.

**FIXED 2 Aug:** Git repository **disconnected** in Cloudflare (Workers &
Pages → rose-lawyer → Settings → Build). Deploys are now manual only —
`npm run deploy` or `Cutover K&S.command`, both of which build properly.

**Also disconnected: Supabase GitHub integration on the OLD K&S project**
(`kjjjlawgemmqaxgawaoe`). It was pointed at `pdombkins/rose_lawyer` with
"Deploy to production" ON, i.e. a push to `main` tried to apply migrations to
the project we migrated OFF. It only ever failed ("Remote migration versions
not found in local migrations directory"), but the intent was live.

**Nothing automated now watches the repo.** Pushing is purely "save to GitHub"
plus the Railway backend redeploy. Cloudflare only ever deploys from a manual
`npm run deploy` / `Cutover K&S.command`.

**Git auth is now SSH, not a PAT** (2 Aug). `origin` =
`git@github.com:pdombkins/rose_lawyer.git`, key `MacBook Pro — mike-OSS`
(`SHA256:KRb9RfR1XYLMW5fJ9vVKYDcna+nqCZ5xQnT7xCzqnHg`). No expiry to manage.

**⚠️ Outbound port 22 is BLOCKED on Peter's network.** A plain SSH push gives
`Connection closed by <ip> port 22` — which looks like an auth failure but is
not (auth failure would be `Permission denied (publickey)`). Fixed with SSH
over 443 in `~/.ssh/config`:
```
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
```
If a push ever fails this way again on a new machine, that is the cause.

## 2026-08-02 — Assistant created a DUPLICATE task instead of amending
Peter created "Doument review" on Group A: CloudTech, then said "set the due
date for this task". The assistant called `ks_create_task` a **second time**
and reported success. Two identical tasks, both reported as wins. The tool
description already said "use ks_list_tasks first to avoid duplicating an
existing task" — the model ignored it. **An instruction the model may skip is
not a control.**

- **Hard guard**: `assertNoDuplicateTask()` in `ksWrites.ts`. A create whose
  title already exists on that matter (case-insensitive) is REFUSED, and the
  error carries the existing task's id + status + due date so the model's next
  move is obvious. Scoped to the matter, so two groups may each have their own
  "Document review". Escape hatch `allow_duplicate: true` for the genuine case;
  the schema explicitly tells the model not to use it to work around the error.
- **Prompt**: new AMEND, DO NOT RE-CREATE paragraph at the top of
  `KS_SYSTEM_PROMPT` — a change to an existing record (including one created
  earlier in the same conversation) uses the matching `ks_update_*` tool; find
  the id with `ks_list_tasks` first if you don't have it; "creating a duplicate
  is a failure even when the tool call succeeds".
- **Confirmations now state the id.** `ksCreateTask` returns `… (id <uuid>). To
  change this task later, use ks_update_task with id <uuid>.`; `ksUpdateTask`
  lists the changed field names and says "No new task was created." The id was
  always in the returned row — it just never reached the visible answer, so a
  follow-up had nothing to bind "this task" to.
- Cleanup: duplicate `acd63bd1` deleted (verified first: 0 assignments, 0 time
  entries, 0 documents).

### Round 2 — the exact-title guard was defeated in one attempt
Re-run of the same request. The model silently corrected the typo
"Doument" → "Document", so `ilike` no longer matched and a third task was
created. A model tidying its own input is normal, so the comparison now
normalises (case, punctuation, spacing) and compares by **Levenshtein
similarity ≥ 0.85** over every task on the matter. Verified against a table of
cases: typo fix 0.933, plural 0.938, case+punctuation 1.000 all BLOCK;
"Document review" vs "Document Review and Organization" 0.469, vs "Document
collection" 0.579, "Draft SPA" vs "Draft share purchase agreement" 0.300 all
allow. Helpers `normaliseTitle`/`editDistance`/`titleSimilarity` in `ksWrites.ts`.

Also in that run: the request named **no due date**, yet the model set one —
carried over from its own earlier turn. New first paragraph of
`KS_SYSTEM_PROMPT`: WRITE ONLY WHAT WAS ASKED FOR IN THE CURRENT REQUEST;
"earlier turns are history, not standing instructions — and a date you stated
earlier is not evidence that the date was right."

`formatDueDate()` now renders confirmations as "Friday, 14 August 2026". The
server cannot know which Friday was meant, so naming the weekday is the only
defence: an off-by-a-week is obvious at a glance instead of arriving as an
unreadable `2026-08-14`.

### Gemini quota — free tier + preview models (both fixed, one needs Peter)
The same run failed twice with `429 … generate_content_free_tier_requests,
limit: 20`. Two separate causes, and the second is the one that would have bitten
even after paying.

1. **The key is on the API free tier.** Peter's **Google AI Ultra subscription
   does NOT fix this** — Pro/Ultra raise limits in the AI Studio playground and
   Build mode, not for an API key called from a backend. API quota is set by
   whether billing is enabled on the key's Cloud project. **Peter's action:**
   enable billing → Tier 1. NB enabling billing removes the free allowance for
   that project entirely; every call bills from the first token.
2. **Preview models stay capped at ~250 requests/DAY even on Tier 1.** All three
   defaults were preview ids. One workflow run is 10+ calls (blueprint,
   pre-flight, each step, each partner review), so 36 students would have burned
   a day's quota in minutes no matter what Peter paid.

**Changed (decision: keep Gemini, enable billing):** `DEFAULT_MAIN_MODEL`,
`DEFAULT_TITLE_MODEL` and `DEFAULT_TABULAR_MODEL` all → **`gemini-3.5-flash`**
(non-preview), with the reasoning written into `models.ts` above the Gemini
block so it does not get quietly reverted. `student_allowed_models` →
`claude-haiku-4-5, kimi-k3, claude-sonnet-4-6, gemini-3.5-flash` — both preview
ids dropped. All 39 `user_profiles.tabular_model` rows were storing
`gemini-3-flash-preview`; updated to `gemini-3.5-flash`. Preview ids remain in
`MODEL_REGISTRY` for one-off admin use.

### "next Friday" resolved a week late — and agents had NO date at all
Asked on Sunday 2 Aug, the model set the due date to Friday **14** Aug.
Australian usage: a bare weekday means the next one to occur, i.e. 7 Aug.
- The date block moved out of `contextBuilders.buildMessages` into
  **`todaySection()` in `chat/prompts.ts`**, and now spells out the weekday rule
  ("the NEXT occurrence … only the following week if the user says so
  explicitly") and requires the resolved date be stated in full so a wrong read
  costs one line to correct.
- **`buildRolePrompt` now includes it too.** The agent runtime never had the
  date — `buildRolePrompt` doesn't go through `buildMessages` — yet agent steps
  are exactly what create K&S tasks and calendar events from "due next Friday".
- Live data corrected: the surviving task's due date moved 14 Aug → 7 Aug.

## 2026-07-31 — rose.lawyer served the K&S site (assets-only Worker)
**Symptom:** `rose.lawyer/` returned the Kendry & Slate marketing shell,
`/library` 404'd, `/firm` was fine. Looked like the domain had been taken over
by the Lovable project we migrated off.

**Cause:** the deploy at 04:05Z shipped the `rose-lawyer` Worker with **no
script — assets only**. Rose is entirely Worker-rendered, so every page 404'd
and the only thing left at the root was the K&S app staged in
`frontend/public/firm`. Named exactly by `wrangler tail`:
`Cannot tail a Worker which only has assets [code: 100311]`.

**Not the cause:** DNS (still Cloudflare, `104.21.3.214`/`172.67.131.55`), the
domain, Supabase, or the Railway backend (`/health` → `{"ok":true}`
throughout). No other Cloudflare project had claimed the route. `git push` does
not deploy the frontend — there is no CI for it, only `Cutover K&S.command`.

**Fix:** `npx wrangler rollback 7a5ba7f2-…` (the 03:15Z version) restored the
script in seconds. Verified after: `/` and `/library` both serve `title: Rose`.

**Prevention (in `Cutover K&S.command`):** after the OpenNext build it now
asserts `.open-next/worker.js` is non-empty and refuses to deploy otherwise,
then smoke-tests `https://rose.lawyer/library` for a 200 after deploying and
tells you to roll back if not.

A clean `npx opennextjs-cloudflare build` was verified to emit `worker.js`
(2,278 bytes) with all 47 routes, so the build itself is sound — the bad
deploy almost certainly ran `wrangler deploy` directly, or deployed against a
cleared `.open-next`. **Use `npm run deploy` or the cutover script, never a
bare `wrangler deploy`.**

**NB the live site is currently the 03:15Z rollback**, which predates today's
frontend changes (`read_only` badges on shared playbooks/clauses,
`linked_folder_name` on the Shared badge). A fresh deploy picks them up.

## 2026-07-31 — Weeks 8 and 9 harmonised to one hour each
Peter: "this should only equate to an hour's worth of activity per week, and
for each week there should be only one folder/student guide/set of activities."
He was right — I had built a v2 Week-8 library alongside the v1 one and never
reconciled them, so Week 8 had two folders, two sets of reference material and
**12 workflows**; Week 9 had **10** and no student guide. An agent run with
partner review takes 5–10 min, so an hour is ~5 activities. Both weeks were
2–2.5× over and my runsheets hid it behind "for groups that move fast".

**Now, per week: one folder · one student guide · five activities.**

| Week 8 — Ethics, CX & EX (14 docs) | Week 9 — Change management (12 docs) |
|---|---|
| CX audit & scorecard | Change urgency — the evidence |
| Ethics scenario triage (tabular) | Guiding coalition & diffusion map |
| Team experience (EX) pulse | Change impact assessment (tabular) |
| Client happy-path map | Quick wins — 90 day plan |
| CX/EX remediation pack | Week 9 change pack |

- **12 workflows deleted** (7 × W8, 5 × W9), Peter's call. Prompts survive in
  `seed/week8_v2.sql` / `seed/week9.sql` if one is ever wanted back. Verified
  first that no `tabular_reviews` or `agent_runs` referenced them; 432 share
  rows cascaded away. Live: 5 W8 + 5 W9, 828 shares (23 workflows × 36).
- **Third folder, `Case file — NexaCare / Whitegum`** (6 docs): the leases,
  TSA schedule, MediTrax MSA and NexaCare MSA pdf are used by several weeks
  and were sitting inside the Week-8 folder, which is what made Week 8 look
  like it owned them. The empty `Week 8 - CX and EX` folder is gone. All
  three folders linked to all six group projects.
- **New student guides** `00-student-guide-week8.md` / `-week9.md` (+ .docx),
  written to the five activities with per-activity timings. The v1
  `Student_Guide_CX_EX_Week8.docx` describes activities that no longer exist —
  **still needs deleting from the Library**, and both new guides still need
  uploading: rose.lawyer was returning an error page when I tried.
- Runsheets rewritten to the five-activity hour; `WEEK8_v2_RUNSHEET.md`
  renamed `WEEK8_RUNSHEET.md` (there is no v1 to distinguish from any more).

## 2026-07-31 — Assistant now confirms K&S writes (and knows what day it is)
Peter: after creating a task the assistant showed "Completed in 6 steps" plus a
reasoning trace and nothing else — no statement, no link, no way to tell a
silent success from a silent failure. Three fixes.

**1. The system prompt had NO DATE.** That is why the transcript shows six
steps of the model triangulating "today" from task due dates and ledger
entries before guessing. `contextBuilders.ts` now appends
`TODAY: <weekday> <date> (<iso>), Australia/Sydney` plus an instruction to
resolve relative dates from it and **never** infer the date from data it has
read — matter dates are scenario data, not today. This alone removes most of
the flailing on "due next Friday".

**2. Writes return a link.** `ksMatterLink(matterId)` →
`/workspace/dashboard/matter/<id>` (the Rose shell path, NOT `/firm`, which
would drop the user out of the sidebar). Every one of the 13 write functions
now returns `{ ...row, link, confirmation }` so the model has a real URL and a
ready-made sentence rather than inventing either.

**3. `KS_SYSTEM_PROMPT`** in `chat/tools/ksTools.ts`, spliced into both
branches of `buildSystemPrompt()`. Requires the final answer to state what
changed in ordinary prose outside any reasoning, quote back the specifics
(title, assignee, hours, due date), use the tool's `link` verbatim as a
markdown link, and say so plainly when a write FAILED rather than describing
an intended action as though it happened. Also explains the append-only rule
so a refusal on NexaCare is reported, not retried.

Note `npx tsx` cannot transform in the sandbox, so the prompt assembly was
verified statically (both branches of buildSystemPrompt include the section)
rather than by executing it.

## 2026-07-31 — Admin model allow-list now binds every non-admin, everywhere
Peter asked me to confirm the Admin → allowed-models setting applies to all
non-admins on all features. It did not, in two ways. Both fixed.

**1. It was keyed on group membership.** `isRestrictedStudent()` was
`!isAdmin && listUserGroupIds().length > 0`, so any user added outside a
`user_group` was silently unrestricted — and every account is groupless
between creation and being added to a group. Now simply `!isAdmin`.
`listUserGroupIds` import dropped from modelAccess.ts.

**2. The workflow machinery bypassed the list entirely.**
`blueprintModel()` and `/compile` called bare
`resolveModel(null, DEFAULT_MAIN_MODEL)`, and `routes/workflows.ts` created
agent runs with `model: null`, so the executor fell back to
`DEFAULT_MAIN_MODEL` unchecked — **every step and every partner review of a
workflow run**. Now: `blueprintModel()` and `/compile` use
`resolveModelForUser`, the run stores the resolved model, and
`executor.ts` clamps again at run time (so a run recovered after a restart, or
created before the list changed, cannot keep calling a removed model).

**Benign until now only by luck:** `DEFAULT_MAIN_MODEL` is
`gemini-3-flash-preview`, which happens to be in the live list. Remove it and
every Week-8/9 workflow would have kept calling it.

**I was wrong about one thing** when I first reported: the per-user
title/tabular preference IS enforced on write — `routes/user.ts` ~589 returns
403 via `allowedModelIdsForUser`. It is enforced on read too
(`userSettings.getUserModelSettings`). No change was needed there.

**Enforced surface, verified by grep — every path that reaches an LLM:**
assistant + project chat (`runLLMStream`), agent runs from /agents, agent runs
from workflows, blueprint / pre-flight / edit-with-AI / compile, partner
review, tabular generate + Tabular Ask, exports AGLC restyle, Deep-verify
assertion check. The only remaining bare `resolveModel()` calls are in
`routes/user.ts` for displaying and validating stored preferences; neither
reaches a model.

Live state: 3 admins exempt, 36 non-admins restricted, 0 stored preferences
out of policy. Allow-list = claude-haiku-4-5, kimi-k3,
gemini-3.1-flash-lite-preview, claude-sonnet-4-6, gemini-3-flash-preview.

## 2026-07-31 — Rose agents/workflows/chat can now CHANGE K&S matters
Peter: "I want the agents, workflows and libraries in Rose to directly
interface with and change the tasks, time recording and other aspects of K&S
matters." Scope chosen: **everything**; on the shared matter, **own rows only**.

`backend/src/lib/ksWrites.ts` — 13 new write functions, all approval-gated:
tasks (create/update/delete), assignments (assign/unassign), time
(update/delete — record already existed), calendar (create/update/delete),
`ks_update_matter`, matter documents (add/delete). Read the header before
touching it; three rules carry the safety.

- **Backend is service-role, so RLS does not apply.** Every path calls
  `assertMatterAccess()`. `assertMatterWritable()` = membership + "is this the
  shared matter"; `assertRowWritable()` = the row-level guard.
- **Shared matter is APPEND-ONLY.** NexaCare (`shared_teaching`) is worked by
  36 students against the same 49 tasks. Anyone may add; only the creator may
  change or delete. **Fails closed**: all 49 seeded tasks and 23 seeded time
  entries have `performed_by IS NULL`, so `performed_by !== userId` rejects
  them and the Week-9 evidence base stays reproducible. `ks_update_matter`
  refuses the shared matter outright — matter-level fields aren't row-owned,
  so the ownership rule can't protect them.
- **⚠️ FK TRAP, cost me a full break:** `performed_by` → `auth.users`, but
  `tasks.created_by`, `tasks.assigned_to`, `calendar_events.created_by`,
  `documents.uploaded_by`, `time_entries.user_id` and
  `task_assignments.user_id` all → **`ks.profiles` (the personas)**. Putting an
  auth user id in any of them violates the FK and the write fails outright.
  First version set `created_by: userId` and would have failed on every task
  create. Now: the assignee persona, or null.
- Role allowlists (`agents/types.ts`): **drafting** gets all 13; **intake**
  gets only create-task/assign/create-event; **research, review, verify stay
  read-only**. All 13 in `WRITE_TOOLS`, so any plan containing one stops at the
  approval gate.
- `streaming.ts` needed no edit — it already spreads `...KS_TOOLS`, so schemas
  become chat-available automatically.
- **Verified live end to end** (create → guard → recompute → cleanup, no
  residue): append to shared matter OK; seeded row blocked; own row allowed;
  a 3h @ $600 entry moved matter fees 151,615 → 153,415 and back, so the
  statement-trigger recompute chain fires correctly from these writes.

## 2026-07-31 — K&S runs INSIDE Rose's app shell
First attempt was a Rose side panel on the matter page. Peter rejected it:
"there isn't access to all Rose features, and it isn't integrated enough."
He was right — a 680px drawer can only ever surface 3 of Rose's 12 features.
**The panel is deleted.**

**The real problem:** `/firm` is a Route Handler serving the K&S SPA shell from
Cloudflare's asset layer, deliberately OUTSIDE the `(pages)` layout. So
crossing into K&S left Rose's React tree and took `AppSidebar` with it.

**The fix — invert the nesting.** `frontend/src/app/(pages)/workspace/[[...slug]]/page.tsx`
frames `/firm` from inside the `(pages)` layout, so Rose's twelve-item sidebar
stays on the left while a lawyer works a matter and every Rose feature is one
ordinary client-side push away.
- **Why a wrapper path and not nesting `/firm` itself:** the K&S bundle is
  built with `BrowserRouter basename="/firm"`, so its router only matches
  paths under /firm. A page at /firm would shadow the URL the frame must load.
  /workspace frames /firm — no change to the K&S build or the asset route, and
  `/firm/assets/*` still hits Cloudflare before the Worker.
- **URL sync:** `ks-frontend/src/components/RouteBridge.tsx` posts
  `{type:'ks:route', path}` on every route change; the host mirrors it with
  `replaceState`, so refresh and deep links land where you were. The host
  accepts same-origin messages only and rejects any path not starting `/firm`.
- **Direct hits bounce:** landing on `/firm/...` unframed redirects to
  `/workspace/...`, preserving the path — otherwise you get bare K&S with no
  way back, which is the whole bug.
- **`iframe src` is set once** (useState initialiser). Re-deriving it per
  render would reload K&S and lose its state on every host re-render.
- K&S's marketing `Header` returns null when framed (`lib/isFramed.ts`) so
  there aren't two navs stacked. Dashboard pages have their own headers and
  are unaffected.
- Sidebar item now `/workspace`, and `isExternalApp` is gone — every sidebar
  entry is a Rose route again.
- `sandbox` omits `allow-top-navigation`: nothing in K&S can navigate Rose away.

### Three RLS/grant defects found while building the (now deleted) panel — migration `20260731_02`
Kept, because they were real. `ks.matter_projects` shipped in `20260731_01`
with **no RLS and no grant** — nothing had read it as a user before, only
triggers as owner.
1. RLS enabled (every other ks table has it).
2. `grant select … to authenticated` — RLS picks ROWS, it does not grant table
   access. Without it the panel dies with "permission denied for table
   matter_projects".
3. The first policy tested the matter only, so every student could read all six
   NexaCare mapping rows and the panel's "take the first" pointed five of six
   students at another group's project. Now also requires
   `ks.is_in_group(group_id)`. New helper `ks.is_in_group()` is SECURITY
   DEFINER and matches by uid OR email, like `lib/groupAccess.ts`.
Verified live, one student per group: each resolves NexaCare to their own
group's project.

## 2026-07-31 — A Rose project for every K&S matter (`ks.matter_projects`)
Migration `ks_matter_project_sync` (**applied**) + mirrored in
`backend/migrations/20260731_01_ks_matter_project_sync.sql`.
- `ks.matter_projects (matter_id, project_id, auto_created, group_id)` maps a
  matter to its Rose project(s). Many-to-many on purpose: NexaCare is worked by
  all six groups and already had six per-group Rose projects holding real work.
- `ks.sync_matter_project(matter_id)` is the whole thing, idempotent: ensure a
  project, keep its name current, and make `project_group_grants` equal
  `ks.matter_groups`. Triggers on `ks.matters` (insert / rename / delete) and
  on `ks.matter_groups` (insert / delete).
- **Access needs nothing new.** `project_group_grants` + `groupAccess.ts`
  already resolve group membership by email, so a student reaches exactly the
  projects for their matters.
- **`group_id` pins a project to one group.** The first version cross-joined
  every mapped project with every group on the matter → all six groups got
  access to each other's NexaCare workspace. Caught in verification, live ~2
  minutes, no student signed in. If you ever add a second multi-project matter,
  set `group_id`.
- **Delete is deliberately partial:** only `auto_created` projects are removed.
  The six NexaCare projects are mapped `auto_created = false` so no trigger can
  discard the cohort's chats and tabular reviews. Make it unconditional only if
  Peter asks.
- Verified live: create → project + one correct grant; rename → renamed;
  delete → project and grants gone, no residue. 12 projects / 7 matters.

## 2026-07-31 — Teaching documents actually uploaded (and why they weren't before)
**31 Library documents now live**, uploaded through the Rose UI by driving
Peter's browser (Claude-in-Chrome `file_upload`). Previously only 8 were there —
the 23 Week-8/Week-9 files I had generated as .docx had never reached Rose.
I could not upload them from the sandbox (no network to rose.lawyer, R2 or
GitHub — DNS fails), told Peter it needed the UI, and then **wrongly marked the
task complete**. The browser route was available the whole time.

**Closed out 31 Jul (after the Worker rollback):** both new student guides
uploaded and indexed to the KB, filed into their week folders, and the stale
`Student_Guide_CX_EX_Week8.docx` **deleted** — it described seven exercises
that no longer exist. Final Library state: `Case file — NexaCare / Whitegum`
(6) · `Week 8 — Ethics, CX & EX` (14, incl. guide) · `Week 9 — Change
management` (12, incl. guide). All three linked to all six group projects.

- Folders + links done in SQL rather than drag-drop: `Week 8 - reference &
  scenarios` (12 docs), `Week 9 - change management` (11), plus the existing
  `Week 8 - CX and EX` (8). All three linked to all six group projects via
  `library_folder_project_links`.
- **KB indexing has no UI.** `POST /library/:documentId/index` exists in the
  backend but `roseApi.ts` has NO caller — the "index to knowledge base" step in
  the runsheets was never actionable. Ran it for the 8 reference notes by
  calling the endpoint from the page with `javascript_tool` + the session token.
  KB is now 13 documents / 55 chunks, all embedded (was 5 / 15).

### Library folders do NOT appear in project documents — confirmed, by design
Linked documents arrive **flat** in a project, badged "Shared". Verified live on
Group C: all 31 documents present, no folders. Cause: `library_folders` and
`project_subfolders` are different tables, and a linked document is ONE row
shared across six projects — its single `folder_id` cannot be in six different
project subfolders at once. Fix (not yet built): have
`loadLinkedDocumentsForProject` return the source Library folder name and have
DocTable render linked docs grouped under a read-only virtual folder.

**DONE 2026-07-31.** `loadLinkedDocumentsForProject` returns
`linked_folder_name`; `DocTable.tsx` groups linked documents under **virtual
folders** named after the source Library folder — read-only (no rename, drag,
delete), collapsed by default, with a "Shared" badge and a document count.
- The ~360-line document-row JSX was extracted verbatim from the
  `childDocs.map()` body into `renderDocumentRow(doc, depth)` so the same row
  renders inside a virtual folder. Behaviour unchanged; only the call site
  moved. tsc + eslint clean.
- Expansion state key is `linked:<folder name>` in the existing
  `expandedFolderIds` set. Real folders are auto-expanded on load by the
  effect at ~line 622; virtual ones deliberately are not.
- Grouping applies at the project ROOT only (`parentId === null`), which is
  where linked docs land — a linked doc has no `folder_id` in this project.

**Library sort is alphabetical by default.** `sort` already defaulted to
name/asc but both sort paths were gated on `enableHeaderFilters`, which only
`LibraryWorkspace` sets — so documents came back in insertion order in the
Library *and* in projects. Both gates removed: `filteredDocs` sorts whenever
`sort` is set, and the folder `nameMultiplier` no longer checks the flag.
Folders and documents are now ascending alphabetical everywhere unless the
user sorts otherwise.

## 2026-07-30 — `ks.matters.shared_teaching` (NexaCare exempt from the persona filter)
The persona filter matched on `tasks.assigned_to`, a single-owner column. On
NexaCare that column is almost empty: **Mia Rossi owns 0 tasks and holds 27
task_assignments; Aisha Rahman owns 0 and holds 24**; only Bentley (2) and Chen
(1) own anything. So selecting Rossi or Rahman hid the shared case study — the
two personas the Week-9 change impact assessment is built around.
- Migration `ks_shared_teaching_matter` (**applied**): `ks.matters.shared_teaching
  boolean not null default false`, true for NexaCare.
- `MattersList.tsx`: the two persona branches collapsed into one `.or()` —
  `shared_teaching.eq.true` always, plus `lead_partner_id` for partners, plus
  the persona's task matters. Never returns early on an empty task list now.
  **Widens nothing**: RLS has already narrowed to matters the student is a
  `ks.matter_members` of; this only stops a UI filter hiding a readable matter.
- Verified per group × persona: every persona now sees NexaCare.
- **Known data quirk, left alone:** Group E's own matter has no Aisha Rahman
  tasks, so a Group E student acting as Aisha sees NexaCare only. That is the
  seeded resourcing, not the filter.
- Requires the `/firm` rebuild (`Cutover K&S.command`) to reach students.
