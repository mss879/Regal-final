#!/usr/bin/env bash
# Applies supabase/migrations to a throwaway local Postgres and runs the assertions in
# tests.sql. Needs Postgres 15+ binaries (e.g. `brew install postgresql@16`); no Docker.
#   bash scripts/db-test/run.sh
set -euo pipefail
export LC_ALL=C LANG=C  # postmaster refuses to start under an unset/odd locale
cd "$(dirname "$0")/../.."

PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
PORT="${PORT:-54329}"
DIR="$(mktemp -d)"
trap '"$PG_BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

"$PG_BIN/initdb" -D "$DIR/data" -U postgres --auth=trust --locale=C --encoding=UTF8 >/dev/null
# TCP on loopback only (unix socket paths under $TMPDIR can exceed the length limit).
if ! "$PG_BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$DIR/log" -w start >/dev/null; then
  cat "$DIR/log"
  exit 1
fi
PSQL=("$PG_BIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f scripts/db-test/stubs.sql
for f in supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f scripts/db-test/tests.sql
