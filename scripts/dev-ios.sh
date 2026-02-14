#!/bin/bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────
APP_ID="com.dialectica.app"
SIM_NAME="Dialectica Dev"
DEVICE_TYPE="com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro"
PORT=8081
MODE="${1:-dev}"  # "dev" (default), "fresh", or "reset"

# ── Helpers ─────────────────────────────────────────────────────
log()  { echo "▸ $*"; }
die()  { echo "✖ $*" >&2; exit 1; }

get_latest_runtime() {
  xcrun simctl list runtimes available \
    | grep 'iOS' \
    | tail -1 \
    | sed 's/.*- //'
}

find_sim() {
  xcrun simctl list devices -j \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    if 'iOS' not in runtime:
        continue
    for d in devices:
        if d['name'] == '$SIM_NAME' and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
" 2>/dev/null || true
}

get_sim_state() {
  xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['udid'] == '$1':
            print(d['state'])
            sys.exit(0)
"
}

# ── Kill port ───────────────────────────────────────────────────
log "Clearing port $PORT..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true

# ── Find or create simulator ────────────────────────────────────
UDID=$(find_sim)

if [ -z "$UDID" ]; then
  RUNTIME=$(get_latest_runtime)
  [ -z "$RUNTIME" ] && die "No iOS runtime found. Install one via Xcode."
  log "Creating simulator '$SIM_NAME' ($RUNTIME)..."
  UDID=$(xcrun simctl create "$SIM_NAME" "$DEVICE_TYPE" "$RUNTIME")
  log "Created simulator: $UDID"
else
  log "Found simulator '$SIM_NAME': $UDID"
fi

# ── Boot simulator ──────────────────────────────────────────────
STATE=$(get_sim_state "$UDID")

if [ "$STATE" != "Booted" ]; then
  log "Booting simulator..."
  xcrun simctl boot "$UDID" 2>/dev/null || true
fi

open -a Simulator --args -CurrentDeviceUDID "$UDID"

# ── Handle reset mode ──────────────────────────────────────────
if [ "$MODE" = "reset" ]; then
  log "Resetting app data..."
  xcrun simctl spawn "$UDID" defaults delete "$APP_ID" 2>/dev/null || true
  echo "AsyncStorage cleared — restart the app"
  exit 0
fi

# ── Handle fresh mode ──────────────────────────────────────────
if [ "$MODE" = "fresh" ]; then
  log "Uninstalling existing app..."
  xcrun simctl uninstall "$UDID" "$APP_ID" 2>/dev/null || true
fi

# ── Check if app installed ──────────────────────────────────────
APP_INSTALLED=$(xcrun simctl listapps "$UDID" 2>/dev/null | grep -c "$APP_ID" || true)

if [ "$APP_INSTALLED" -eq 0 ]; then
  log "App not installed — building..."
  npx expo run:ios --device "$UDID" --no-bundler 2>&1 | grep -v "CommandError" || true

  # Verify install succeeded
  APP_INSTALLED=$(xcrun simctl listapps "$UDID" 2>/dev/null | grep -c "$APP_ID" || true)
  [ "$APP_INSTALLED" -eq 0 ] && die "Build failed — app not installed on simulator."
  log "Build complete."
fi

# ── Configure app to point at localhost bundler ──────────────────
xcrun simctl spawn "$UDID" defaults write "$APP_ID" RCT_jsLocation localhost

# ── Start Metro in background, wait for it, then launch app ─────
log "Starting Metro on port $PORT..."
npx expo start --dev-client --port "$PORT" --clear &
METRO_PID=$!

# Wait for Metro to be ready
log "Waiting for Metro bundler..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT/status" >/dev/null 2>&1; then
    log "Metro is ready."
    break
  fi
  [ "$i" -eq 30 ] && die "Metro failed to start within 30s."
  sleep 1
done

# Now launch the app (Metro is serving)
log "Launching app..."
xcrun simctl launch "$UDID" "$APP_ID"

# Bring Metro back to foreground
wait $METRO_PID
