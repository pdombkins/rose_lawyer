# Rose

> ⚠️ **For research and educational purposes only.**
>
> Rose is a university teaching and research project. It is **not** intended for commercial use, and it does **not** provide legal advice.
>
> Rose verifies Australian case citations through a pluggable set of sources. **By default it uses human-in-the-loop verification on AustLII**: your own browser opens an AustLII search in a new tab (ordinary, permitted end-use) and you record whether the citation checks out — Rose never fetches AustLII itself. Automated verification via **Jade.io** (BarNet) is **off by default**: Jade.io's [Acceptable Use Policy](https://ppp.jade.io/acceptable-use-policy) prohibits automated access without BarNet's prior written permission, so it must be enabled by an admin **only after** obtaining that permission. **Do not enable Jade.io access until you have BarNet's written permission.**

Rose is an Australian legal document assistant with a Next.js frontend, an Express backend, Supabase Auth/Postgres, and Cloudflare R2-compatible object storage.

This is the Australian fork of Mike OSS, configured specifically for Australian and New Zealand law. It formats citations per AGLC4 (Australian Guide to Legal Citation, 4th edition) and verifies them through swappable sources — human verification on AustLII by default, or automated verification via Jade.io once BarNet's permission is held and an admin enables it. See [Citation verification](#citation-verification-australian-law) below.

Website: [rose.lawyer](https://rose.lawyer) · [Terms of Use](https://rose.lawyer/terms) · [Privacy Policy](https://rose.lawyer/privacy)

## Beyond the core assistant

Rose also includes: an agent runtime for multi-step planned/approved workflows (`/agents`), notifications, org-level audit logging and role-based access control, a knowledge base of clauses and playbooks with AI-assisted review, an MCP server exposing Rose's research tools to external clients, Regwatch (curated official AU/NZ regulator RSS monitoring), tabular document review with typed columns and manual overrides, per-user/per-project usage and budget tracking, and admin analytics. These are not covered in detail below; see `CLAUDE.md` for the fuller feature history.

## Contents

- `frontend/` - Next.js application
- `backend/` - Express API, Supabase access, document processing, and database schema
- `backend/schema.sql` - Supabase schema for fresh databases
- `backend/migrations/` - dated, incremental schema migrations; on an existing database, apply the files dated after the Rose version you deployed

## Prerequisites

- Node.js 20 or newer
- npm
- git
- A Supabase project
- A Cloudflare R2 bucket, MinIO bucket, or another S3-compatible bucket
- At least one supported model provider API key: Anthropic, Google Gemini, OpenAI, or Moonshot (Kimi)
- LibreOffice installed locally if you need DOC/DOCX to PDF conversion

## Database Setup

For a new Supabase database, open the Supabase SQL editor and run:

```sql
-- copy and run the contents of:
-- backend/schema.sql
```

The schema file is a snapshot current as of **2026-07-19**; it is not updated in lockstep with every migration. After running it, also apply every dated file in `backend/migrations/` from `20260721_01_agent_runtime.sql` onward, in filename order, to reach the current shape (agent runtime, notifications, audit/RBAC, clauses, Regwatch, org context, verification reports, budgets, list items, and more).

For an existing database, do not run the full schema file over production data. Instead, apply the incremental files in `backend/migrations/`: run the migrations dated **after** the version of Rose you currently have deployed, in filename order. Each file is named `YYYYMMDD_<name>.sql` (the date is also recorded in a comment at the top of the file) and is written to be safe to re-run, so when unsure you can re-apply the most recent migrations without harm.

## Environment

Create local env files:

```bash
touch backend/.env
touch frontend/.env.local
```

Create `backend/.env`:

```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
DOWNLOAD_SIGNING_SECRET=replace-with-a-random-32-byte-hex-string
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-key

R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=mike

GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
RESEND_API_KEY=your-resend-key
USER_API_KEYS_ENCRYPTION_SECRET=your-long-random-secret

# Optional: Moonshot AI (Kimi). Prefer a self-hosted endpoint (KIMI_BASE_URL,
# e.g. vLLM/SGLang) if you have one; otherwise falls back to hosted Moonshot.
KIMI_BASE_URL=
MOONSHOT_API_KEY=your-moonshot-key
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Supabase values come from the project dashboard. Use the project URL for `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`, the service role key for the backend `SUPABASE_SECRET_KEY`, and the anon/public key for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. If your Supabase project shows multiple key formats, use the legacy JWT-style anon and service role keys expected by the Supabase client libraries.

Provider keys are only needed for the models and email features you plan to use. Model provider keys can be configured in `backend/.env` for the whole instance, or per user in **Account > Models & API Keys**. If a provider key is present in `backend/.env`, that provider is available by default and the matching browser API key field is read-only.

## Citation verification (Australian law)

Before the assistant relies on an Australian or New Zealand case citation, it calls a `verify_citation` tool that routes to a configurable chain of verification sources. Two are built in:

- **AustLII (human, default).** Rose does **not** access AustLII programmatically. It shows a verification card with the citation and a "Search on AustLII" button; your browser opens the AustLII search in a new tab (ordinary permitted end-use), you confirm the citation yourself, and record **Verified** / **Not verified**. Only that outcome — never AustLII content — is passed back to the assistant, which then finalises its advice.
- **Jade.io (automated, opt-in).** When enabled, Rose verifies citations automatically against Jade.io, falling back to AustLII human verification only if Jade.io fails.

An admin controls which is used from **Admin → Legal research → citation verification**, via the setting *"Have you obtained approval from Jade.io to access their platform via this tool?"*:

- **No** (default) → AustLII human verification only, with no automated Jade.io access.
- **Yes** → Jade.io automated verification, with AustLII human verification as a fallback.

The setting is stored per instance in the `app_settings` table (`jade_access_approved`, defaulting to `false`). **Only set it to Yes after obtaining BarNet's written permission for automated Jade.io access.**

Verification sources are pluggable: a new source (e.g. another provider) is added by implementing a small `VerificationSource` in `backend/src/lib/verification/sources/` and adding its id to a chain in `backend/src/lib/verification/index.ts` — no other code changes required.

## CourtListener (inherited, currently inactive)

Rose was forked from an upstream project that supports CourtListener for US case-law lookup and citation verification. That support code (backend dispatcher, routes, and some frontend panels) is still present in the repository, but Rose's tool schemas and system prompt are **not wired up to expose it to the assistant** — Rose's legal research is deliberately Jade.io/AustLII-only, per its Australian-law focus (see [Citation verification](#citation-verification-australian-law)). Setting a `COURTLISTENER_API_TOKEN` will not currently enable any assistant-facing behaviour. Treat this as legacy code, not a supported feature.

## Install

Install each app package:

```bash
npm install --prefix backend
npm install --prefix frontend
```

## Run Locally

### Quick start (macOS)

A double-click launcher is included: **`Start Rose.command`** (in the repo root). Double-clicking it in Finder opens Terminal, starts the backend and frontend dev servers in two tabs (sourcing `nvm` so `npm` is available), waits a few seconds, and opens `http://localhost:3000` in your browser. It assumes the repo lives at `~/mike-OSS`. Close the Terminal tabs to stop the servers.

If macOS blocks it the first time, either right-click → **Open**, or make it executable once with `chmod +x "Start Rose.command"`.

### Manual start

Start the backend:

```bash
npm run dev --prefix backend
```

Start the main app:

```bash
npm run dev --prefix frontend
```

Open `http://localhost:3000`.

## First Run

1. Sign up in the app.
2. If you did not set provider keys in `backend/.env`, open **Account > Models & API Keys** and add an Anthropic, Gemini, OpenAI, or Moonshot API key.
3. Create or open a project and start chatting with documents.

## Troubleshooting

**Sign-up confirmation email never arrives.** Confirmation emails are sent by Supabase Auth, not by Rose. For local development, the simplest fix is to disable email confirmation in **Supabase > Authentication > Providers > Email**. For production, configure custom SMTP in Supabase; the built-in mailer is heavily rate-limited and may be restricted on newer projects.

**The model picker shows a missing-key warning.** Add a key for that provider in **Account > Models & API Keys**, or configure the provider key in `backend/.env` and restart the backend.

**DOC or DOCX conversion fails.** Install LibreOffice locally and restart the backend so document conversion commands are available on the process path.

## Cost Tracking

Rose records the token usage and AUD cost of every LLM query and displays a cost badge under each assistant response. Costs are stored in the `query_costs` Supabase table and summarised on the Admin page.

### Pricing configuration

`backend/src/lib/pricing.ts` contains a `MODEL_PRICES` table with the **publicly listed retail rates** for each supported model. If you are on an enterprise plan, a committed-use discount, or any negotiated rate that differs from retail, update the `inputPerMToken` and `outputPerMToken` values for each model to match your actual contracted price before deploying:

```typescript
// backend/src/lib/pricing.ts
const MODEL_PRICES: Record<string, ModelPrice> = {
    "claude-sonnet-4-6": { inputPerMToken: 3.00, outputPerMToken: 15.00 },
    // …
};
```

Prices are in **USD per million tokens**. Check your provider billing dashboard or contract for the exact figures.

### Currency

Cost badges and the Admin dashboard show costs in AUD. The conversion rate is fetched once per day from `open.er-api.com/v6/latest/USD` and cached in memory; the fallback rate is 1.55. To display a different currency, update `getAudRate()` in `backend/src/lib/pricing.ts` — change the fetch URL to your currency pair and rename the `costAud` / `aud_rate` fields as needed throughout the codebase.

### Running the migration

The `query_costs` table is created by `supabase/migrations/20240705_query_costs.sql`. Run it in the Supabase SQL Editor for your project (or apply it via the Supabase CLI) before starting the backend for the first time. For existing deployments, this is an additive migration that is safe to apply at any time.

## Useful Checks

```bash
npm run build --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```
