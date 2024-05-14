#!/usr/bin/env bash
# https://vaneyckt.io/posts/safer_bash_scripts_with_set_euxo_pipefail
set -Eeuo pipefail

# Workaround for GlobalBrain.jl/src/db.jl: init_score_db(...)
if [[ ! -f "$GB_DATABASE_PATH" ]]; then
  echo "Creating $GB_DATABASE_PATH..."
  sqlite3 "$GB_DATABASE_PATH" < GlobalBrain.jl/sql/tables.sql
  sqlite3 "$GB_DATABASE_PATH" < GlobalBrain.jl/sql/views.sql
  sqlite3 "$GB_DATABASE_PATH" < GlobalBrain.jl/sql/triggers.sql
fi
