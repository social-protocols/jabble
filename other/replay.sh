#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

rm -if $GB_DATABASE_PATH
npx tsx replay-vote-events.ts

