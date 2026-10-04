#!/usr/bin/env bash
# Local verification gate for SLICT ERP.
#
# Runs the checks a change must pass before it is pushed for review, against
# throwaway services only, and writes .verify/report.md for the pull request.
#
#   scripts/verify.sh                  compare against ERP.SLICT.LK
#   scripts/verify.sh --base <ref>     compare against another branch or commit
#   scripts/verify.sh --with-ai        also smoke-test SLICT's AI on a local Ollama model
#
# Every gate runs even if an earlier one fails, so the report is complete.
# See docs/LOCAL_VERIFICATION.md.
set -uo pipefail

BASE="ERP.SLICT.LK"
WITH_AI=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="${2:?--base needs a ref}"; shift 2 ;;
    --with-ai) WITH_AI=1; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if ! git rev-parse --verify --quiet "${BASE}^{commit}" >/dev/null; then
  echo "Base ref '$BASE' not found. Fetch it first, or pass --base." >&2
  exit 2
fi
MERGE_BASE="$(git merge-base "$BASE" HEAD)"

OUT_DIR="$REPO_ROOT/.verify"
rm -rf "$OUT_DIR" && mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/report.md"
GITLEAKS_IMAGE="zricethezav/gitleaks:v8.30.1"
COMPOSE=(docker compose -f "$SCRIPT_DIR/../docker-compose.verify.yml" --profile ai)

# Throwaway database, fresh credentials every run. DATABASE_URL is exported
# before any Prisma command runs, so a real URL in .env is never used: dotenv
# does not override a variable that is already set. Port 1 is a placeholder
# nothing listens on; the real port is known once Docker has picked one.
export VERIFY_DB_PASSWORD
VERIFY_DB_PASSWORD="$(openssl rand -hex 16 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(16))')"
db_url() { echo "postgresql://postgres:${VERIFY_DB_PASSWORD}@127.0.0.1:$1/slict_verify"; }
export DATABASE_URL
DATABASE_URL="$(db_url 1)"
# Host port Docker assigned to a service's container port.
host_port() { "${COMPOSE[@]}" port "$1" "$2" 2>/dev/null | awk -F: 'NR == 1 { print $NF }'; }
export DOTENV_CONFIG_QUIET=true

cleanup() { "${COMPOSE[@]}" down --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

ROWS=()
FAILED=0
record() {
  ROWS+=("| $1 | $2 | $3 |")
  [[ "$2" == "FAIL" ]] && FAILED=1
  printf '%-36s %-5s %s\n' "$1" "$2" "$3"
}

# Prisma prints a dotenv banner on stdout; keep only real output.
prisma_quiet() { pnpm exec prisma "$@" 2>/dev/null | grep -vE '^(◇|\[dotenv)'; }

echo "Verifying $(git rev-parse --short HEAD) against $BASE (merge base $(git rev-parse --short "$MERGE_BASE"))"
echo

# --- Prisma client must match this checkout's schema before type-checking ---
if ! pnpm exec prisma generate >"$OUT_DIR/prisma-generate.log" 2>&1; then
  record "Prisma client" FAIL "prisma generate failed; see .verify/prisma-generate.log"
fi

# --- 1. Secrets in the commits this branch adds ---
COMMITS="$(git rev-list --count "$MERGE_BASE..HEAD")"
if [[ "$COMMITS" == "0" ]]; then
  record "Secrets (gitleaks)" SKIP "no commits since the base"
# Our rules extend gitleaks' defaults with the password patterns this repository
# actually leaked; mounted from the harness so they apply to any branch scanned.
elif docker run --rm --user "$(id -u):$(id -g)" -v "$REPO_ROOT:/repo" \
    -v "$SCRIPT_DIR/../.gitleaks.toml:/cfg/.gitleaks.toml:ro" "$GITLEAKS_IMAGE" \
    git /repo --log-opts="$MERGE_BASE..HEAD" --config /cfg/.gitleaks.toml \
    --no-banner --redact --exit-code 1 >"$OUT_DIR/gitleaks.log" 2>&1; then
  record "Secrets (gitleaks)" PASS "$COMMITS new commit(s) scanned"
else
  record "Secrets (gitleaks)" FAIL "leak found or scan failed; see .verify/gitleaks.log"
fi

# --- 2. No new "|| 'default'" fallbacks for secrets (ratchet against the base) ---
# Matches NEXTAUTH_SECRET || 'secret' and API_KEY || "abc", but not GROQ_MAX_TOKENS
# || '2000' (not a secret), || '' (nothing hardcoded) or comment lines describing it.
FALLBACK_RE=$'process\\.env\\.[A-Z0-9_]*(SECRET|KEY|PASSWORD|TOKEN)(_[A-Z0-9_]*)?[[:space:]]*\\|\\|[[:space:]]*[\'"`][^\'"`]'
count_fallbacks() { git grep -hE "$FALLBACK_RE" "$1" -- src 2>/dev/null | grep -cvE '^[[:space:]]*(\*|//|/\*)'; }
BASE_FB="$(count_fallbacks "$MERGE_BASE")"
HEAD_FB="$(count_fallbacks HEAD)"
if (( HEAD_FB > BASE_FB )); then
  record "Fallback secrets" FAIL "$BASE_FB on base, $HEAD_FB now: this branch adds a hardcoded secret default"
else
  record "Fallback secrets" PASS "$BASE_FB on base, $HEAD_FB now"
fi

# --- 3. Type-check, judged against the known baseline ---
NODE_OPTIONS=--max-old-space-size=4096 pnpm exec tsc --noEmit --incremental false >"$OUT_DIR/tsc.log" 2>&1
TSC_EXIT=$?
grep -oE '^[^(]+\([0-9]+,[0-9]+\): error TS[0-9]+' "$OUT_DIR/tsc.log" \
  | sed -E 's/\([0-9]+,[0-9]+\): error /: /' | sort -u >"$OUT_DIR/tsc-errors.txt"
grep -vE '^[[:space:]]*(#|$)' "$SCRIPT_DIR/verify/tsc-baseline.txt" | sort -u >"$OUT_DIR/tsc-baseline.txt"
NEW_ERRORS="$(comm -23 "$OUT_DIR/tsc-errors.txt" "$OUT_DIR/tsc-baseline.txt" | wc -l)"
STALE="$(comm -13 "$OUT_DIR/tsc-errors.txt" "$OUT_DIR/tsc-baseline.txt" | wc -l)"
KNOWN="$(comm -12 "$OUT_DIR/tsc-errors.txt" "$OUT_DIR/tsc-baseline.txt" | wc -l)"
if (( TSC_EXIT != 0 )) && [[ ! -s "$OUT_DIR/tsc-errors.txt" ]]; then
  record "Type-check" FAIL "tsc exited $TSC_EXIT without reporting errors; see .verify/tsc.log"
elif (( NEW_ERRORS > 0 )); then
  record "Type-check" FAIL "$NEW_ERRORS new error(s): $(comm -23 "$OUT_DIR/tsc-errors.txt" "$OUT_DIR/tsc-baseline.txt" | head -3 | paste -sd ';' -)"
else
  NOTE="0 new, $KNOWN known from the baseline"
  (( STALE > 0 )) && NOTE="$NOTE; $STALE baseline entry(ies) no longer occur and can be removed"
  record "Type-check" PASS "$NOTE"
fi

# --- 4. Unit tests on a UTC clock, as on the server ---
if TZ=UTC pnpm exec jest --ci >"$OUT_DIR/jest.log" 2>&1; then
  record "Unit tests (TZ=UTC)" PASS "$(grep -E '^Tests:' "$OUT_DIR/jest.log" | sed -E 's/^Tests:[[:space:]]*//')"
else
  record "Unit tests (TZ=UTC)" FAIL "$(grep -E '^Tests:' "$OUT_DIR/jest.log" | sed -E 's/^Tests:[[:space:]]*//'); see .verify/jest.log"
fi

# --- 5. Migrations: apply to today's schema, then require zero drift ---
if git diff --quiet "$MERGE_BASE" HEAD -- prisma/schema.prisma; then SCHEMA_CHANGED=0; else SCHEMA_CHANGED=1; fi
mapfile -t NEW_MIGRATIONS < <(git diff --name-only --diff-filter=A "$MERGE_BASE" HEAD -- 'prisma/migrations/*/migration.sql' | sort)

migration_gate() {
  if ! "${COMPOSE[@]}" up -d --wait postgres >"$OUT_DIR/compose.log" 2>&1; then
    record "Migration safety" FAIL "could not start the throwaway Postgres; see .verify/compose.log"
    return
  fi
  DATABASE_URL="$(db_url "$(host_port postgres 5432)")"
  local psql=("${COMPOSE[@]}" exec -T postgres psql -U postgres -d slict_verify -v ON_ERROR_STOP=1 -q)

  git show "$MERGE_BASE:prisma/schema.prisma" >"$OUT_DIR/schema.base.prisma"
  prisma_quiet migrate diff --from-empty --to-schema "$OUT_DIR/schema.base.prisma" --script >"$OUT_DIR/base.sql"
  if ! "${psql[@]}" <"$OUT_DIR/base.sql" >"$OUT_DIR/migrate.log" 2>&1; then
    record "Migration safety" FAIL "could not build the base schema; see .verify/migrate.log"
    return
  fi

  local migration
  for migration in "${NEW_MIGRATIONS[@]}"; do
    if ! "${psql[@]}" <"$migration" >>"$OUT_DIR/migrate.log" 2>&1; then
      record "Migration safety" FAIL "$migration failed to apply; see .verify/migrate.log"
      return
    fi
  done

  prisma_quiet migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script >"$OUT_DIR/drift.sql"
  if grep -q "This is an empty migration" "$OUT_DIR/drift.sql"; then
    record "Migration safety" PASS "${#NEW_MIGRATIONS[@]} new migration(s) applied to the base schema; no drift"
  else
    record "Migration safety" FAIL "database after migrating differs from schema.prisma; see .verify/drift.sql"
  fi
}

if (( SCHEMA_CHANGED == 0 )) && (( ${#NEW_MIGRATIONS[@]} == 0 )); then
  record "Migration safety" SKIP "no schema change"
elif (( SCHEMA_CHANGED == 1 )) && (( ${#NEW_MIGRATIONS[@]} == 0 )); then
  record "Migration safety" FAIL "schema.prisma changed but no migration was added"
else
  migration_gate
fi

# --- 6. SLICT's AI on a local model (optional) ---
if (( WITH_AI == 0 )); then
  record "Local AI (Ollama)" SKIP "run with --with-ai"
else
  MODEL="${VERIFY_AI_MODEL:-qwen2.5:0.5b}"
  if ! "${COMPOSE[@]}" up -d ollama >>"$OUT_DIR/compose.log" 2>&1; then
    record "Local AI (Ollama)" FAIL "could not start Ollama; see .verify/compose.log"
  else
    OLLAMA="http://127.0.0.1:$(host_port ollama 11434)"
    for _ in $(seq 1 60); do curl -sf "$OLLAMA/api/tags" >/dev/null && break; sleep 1; done
    if ! "${COMPOSE[@]}" exec -T ollama ollama pull "$MODEL" >"$OUT_DIR/ollama-pull.log" 2>&1; then
      record "Local AI (Ollama)" FAIL "could not pull $MODEL; see .verify/ollama-pull.log"
    # The app reads three different variable names for the Ollama URL; set all of them.
    elif RESULT="$(OLLAMA_URL="$OLLAMA" OLLAMA_API_URL="$OLLAMA" OLLAMA_BASE_URL="$OLLAMA" OLLAMA_MODEL="$MODEL" \
        pnpm exec tsx "$SCRIPT_DIR/verify/ai-smoke.ts" 2>"$OUT_DIR/ai-smoke.log")"; then
      record "Local AI (Ollama)" PASS "$RESULT"
    else
      record "Local AI (Ollama)" FAIL "smoke test failed; see .verify/ai-smoke.log"
    fi
  fi
fi

record "Lint" SKIP "not configured: next lint was removed in Next.js 16"

# --- Report ---
if git diff --quiet && git diff --cached --quiet; then
  TREE="clean"
else
  TREE="uncommitted changes present: tests and type-check saw them, the migration and secret gates did not"
fi
{
  echo "# Verification report"
  echo
  echo "- **Result:** $([[ $FAILED -eq 0 ]] && echo PASS || echo FAIL)"
  echo "- **Commit:** \`$(git rev-parse --short HEAD)\` on \`$(git branch --show-current 2>/dev/null || true)${GITHUB_HEAD_REF:-}\`"
  echo "- **Compared with:** \`$BASE\`, merge base \`$(git rev-parse --short "$MERGE_BASE")\`"
  echo "- **Run:** $(date -u +%Y-%m-%dT%H:%M:%SZ), $SECONDS s, machine clock UTC$(date +%z)"
  echo "- **Tools:** node $(node -v), pnpm $(pnpm -v), postgres:16-alpine, $GITLEAKS_IMAGE"
  echo "- **Working tree:** $TREE"
  echo
  echo "| Gate | Result | Detail |"
  echo "| --- | --- | --- |"
  printf '%s\n' "${ROWS[@]}"
  echo
  echo "## Before asking for review"
  echo
  echo "These cannot run inside a script. Tick them in the pull request."
  echo
  echo "- [ ] Claude Code \`/security-review\` on this branch"
  echo "- [ ] Claude Code \`/code-review\` on this branch"
  echo "- [ ] Antigravity second opinion"
  echo "- [ ] This report and all three reviews pasted into the pull request"
} >"$REPORT"

echo
echo "Result: $([[ $FAILED -eq 0 ]] && echo PASS || echo FAIL). Report: .verify/report.md"
exit "$FAILED"
