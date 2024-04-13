#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

npm run migrate

# Remove vote events and score events. These will be 'replayed': the app
# will rewrite the vote events on startup, and the GB service will read these
# and rewrite scoreEvents, which the app will import.
rm -f "$VOTE_EVENTS_PATH"
touch "$VOTE_EVENTS_PATH"
rm -f "$SCORE_EVENTS_PATH"
touch "$SCORE_EVENTS_PATH"
sqlite3 $APP_DATABASE_PATH "delete from scoreEvent; delete from score;"
rm -f "$GB_DATABASE_PATH"

npm start &

cd GlobalBrain.jl-0.1
tail -n +0 -F "$VOTE_EVENTS_PATH" | /opt/julia-1.9.4/bin/julia --project scripts/run.jl "$GB_DATABASE_PATH" - "$SCORE_EVENTS_PATH"
