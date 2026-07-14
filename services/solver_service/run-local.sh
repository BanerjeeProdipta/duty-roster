#!/usr/bin/env bash
# Runs the solver service on this machine, exposes it via a Cloudflare quick
# tunnel, and points the deployed Worker's SOLVER_URL at the resulting URL.
#
# Meant to be started manually before generating a roster in the deployed
# web app, and stopped (Ctrl+C) afterward. The tunnel URL is random and
# changes every run, so this script redeploys the Worker each time it starts.
#
# Prerequisites (one-time):
#   - cloudflared installed (brew install cloudflared)
#   - `bunx wrangler login` run once from apps/server
#   - services/solver_service/.env.local containing SOLVER_TOKEN=<value>
#     (must match the SOLVER_TOKEN GitHub secret / value used elsewhere)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"
WRANGLER_TOML="$REPO_ROOT/apps/server/wrangler.toml"
PORT=8000

if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing $ENV_FILE" >&2
	echo "Create it with: SOLVER_TOKEN=<your token>" >&2
	exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
export SOLVER_TOKEN

if [[ -z "${SOLVER_TOKEN:-}" ]]; then
	echo "SOLVER_TOKEN is not set in $ENV_FILE" >&2
	exit 1
fi

if [[ ! -d "$SCRIPT_DIR/.venv" ]]; then
	echo "Creating virtualenv..."
	python3 -m venv "$SCRIPT_DIR/.venv"
fi
"$SCRIPT_DIR/.venv/bin/pip" install -q -r "$SCRIPT_DIR/requirements.txt"

UVICORN_PID=""
CLOUDFLARED_PID=""
TUNNEL_LOG="$(mktemp)"

cleanup() {
	echo
	echo "Shutting down..."
	[[ -n "$UVICORN_PID" ]] && kill "$UVICORN_PID" 2>/dev/null || true
	[[ -n "$CLOUDFLARED_PID" ]] && kill "$CLOUDFLARED_PID" 2>/dev/null || true
	rm -f "$TUNNEL_LOG"
	echo "Stopped. Note: the deployed Worker's SOLVER_URL still points at the"
	echo "now-dead tunnel URL until you run this script again."
}
trap cleanup EXIT INT TERM

echo "Starting solver service on :$PORT..."
(cd "$SCRIPT_DIR" && "$SCRIPT_DIR/.venv/bin/uvicorn" app:app --host 0.0.0.0 --port "$PORT") &
UVICORN_PID=$!

for _ in $(seq 1 30); do
	if curl -sS -o /dev/null "http://localhost:$PORT/health" 2>/dev/null; then
		break
	fi
	sleep 1
done
if ! curl -sS -o /dev/null "http://localhost:$PORT/health" 2>/dev/null; then
	echo "Solver service failed to start" >&2
	exit 1
fi
echo "Solver service is healthy."

echo "Starting Cloudflare quick tunnel..."
cloudflared tunnel --url "http://localhost:$PORT" > "$TUNNEL_LOG" 2>&1 &
CLOUDFLARED_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 30); do
	TUNNEL_URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)"
	[[ -n "$TUNNEL_URL" ]] && break
	sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
	echo "Failed to obtain tunnel URL. Log:" >&2
	cat "$TUNNEL_LOG" >&2
	exit 1
fi
echo "Tunnel URL: $TUNNEL_URL"

echo "Updating wrangler.toml SOLVER_URL..."
sed -i '' "s|^SOLVER_URL = .*|SOLVER_URL = \"$TUNNEL_URL\"|" "$WRANGLER_TOML"

echo "Deploying Worker with new SOLVER_URL..."
(cd "$REPO_ROOT/apps/server" && bunx wrangler deploy)

echo
echo "Ready. Solver service is live at $TUNNEL_URL"
echo "Leave this running while you generate a roster. Press Ctrl+C to stop."
wait "$UVICORN_PID" "$CLOUDFLARED_PID"
