#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

# cd to script folder
cd "$(dirname "${BASH_SOURCE[0]}")"

rm -f $GB_DATABASE_PATH
npx tsx replay-vote-events.ts
