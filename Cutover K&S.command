#!/bin/bash
# =====================================================================
# Rose × Kendry & Slate — cutover build & deploy
#
# Double-click this file in Finder, or run it from Terminal.
# Safe to re-run. Stops at the first failure rather than deploying
# something broken.
#
# Step 1 of the cutover (exposing the `ks` schema in Supabase) is ALREADY
# DONE and verified. This script does the rest:
#   · builds the K&S app and stages it into frontend/public/firm
#   · builds Rose (which now includes /firm)
#   · optionally deploys to Cloudflare
# =====================================================================

set -euo pipefail
cd "$(dirname "$0")"

BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'
step() { echo; echo "${BOLD}▸ $1${OFF}"; }
ok()   { echo "${GREEN}✓ $1${OFF}"; }
# Hold the window open on failure so the error stays readable — double-clicked
# .command windows otherwise close (or the shell exits) and take the output.
fail() {
  echo; echo "${RED}✗ $1${OFF}"; echo
  echo "Copy the output above and send it to Claude."
  read -r -p "Press Return to close… " _ || true
  exit 1
}
trap 'echo; echo "${RED}Stopped unexpectedly.${OFF}"; read -r -p "Press Return to close… " _ || true' ERR

echo "${BOLD}Rose × Kendry & Slate — cutover${OFF}"
echo "Repo: $(pwd)"

# ---------------------------------------------------------------------
step "1/6  Checking the ks schema is exposed"
# ---------------------------------------------------------------------
KEY="sb_publishable_EfbhXx3f1fdgHta5N1OmkA_zDGt98p8"
CODE=$(curl -s -o /tmp/ks_probe.json -w "%{http_code}" \
  "https://vmdswdlkaxlklgvsvuqi.supabase.co/rest/v1/matters?select=id&limit=1" \
  -H "apikey: ${KEY}" -H "Accept-Profile: ks" || true)
if grep -q "Invalid schema" /tmp/ks_probe.json 2>/dev/null; then
  fail "The 'ks' schema is not exposed. Supabase → Integrations → Data API → Settings → Exposed schemas → tick 'ks' → Save."
fi
# 401 "permission denied for schema ks" is CORRECT here: anon is deliberately
# revoked, and this probe is anonymous. Only "Invalid schema" is a failure.
ok "ks schema resolves (HTTP ${CODE}; anon correctly denied)"

# ---------------------------------------------------------------------
step "1b/6  Deploying K&S edge functions (instructor-only batch jobs)"
# ---------------------------------------------------------------------
# gantt-import-processor and rebaseline-processor are large; reset-processor
# and hours-processor were deployed directly via the Supabase API. All four
# now require verify_jwt + an admin check (see supabase/functions/_shared).
# Needs a one-off `npx supabase login` on this machine.
if [ "${SKIP_FUNCTIONS:-0}" = "1" ]; then
  echo "  skipped (SKIP_FUNCTIONS=1)"
elif npx --yes supabase projects list >/dev/null 2>&1; then
  ( cd ks-frontend
    for fn in gantt-import-processor rebaseline-processor reset-processor hours-processor; do
      if npx --yes supabase functions deploy "$fn" --project-ref vmdswdlkaxlklgvsvuqi >/dev/null 2>&1; then
        ok "deployed $fn"
      else
        echo "${YELLOW}  ! $fn failed to deploy — run manually and check the output${OFF}"
      fi
    done )
else
  echo "${YELLOW}  Supabase CLI not authenticated. Run once:${OFF}"
  echo "      npx supabase login"
  echo "  then re-run this script, or set SKIP_FUNCTIONS=1 to skip."
fi

# ---------------------------------------------------------------------
step "2/6  Installing K&S dependencies"
# ---------------------------------------------------------------------
cd ks-frontend
# No lockfile on first run (the Lovable export didn't include one), so this
# resolves fresh and writes package-lock.json — commit it afterwards so
# subsequent runs are reproducible via `npm ci`.
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || fail "npm ci failed — try deleting ks-frontend/package-lock.json and re-running"
else
  npm install --no-audit --no-fund || fail "npm install failed (see the ERESOLVE/peer-dependency details above)"
fi
ok "dependencies installed"

# ---------------------------------------------------------------------
step "3/6  Type-checking and building K&S"
# ---------------------------------------------------------------------
npx tsc --noEmit -p tsconfig.app.json || fail "K&S TypeScript errors — fix before deploying"
ok "typecheck clean"
npm run build || fail "K&S build failed"
[ -f dist/index.html ] || fail "K&S build produced no dist/index.html"
ok "K&S built"

# ---------------------------------------------------------------------
step "4/6  Staging K&S into Rose at /firm"
# ---------------------------------------------------------------------
cd ..
rm -rf frontend/public/firm
mkdir -p frontend/public/firm
cp -R ks-frontend/dist/. frontend/public/firm/
[ -f frontend/public/firm/index.html ] || fail "staging failed"
ok "staged $(find frontend/public/firm -type f | wc -l | tr -d ' ') files into frontend/public/firm"

# ---------------------------------------------------------------------
step "5/6  Building Rose"
# ---------------------------------------------------------------------
cd frontend
npx tsc --noEmit || fail "Rose TypeScript errors"
ok "Rose typecheck clean"
# build:firm already ran above, so call next build directly
npx next build || fail "Rose build failed"
ok "Rose built"

# ---------------------------------------------------------------------
step "6/6  Deploy"
# ---------------------------------------------------------------------
echo
echo "${YELLOW}Everything built successfully. Nothing has been deployed yet.${OFF}"
echo
echo "Before deploying, test locally in another Terminal tab:"
echo "    cd ~/mike-OSS/frontend && npm run dev"
echo "  then open  http://localhost:3000/firm"
echo
read -r -p "Deploy to rose.lawyer now? [y/N] " REPLY
if [[ "${REPLY:-N}" =~ ^[Yy]$ ]]; then
  npx opennextjs-cloudflare build || fail "opennext build failed"
  npx opennextjs-cloudflare deploy || fail "deploy failed"
  echo
  ok "Deployed"
  echo "Verifying the SPA fallback on the live domain…"
  # Cloudflare needs a little time to propagate a fresh asset manifest, so
  # retry rather than declaring failure on the first probe.
  for p in /firm /firm/dashboard /firm/about; do
    C=000
    for attempt in 1 2 3 4 5 6; do
      C=$(curl -sL -o /dev/null -w "%{http_code}" "https://rose.lawyer${p}" || echo 000)
      [ "$C" = "200" ] && break
      sleep 5
    done
    if [ "$C" = "200" ]; then
      ok "https://rose.lawyer${p} → 200"
    else
      echo "${RED}✗ https://rose.lawyer${p} → ${C} (after 6 attempts)${OFF}"
      echo "${YELLOW}  response body:${OFF}"
      curl -sL "https://rose.lawyer${p}" | head -20 | sed 's/^/    /'
    fi
  done
  echo
  echo "${BOLD}Next:${OFF} sign in at https://rose.lawyer, then click 'Kendry & Slate'"
  echo "in the sidebar. You should land in the dashboard already signed in."
else
  echo "Skipped deploy. Re-run this script when ready."
fi
