#!/bin/zsh
# db.sh - Dialectica Database Tool
#
# Query the Dialectica (voice-coach) Supabase database via REST & Management APIs.
# No psql or Docker needed.
#
# Project Name: voice-coach
# Project Ref:  enatcutnrtuauykqyajc
#
# Usage:
#   ./scripts/db.sh query "SELECT * FROM personas LIMIT 5"
#   ./scripts/db.sh file supabase/migrations/029_qa_scenario_prompts.sql
#   ./scripts/db.sh migrate                    # run all pending
#   ./scripts/db.sh migrate 029               # run matching migration
#   ./scripts/db.sh --yes migrate              # skip confirmation
#   ./scripts/db.sh select "personas?select=name&limit=3"
#   ./scripts/db.sh tables
#   ./scripts/db.sh describe personas
#
# Security:
#   Service role key: macOS Keychain "dialectica_service_role" or env DIALECTICA_SERVICE_ROLE
#   CLI access token: macOS Keychain "Supabase CLI" (via supabase login) or env SUPABASE_ACCESS_TOKEN

set -euo pipefail

# =============================================================================
# Config
# =============================================================================

PROJECT_REF="enatcutnrtuauykqyajc"
PROJECT_NAME="voice-coach (Dialectica)"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
MGMT_API="https://api.supabase.com/v1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/../supabase/migrations"
CURRENT_USER="${USER:-$(whoami)}"
AUTO_CONFIRM=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

# =============================================================================
# Key retrieval
# =============================================================================

get_service_role_key() {
  if [[ -n "${DIALECTICA_SERVICE_ROLE:-}" ]]; then
    echo "$DIALECTICA_SERVICE_ROLE"
    return
  fi
  local key
  key=$(security find-generic-password -a "${CURRENT_USER}" -s "dialectica_service_role" -w 2>/dev/null) || {
    echo -e "${RED}Error: No service_role key found${NC}" >&2
    echo -e "Set via env:      ${CYAN}export DIALECTICA_SERVICE_ROLE=\"your-key\"${NC}" >&2
    echo -e "Or via Keychain:  ${CYAN}security add-generic-password -U -a \"\$USER\" -s \"dialectica_service_role\" -w \"your-key\"${NC}" >&2
    exit 1
  }
  echo "$key"
}

get_access_token() {
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "$SUPABASE_ACCESS_TOKEN"
    return
  fi
  local token
  token=$(security find-generic-password -a "supabase" -s "Supabase CLI" -w 2>/dev/null) || {
    echo -e "${RED}Error: No Supabase CLI access token found${NC}" >&2
    echo -e "Set via env:  ${CYAN}export SUPABASE_ACCESS_TOKEN=\"your-token\"${NC}" >&2
    echo -e "Or login:     ${CYAN}supabase login${NC}" >&2
    exit 1
  }
  echo "$token"
}

# =============================================================================
# SQL execution via Management API (DDL + DML)
# =============================================================================

run_sql() {
  local sql="$1"
  local token
  token=$(get_access_token)

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
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  else
    echo -e "${RED}Query failed (HTTP ${http_code}):${NC}" >&2
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body" >&2
    return 1
  fi
}

# =============================================================================
# REST API (table CRUD via service_role key)
# =============================================================================

rest_get() {
  local path="$1"
  local key
  key=$(get_service_role_key)
  curl -sS "${SUPABASE_URL}/rest/v1/${path}" \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" | python3 -m json.tool 2>/dev/null
}

rest_post() {
  local table="$1" data="$2"
  local key
  key=$(get_service_role_key)
  curl -sS "${SUPABASE_URL}/rest/v1/${table}" \
    -X POST \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data" | python3 -m json.tool 2>/dev/null
}

rest_patch() {
  local path="$1" data="$2"
  local key
  key=$(get_service_role_key)
  curl -sS "${SUPABASE_URL}/rest/v1/${path}" \
    -X PATCH \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data" | python3 -m json.tool 2>/dev/null
}

rest_delete() {
  local path="$1"
  local key
  key=$(get_service_role_key)
  curl -sS "${SUPABASE_URL}/rest/v1/${path}" \
    -X DELETE \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" | python3 -m json.tool 2>/dev/null
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
  echo -e "${MAGENTA}|${NC}  ${CYAN}${PROJECT_NAME}${NC}"
  echo -e "${MAGENTA}|${NC}  Ref: ${DIM}${PROJECT_REF}${NC}"
  echo -e "${MAGENTA}|${NC}  Mode: ${YELLOW}${mode}${NC}"
  echo -e "${MAGENTA}+================================================+${NC}"
}

# =============================================================================
# Migration tracking
# =============================================================================

ensure_tracking_table() {
  run_sql "
    CREATE TABLE IF NOT EXISTS _migration_history (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  " > /dev/null
}

get_applied_migrations() {
  run_sql "SELECT filename FROM _migration_history ORDER BY filename;" 2>/dev/null
}

record_migration() {
  local filename="$1"
  run_sql "INSERT INTO _migration_history (filename) VALUES ('${filename}') ON CONFLICT (filename) DO NOTHING;" > /dev/null
}

run_migration() {
  local file="$1"
  local filename
  filename=$(basename "$file")

  echo -e "  ${BLUE}Running:${NC} ${filename}"

  local sql
  sql=$(cat "$file")

  if run_sql "$sql" > /dev/null; then
    echo -e "    ${GREEN}-> applied${NC}"
  else
    echo -e "    ${RED}-> FAILED${NC}" >&2
    return 1
  fi
}

# =============================================================================
# Commands
# =============================================================================

cmd_query() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: db.sh query \"SQL\"${NC}" >&2; exit 1; }
  banner "SQL QUERY"
  echo -e "${DIM}Query: ${1:0:80}...${NC}"
  echo ""
  run_sql "$1"
}

cmd_file() {
  [[ $# -eq 0 || ! -f "$1" ]] && { echo -e "${RED}Usage: db.sh file <path.sql>${NC}" >&2; exit 1; }
  banner "SQL FILE"
  echo -e "  File: ${CYAN}$(basename "$1")${NC}"

  confirm "Run $(basename "$1") against ${PROJECT_REF}?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }

  echo ""
  run_sql "$(cat "$1")"
  echo -e "${GREEN}Done.${NC}"
}

cmd_migrate() {
  local target="${1:-all}"
  banner "MIGRATE"
  ensure_tracking_table

  local applied
  applied=$(get_applied_migrations)

  # Collect pending
  local pending=()
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")
    if echo "$applied" | grep -q "\"${filename}\""; then
      continue
    fi
    if [[ "$target" != "all" && "$filename" != *"$target"* ]]; then
      continue
    fi
    pending+=("$filename")
  done

  if [[ ${#pending[@]} -eq 0 ]]; then
    echo -e "${GREEN}No pending migrations.${NC}"
    return
  fi

  echo -e "${YELLOW}Pending migrations (${#pending[@]}):${NC}"
  for f in "${pending[@]}"; do
    echo -e "  ${CYAN}- $f${NC}"
  done

  confirm "Apply ${#pending[@]} migration(s) to ${PROJECT_REF}?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }
  echo ""

  local count=0 failed=0

  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")

    if echo "$applied" | grep -q "\"${filename}\""; then
      echo -e "  ${DIM}skip: ${filename} (already applied)${NC}"
      continue
    fi

    if [[ "$target" != "all" && "$filename" != *"$target"* ]]; then
      continue
    fi

    if run_migration "$file"; then
      record_migration "$filename"
      ((count++))
    else
      ((failed++))
      echo -e "${RED}Stopping on failure.${NC}" >&2
      break
    fi
  done

  echo ""
  echo -e "Results: ${GREEN}${count} applied${NC}, ${RED}${failed} failed${NC}"
}

cmd_migrate_status() {
  banner "MIGRATION STATUS"
  ensure_tracking_table

  local applied
  applied=$(get_applied_migrations)

  echo ""
  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")

    if echo "$applied" | grep -q "\"${filename}\""; then
      echo -e "  ${GREEN}[x]${NC} ${filename}"
    else
      echo -e "  ${DIM}[ ]${NC} ${filename}"
    fi
  done
}

cmd_tables() {
  banner "TABLES"
  echo ""
  run_sql "
    SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  "
}

cmd_describe() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: db.sh describe <table>${NC}" >&2; exit 1; }
  banner "DESCRIBE: $1"
  echo ""
  run_sql "
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '$1'
    ORDER BY ordinal_position;
  "
}

cmd_dump() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: db.sh dump <table> [limit]${NC}" >&2; exit 1; }
  local limit="${2:-50}"
  banner "DUMP: $1 (limit ${limit})"
  echo ""
  run_sql "SELECT * FROM $1 LIMIT ${limit};"
}

cmd_select() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: db.sh select <table?filters>${NC}" >&2; echo "  e.g.: db.sh select \"personas?persona_type=eq.coach&select=name\"" >&2; exit 1; }
  banner "REST SELECT"
  echo -e "  Path: ${CYAN}$1${NC}"
  echo ""
  rest_get "$1"
}

cmd_insert() {
  [[ $# -lt 2 ]] && { echo -e "${RED}Usage: db.sh insert <table> '{json}'${NC}" >&2; exit 1; }
  banner "REST INSERT"
  echo -e "  Table: ${CYAN}$1${NC}"
  echo -e "  Data:  ${DIM}$2${NC}"
  confirm "Insert into $1 on ${PROJECT_REF}?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }
  echo ""
  rest_post "$1" "$2"
  echo -e "${GREEN}Done.${NC}"
}

cmd_update() {
  [[ $# -lt 2 ]] && { echo -e "${RED}Usage: db.sh update <table?filter> '{json}'${NC}" >&2; exit 1; }
  banner "REST UPDATE"
  echo -e "  Path: ${CYAN}$1${NC}"
  echo -e "  Data: ${DIM}$2${NC}"
  confirm "Update rows matching $1 on ${PROJECT_REF}?" || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }
  echo ""
  rest_patch "$1" "$2"
  echo -e "${GREEN}Done.${NC}"
}

cmd_remove() {
  [[ $# -eq 0 ]] && { echo -e "${RED}Usage: db.sh remove <table?filter>${NC}" >&2; exit 1; }
  banner "REST DELETE"
  echo -e "  ${RED}Path: $1${NC}"
  confirm "DELETE rows matching $1 on ${PROJECT_REF}? This cannot be undone." || { echo -e "${YELLOW}Aborted.${NC}"; exit 0; }
  echo ""
  rest_delete "$1"
  echo -e "${GREEN}Done.${NC}"
}

# =============================================================================
# Help
# =============================================================================

show_help() {
  echo -e "${MAGENTA}Dialectica Database Tool${NC}"
  echo -e "${DIM}Project: ${PROJECT_NAME} (${PROJECT_REF})${NC}"
  echo ""
  echo -e "Usage: ${CYAN}./scripts/db.sh${NC} [${YELLOW}--yes${NC}] ${GREEN}<command>${NC} [args]"
  echo ""
  echo -e "${YELLOW}Flags:${NC}"
  echo "  --yes, -y              Skip confirmation prompts"
  echo ""
  echo -e "${YELLOW}SQL Commands${NC} ${DIM}(via Management API - supports DDL):${NC}"
  echo "  query \"SQL\"            Run raw SQL"
  echo "  file <path.sql>        Execute a SQL file"
  echo "  migrate [pattern]      Run pending migrations (or matching pattern)"
  echo "  migrate-status         Show which migrations have been applied"
  echo "  tables                 List all public tables with sizes"
  echo "  describe <table>       Show column details for a table"
  echo "  dump <table> [limit]   Select rows (default: 50)"
  echo ""
  echo -e "${YELLOW}REST Commands${NC} ${DIM}(via service_role key - PostgREST filters):${NC}"
  echo "  select <table?filter>          GET rows"
  echo "  insert <table> '{json}'        POST new row(s)"
  echo "  update <table?filter> '{json}' PATCH matching rows"
  echo "  remove <table?filter>          DELETE matching rows"
  echo ""
  echo -e "${YELLOW}Examples:${NC}"
  echo "  ./scripts/db.sh query \"SELECT count(*) FROM personas\""
  echo "  ./scripts/db.sh --yes migrate"
  echo "  ./scripts/db.sh migrate 029"
  echo "  ./scripts/db.sh migrate-status"
  echo "  ./scripts/db.sh describe personas"
  echo "  ./scripts/db.sh select \"personas?persona_type=eq.coach&select=name,domain_id\""
  echo "  ./scripts/db.sh insert personas '{\"name\":\"Test\",\"persona_type\":\"coach\"}'"
  echo "  ./scripts/db.sh file supabase/migrations/029_qa_scenario_prompts.sql"
  echo ""
  echo -e "${YELLOW}Auth (env vars or macOS Keychain):${NC}"
  echo "  DIALECTICA_SERVICE_ROLE   or  Keychain: dialectica_service_role"
  echo "  SUPABASE_ACCESS_TOKEN     or  Keychain: Supabase CLI (supabase login)"
}

# =============================================================================
# Router
# =============================================================================

# Parse global flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y) AUTO_CONFIRM=true; shift ;;
    *)        break ;;
  esac
done

case "${1:-help}" in
  query)          shift; cmd_query "$@" ;;
  file)           shift; cmd_file "$@" ;;
  migrate)        shift; cmd_migrate "$@" ;;
  migrate-status) cmd_migrate_status ;;
  tables)         cmd_tables ;;
  describe)       shift; cmd_describe "$@" ;;
  dump)           shift; cmd_dump "$@" ;;
  select)         shift; cmd_select "$@" ;;
  insert)         shift; cmd_insert "$@" ;;
  update)         shift; cmd_update "$@" ;;
  remove)         shift; cmd_remove "$@" ;;
  help|--help|-h) show_help ;;
  *)              echo -e "${RED}Unknown: $1${NC}" >&2; show_help; exit 1 ;;
esac
