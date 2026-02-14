#!/bin/zsh
# migrate.sh - Dialectica Migration Runner
#
# Run, track, and manage database migrations for the voice-coach project.
# Uses Management API (primary) with psql fallback.
#
# Project Name: voice-coach
# Project Ref:  enatcutnrtuauykqyajc
#
# Usage:
#   ./scripts/migrate.sh                       # run all pending
#   ./scripts/migrate.sh status                # show applied vs pending
#   ./scripts/migrate.sh run                   # run all pending (same as no args)
#   ./scripts/migrate.sh run 029               # run migration matching "029"
#   ./scripts/migrate.sh run 029_qa            # more specific match
#   ./scripts/migrate.sh create add_foo        # create 030_add_foo.sql
#   ./scripts/migrate.sh rollback              # undo last applied migration (tracking only)
#   ./scripts/migrate.sh --yes run             # skip confirmation
#   ./scripts/migrate.sh --dry-run run         # preview without applying
#
# Security (macOS Keychain or env vars):
#   DB password:     Keychain "dialectica_db" / "supabase_db" or env DIALECTICA_DB_PASSWORD
#   CLI token:       Keychain "Supabase CLI" (supabase login) or env SUPABASE_ACCESS_TOKEN

set -euo pipefail

# =============================================================================
# Config
# =============================================================================

PROJECT_REF="enatcutnrtuauykqyajc"
PROJECT_NAME="voice-coach (Dialectica)"
MGMT_API="https://api.supabase.com/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../supabase/migrations"
CURRENT_USER="${USER:-$(whoami)}"
AUTO_CONFIRM=false
DRY_RUN=false

# Postgres connection (pooler)
DB_HOST="aws-1-eu-west-2.pooler.supabase.com"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres.${PROJECT_REF}"
DB_KEYCHAIN_NAMES=("dialectica_db" "supabase_db")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# Key retrieval
# =============================================================================

get_access_token() {
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "$SUPABASE_ACCESS_TOKEN"
    return
  fi
  local token
  token=$(security find-generic-password -a "supabase" -s "Supabase CLI" -w 2>/dev/null) || return 1
  echo "$token"
}

get_db_password() {
  if [[ -n "${DIALECTICA_DB_PASSWORD:-}" ]]; then
    echo "$DIALECTICA_DB_PASSWORD"
    return
  fi
  local pw
  for name in "${DB_KEYCHAIN_NAMES[@]}"; do
    pw=$(security find-generic-password -a "${CURRENT_USER}" -s "$name" -w 2>/dev/null) && {
      echo "$pw"
      return
    }
  done
  echo -e "${RED}Error: No DB password found${NC}" >&2
  echo -e "Set via env:      ${CYAN}export DIALECTICA_DB_PASSWORD=\"your-password\"${NC}" >&2
  echo -e "Or via Keychain:  ${CYAN}security add-generic-password -U -a \"\$USER\" -s \"dialectica_db\" -w \"your-password\"${NC}" >&2
  exit 1
}

# =============================================================================
# SQL execution - Management API primary, psql fallback
# =============================================================================

SQL_ENGINE=""

run_sql_api() {
  local sql="$1"
  local token
  token=$(get_access_token) || return 1

  local response
  response=$(curl -sS -w "\n%{http_code}" \
    -X POST "${MGMT_API}/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$sql")")

  local http_code body
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "$body"
    return 0
  fi
  return 1
}

run_sql_psql() {
  local sql="$1"
  local pw
  pw=$(get_db_password)
  local conn="host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER connect_timeout=10"
  PGPASSWORD="$pw" psql "$conn" -c "$sql" 2>&1
}

run_sql_psql_file() {
  local file="$1"
  local pw
  pw=$(get_db_password)
  local conn="host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER connect_timeout=10"
  PGPASSWORD="$pw" psql "$conn" -f "$file" 2>&1
}

run_sql() {
  local sql="$1"
  if run_sql_api "$sql" 2>/dev/null; then
    SQL_ENGINE="api"
    return 0
  fi
  SQL_ENGINE="psql"
  run_sql_psql "$sql"
}

# =============================================================================
# Helpers
# =============================================================================

confirm() {
  local msg="$1"
  if [[ "$AUTO_CONFIRM" == "true" ]]; then
    return 0
  fi
  echo ""
  echo -ne "${msg} ${DIM}[y/N]${NC} "
  read -r answer
  [[ "$answer" =~ ^[Yy] ]]
}

banner() {
  local mode="$1"
  echo -e "${MAGENTA}+================================================+${NC}"
  echo -e "${MAGENTA}|${NC}  ${BOLD}MIGRATION RUNNER${NC}"
  echo -e "${MAGENTA}|${NC}  ${CYAN}${PROJECT_NAME}${NC}"
  echo -e "${MAGENTA}|${NC}  Ref: ${DIM}${PROJECT_REF}${NC}"
  echo -e "${MAGENTA}|${NC}  Mode: ${YELLOW}${mode}${NC}"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${MAGENTA}|${NC}  ${RED}*** DRY RUN - NO CHANGES ***${NC}"
  fi
  echo -e "${MAGENTA}+================================================+${NC}"
}

# =============================================================================
# Migration tracking table
# =============================================================================

ensure_tracking_table() {
  run_sql "
    CREATE TABLE IF NOT EXISTS _migration_history (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  " > /dev/null 2>&1 || true
}

get_applied_list() {
  run_sql "SELECT filename FROM _migration_history ORDER BY filename;" 2>/dev/null || echo ""
}

record_migration() {
  local filename="$1"
  run_sql "INSERT INTO _migration_history (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;" > /dev/null 2>&1
}

remove_migration_record() {
  local filename="$1"
  run_sql "DELETE FROM _migration_history WHERE filename = '${filename}';" > /dev/null 2>&1
}

is_applied() {
  local filename="$1"
  local applied="$2"
  echo "$applied" | grep -q "${filename}"
}

# =============================================================================
# Core: apply a single migration
# =============================================================================

apply_migration() {
  local file="$1"
  local filename
  filename=$(basename "$file")

  echo -e "  ${BLUE}Applying:${NC} ${filename}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "    ${YELLOW}-> skipped (dry run)${NC}"
    return 0
  fi

  # Try Management API first
  if run_sql_api "$(cat "$file")" > /dev/null 2>&1; then
    echo -e "    ${GREEN}-> applied${NC} ${DIM}(api)${NC}"
    return 0
  fi

  # Fallback to psql -f
  echo -e "    ${DIM}(api unavailable, using psql)${NC}"
  if run_sql_psql_file "$file" > /dev/null 2>&1; then
    echo -e "    ${GREEN}-> applied${NC} ${DIM}(psql)${NC}"
    return 0
  fi

  echo -e "    ${RED}-> FAILED${NC}" >&2
  # Show error details
  local pw
  pw=$(get_db_password)
  local conn="host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER connect_timeout=10"
  PGPASSWORD="$pw" psql "$conn" -f "$file" 2>&1 | head -10 | while read -r line; do
    echo -e "    ${RED}  $line${NC}" >&2
  done
  return 1
}

# =============================================================================
# Commands
# =============================================================================

cmd_run() {
  local target="${1:-all}"
  banner "RUN"
  ensure_tracking_table

  local applied
  applied=$(get_applied_list)

  # Detect engine
  run_sql "SELECT 1" > /dev/null 2>&1
  if [[ -n "$SQL_ENGINE" ]]; then
    echo -e "  Engine: ${DIM}${SQL_ENGINE}${NC}"
  fi

  # Collect pending
  local pending_files=()
  local pending_names=()
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")
    if is_applied "$filename" "$applied"; then
      continue
    fi
    if [[ "$target" != "all" && "$filename" != *"$target"* ]]; then
      continue
    fi
    pending_files+=("$file")
    pending_names+=("$filename")
  done

  if [[ ${#pending_files[@]} -eq 0 ]]; then
    echo ""
    echo -e "  ${GREEN}All migrations are up to date.${NC}"
    return
  fi

  echo ""
  echo -e "${YELLOW}Pending (${#pending_files[@]}):${NC}"
  for f in "${pending_names[@]}"; do
    echo -e "  ${CYAN}- $f${NC}"
  done

  confirm "Apply ${#pending_files[@]} migration(s) to ${PROJECT_REF}?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }
  echo ""

  local count=0 failed=0 skipped=0

  for ((i = 1; i <= ${#pending_files[@]}; i++)); do
    local file="${pending_files[$i]}"
    local filename="${pending_names[$i]}"

    if apply_migration "$file"; then
      if [[ "$DRY_RUN" != "true" ]]; then
        record_migration "$filename"
      fi
      ((count++))
    else
      ((failed++))
      echo ""
      echo -e "${RED}Stopping on failure at: ${filename}${NC}" >&2
      skipped=$(( ${#pending_files[@]} - i ))
      break
    fi
  done

  echo ""
  echo -e "${BOLD}Results:${NC}"
  echo -e "  ${GREEN}Applied: ${count}${NC}"
  [[ $failed -gt 0 ]] && echo -e "  ${RED}Failed:  ${failed}${NC}"
  [[ $skipped -gt 0 ]] && echo -e "  ${DIM}Skipped: ${skipped}${NC}"
}

cmd_status() {
  banner "STATUS"
  ensure_tracking_table

  local applied
  applied=$(get_applied_list)

  local total=0 done=0 pending=0

  echo ""
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")
    ((total++))

    if is_applied "$filename" "$applied"; then
      echo -e "  ${GREEN}[x]${NC} ${filename}"
      ((done++))
    else
      echo -e "  ${DIM}[ ]${NC} ${filename}"
      ((pending++))
    fi
  done

  echo ""
  echo -e "${BOLD}Summary:${NC} ${GREEN}${done} applied${NC}, ${DIM}${pending} pending${NC}, ${total} total"
}

cmd_create() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: migrate.sh create <name>${NC}" >&2; echo "  e.g.: migrate.sh create add_user_settings" >&2; exit 1; }

  local name="$1"
  # Sanitize: lowercase, underscores
  name=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' -' '_' | tr -cd 'a-z0-9_')

  # Find next number
  local last_num=0
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local num
    num=$(basename "$file" | grep -oE '^[0-9]+' || echo "0")
    if [[ "$num" -gt "$last_num" ]]; then
      last_num="$num"
    fi
  done

  local next_num
  next_num=$(printf "%03d" $((last_num + 1)))
  local filename="${next_num}_${name}.sql"
  local filepath="${MIGRATIONS_DIR}/${filename}"

  cat > "$filepath" <<SQL
-- Migration: ${filename}
-- Created: $(date +%Y-%m-%d)
-- Description: TODO

-- =============================================================================
-- UP
-- =============================================================================



-- =============================================================================
-- (No automatic rollback - document manual steps if needed)
-- =============================================================================
SQL

  echo -e "${GREEN}Created:${NC} supabase/migrations/${filename}"
  echo -e "${DIM}Edit the file and run: ./scripts/migrate.sh run ${next_num}${NC}"
}

cmd_rollback() {
  banner "ROLLBACK (tracking only)"

  ensure_tracking_table

  # Get last applied migration
  local last
  last=$(run_sql "SELECT filename FROM _migration_history ORDER BY applied_at DESC LIMIT 1;" 2>/dev/null)

  if [[ -z "$last" ]] || ! echo "$last" | grep -q ".sql"; then
    echo -e "  ${YELLOW}No migrations to rollback.${NC}"
    return
  fi

  # Extract filename from output (handles both JSON and psql formats)
  local filename
  filename=$(echo "$last" | grep -oE '[0-9]+_[a-zA-Z0-9_]+\.sql' | head -1)

  if [[ -z "$filename" ]]; then
    echo -e "  ${YELLOW}Could not determine last migration.${NC}"
    return
  fi

  echo ""
  echo -e "  Last applied: ${CYAN}${filename}${NC}"
  echo ""
  echo -e "  ${YELLOW}NOTE: This only removes the tracking record.${NC}"
  echo -e "  ${YELLOW}It does NOT reverse the SQL changes.${NC}"
  echo -e "  ${YELLOW}You must manually undo schema changes if needed.${NC}"

  confirm "Remove ${filename} from migration history?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}-> skipped (dry run)${NC}"
    return
  fi

  remove_migration_record "$filename"
  echo -e "  ${GREEN}Removed ${filename} from history.${NC}"
  echo -e "  ${DIM}Run again with: ./scripts/migrate.sh run ${filename%%_*}${NC}"
}

# =============================================================================
# Help
# =============================================================================

show_help() {
  echo -e "${MAGENTA}Dialectica Migration Runner${NC}"
  echo -e "${DIM}Project: ${PROJECT_NAME} (${PROJECT_REF})${NC}"
  echo ""
  echo -e "Usage: ${CYAN}./scripts/migrate.sh${NC} [${YELLOW}flags${NC}] ${GREEN}<command>${NC} [args]"
  echo ""
  echo -e "${YELLOW}Commands:${NC}"
  echo "  run [pattern]      Run pending migrations (default if no command given)"
  echo "  status             Show applied vs pending migrations"
  echo "  create <name>      Scaffold a new migration file"
  echo "  rollback           Remove last migration from tracking (does NOT reverse SQL)"
  echo "  help               Show this help"
  echo ""
  echo -e "${YELLOW}Flags:${NC}"
  echo "  --yes, -y          Skip confirmation prompts"
  echo "  --dry-run          Preview what would run without applying"
  echo ""
  echo -e "${YELLOW}Examples:${NC}"
  echo "  ./scripts/migrate.sh                         # run all pending"
  echo "  ./scripts/migrate.sh status                  # check what's applied"
  echo "  ./scripts/migrate.sh run 029                 # run migration matching \"029\""
  echo "  ./scripts/migrate.sh --yes run               # run all, no confirmation"
  echo "  ./scripts/migrate.sh --dry-run run           # preview only"
  echo "  ./scripts/migrate.sh create add_user_prefs   # create 030_add_user_prefs.sql"
  echo "  ./scripts/migrate.sh rollback                # undo last (tracking only)"
  echo ""
  echo -e "${YELLOW}Auth:${NC}"
  echo "  DIALECTICA_DB_PASSWORD    or  Keychain: dialectica_db / supabase_db"
  echo "  SUPABASE_ACCESS_TOKEN     or  Keychain: Supabase CLI (supabase login)"
}

# =============================================================================
# Router
# =============================================================================

# Parse global flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)     AUTO_CONFIRM=true; shift ;;
    --dry-run)    DRY_RUN=true; shift ;;
    *)            break ;;
  esac
done

case "${1:-run}" in
  run)        shift 2>/dev/null || true; cmd_run "$@" ;;
  status)     cmd_status ;;
  create)     shift; cmd_create "$@" ;;
  rollback)   cmd_rollback ;;
  help|--help|-h) show_help ;;
  *)
    # If first arg looks like a migration number/pattern, treat as "run <pattern>"
    if [[ "$1" =~ ^[0-9] ]]; then
      cmd_run "$1"
    else
      echo -e "${RED}Unknown: $1${NC}" >&2
      show_help
      exit 1
    fi
    ;;
esac
