#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

npm run migrate
npm start &
cd GlobalBrain.jl-0.1
touch "$VOTE_EVENTS_PATH"
tail -n +0 -F "$VOTE_EVENTS_PATH" | /opt/julia-1.9.4/bin/julia --project scripts/run.jl "$GB_DATABASE_PATH" - "$SCORE_EVENTS_PATH"
