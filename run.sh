#!/bin/bash
#
# Starts the development stack: the API on 4080 and the site on 5173.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

# ── Refuse to start on top of a previous run ─────────────────────────────────
#
# Without this the failure is genuinely misleading. The server cannot bind, so
# it dies with EADDRINUSE part-way up a wall of npm output, while Vite quietly
# moves itself to 5174 and reports success. What you get is a site that loads
# and shows no restaurants, because the API it is talking to is not running —
# which looks like a bug in the application rather than a stale process.
#
# It happens easily: closing the terminal does not necessarily kill the tree,
# and `tsx watch` respawns the server, so a run from yesterday can still be
# holding the ports today.
blocked=0
for port in 4080 5173; do
  pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)"
  [[ -z "$pid" ]] && continue

  blocked=1
  printf 'Port %s is already in use by PID %s:\n' "$port" "$pid"
  ps -o command= -p "$pid" 2>/dev/null | sed 's/^/    /' | cut -c1-100
done

if (( blocked )); then
  cat <<'MESSAGE'

An earlier run is still going. Either use it, or stop it first:

    pkill -f 'restourant finder' && pkill -f concurrently

MESSAGE
  exit 1
fi

echo "Starting Ashgabat Restaurant Finder..."
echo "  API   http://localhost:4080"
echo "  Site  http://localhost:5173"
echo

# Runs the frontend and the server together, via concurrently.
npm run dev
