#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

echo create a backup before migrating...
sqlite3 /litefs/data/sqlite.db '.backup /data/backup.db'
ls -lh /data/backup.db

npm run migrate

npm start
