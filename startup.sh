#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

echo create a backup before migrating...
sqlite3 /litefs/data/sqlite.db ".backup /data/backup-$(date -Iseconds).db"
ls -lh /data/backup*

npm run migrate

npm start
