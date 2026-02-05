#!/bin/zsh

# =============================================================================
# Dialectica Database Tool
# Uses Supabase Management API - no psql/Docker needed
# =============================================================================

set -euo pipefail

# Project config
PROJECT_REF="enatcutnrtuauykqyajc"
API_BASE="https://api.supabase.com/v1"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"

# Get Supabase access token from CLI config
get_access_token() {
  local token=""

  # Try supabase CLI credentials file (standard location)
  local creds_file="$HOME/.config/supabase/access-token"
  if [[ -f "$creds_file" ]]; then
    token=$(cat "$creds_file")
  fi

  # Fallback: try settings.json
  if [[ -z "$token" ]]; then
    local settings="$HOME/.config/supabase/settings.json"
    if [[ -f "$settings" ]]; then
      token=$(python3 -c "import json; print(json.load(open('$settings')).get('access_token',''))" 2>/dev/null || true)
    fi
  fi

  # Fallback: environment variable
  if [[ -z "$token" ]]; then
    token="${SUPABASE_ACCESS_TOKEN:-}"
  fi

  if [[ -z "$token" ]]; then
    echo "❌ No Supabase access token found." >&2
    echo "   Run: supabase login" >&2
    exit 1
  fi

  echo "$token"
}

# Execute SQL against the remote database via Management API
run_sql() {
  local sql="$1"
  local token
  token=$(get_access_token)

  local response
  response=$(curl -sS -w "\n%{http_code}" \
    -X POST "${API_BASE}/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$sql")")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  else
    echo "❌ Query failed (HTTP ${http_code}):" >&2
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body" >&2
    return 1
  fi
}

# Run a single migration file
run_migration() {
  local file="$1"
  local filename
  filename=$(basename "$file")

  echo "📦 Running migration: ${filename}"

  local sql
  sql=$(cat "$file")

  if run_sql "$sql" > /dev/null; then
    echo "   ✅ ${filename} applied"
  else
    echo "   ❌ ${filename} FAILED" >&2
    return 1
  fi
}

# Tracking table for applied migrations
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

# =============================================================================
# Commands
# =============================================================================

cmd_query() {
  if [[ $# -eq 0 ]]; then
    echo "Usage: db.sh query \"SELECT ...\"" >&2
    exit 1
  fi
  run_sql "$1"
}

cmd_file() {
  if [[ $# -eq 0 || ! -f "$1" ]]; then
    echo "Usage: db.sh file <path-to-sql-file>" >&2
    exit 1
  fi
  echo "📄 Executing: $(basename "$1")"
  run_sql "$(cat "$1")"
}

cmd_migrate() {
  local target="${1:-all}"

  ensure_tracking_table

  local applied
  applied=$(get_applied_migrations)

  local count=0
  local failed=0

  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")

    # Skip already applied
    if echo "$applied" | grep -q "\"${filename}\""; then
      echo "   ⏭️  ${filename} (already applied)"
      continue
    fi

    # If targeting a specific migration
    if [[ "$target" != "all" && "$filename" != *"$target"* ]]; then
      continue
    fi

    if run_migration "$file"; then
      record_migration "$filename"
      ((count++))
    else
      ((failed++))
      echo "⛔ Stopping on failure." >&2
      break
    fi
  done

  echo ""
  echo "📊 Results: ${count} applied, ${failed} failed"
}

cmd_migrate_status() {
  ensure_tracking_table

  local applied
  applied=$(get_applied_migrations)

  echo "Migration Status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  for file in "$MIGRATIONS_DIR"/*.sql; do
    [[ -f "$file" ]] || continue
    local filename
    filename=$(basename "$file")

    if echo "$applied" | grep -q "\"${filename}\""; then
      echo "  ✅ ${filename}"
    else
      echo "  ⬚  ${filename}"
    fi
  done
}

cmd_tables() {
  run_sql "
    SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  "
}

cmd_describe() {
  if [[ $# -eq 0 ]]; then
    echo "Usage: db.sh describe <table_name>" >&2
    exit 1
  fi
  run_sql "
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '$1'
    ORDER BY ordinal_position;
  "
}

cmd_dump() {
  local table="${1:-}"
  if [[ -z "$table" ]]; then
    echo "Usage: db.sh dump <table_name> [limit]" >&2
    exit 1
  fi
  local limit="${2:-50}"
  run_sql "SELECT * FROM ${table} LIMIT ${limit};"
}

# =============================================================================
# Help
# =============================================================================

show_help() {
  cat <<'HELP'
Dialectica Database Tool
========================

Usage: ./scripts/db.sh <command> [args]

Commands:
  query "SQL"           Run arbitrary SQL and display results
  file <path.sql>       Execute a SQL file
  migrate [pattern]     Run pending migrations (or matching pattern)
  migrate-status        Show which migrations have been applied
  tables                List all public tables with sizes
  describe <table>      Show column details for a table
  dump <table> [limit]  Select rows from a table (default: 50)
  help                  Show this help

Examples:
  ./scripts/db.sh query "SELECT * FROM personas LIMIT 5"
  ./scripts/db.sh migrate                      # run all pending
  ./scripts/db.sh migrate 029                  # run migration matching "029"
  ./scripts/db.sh migrate-status               # check what's applied
  ./scripts/db.sh describe personas
  ./scripts/db.sh file supabase/migrations/029_qa_scenario_prompts.sql

Requirements:
  - supabase CLI logged in (run: supabase login)
  - curl, python3

HELP
}

# =============================================================================
# Router
# =============================================================================

case "${1:-help}" in
  query)          shift; cmd_query "$@" ;;
  file)           shift; cmd_file "$@" ;;
  migrate)        shift; cmd_migrate "$@" ;;
  migrate-status) shift; cmd_migrate_status "$@" ;;
  tables)         cmd_tables ;;
  describe)       shift; cmd_describe "$@" ;;
  dump)           shift; cmd_dump "$@" ;;
  help|--help|-h) show_help ;;
  *)
    echo "Unknown command: $1" >&2
    show_help
    exit 1
    ;;
esac
