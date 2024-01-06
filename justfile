set dotenv-load := true

# List available recipes in the order in which they appear in this file
_default:
    @just --list --unsorted

# Reset and reseed database, and regenerate Keysely type definitions
reset-db:
	rm -f $DATABASE_PATH
	npx tsx migrate.ts
	npx tsx seed.ts

migrate:
	npx tsx migrate.ts

dev:
	npm run dev

sqlite:
	sqlite3 $DATABASE_PATH

typecheck:
	npm run typecheck

lint:
	npm run lint
	npm run format

format:
  npm run format

test:
	npm run test 

e2e-test:
	npm run test:e2e:dev 

reseed:
	npx tsx seed.ts

sim:
	time IN_MEMORY_DB=true npx tsx simulate-attention-share.ts

# Same as sim, but doesn't use in-memory DB so simulated state is persisted
sim-seed:
	npx tsx simulate-attention-share.ts

import-hn:
	npx tsx import-hn.ts ./other/hn-data/*.json.gz

# delete local database, download production database
download-prod-db:
  rm -f "$DATABASE_PATH"
  rm -f "$DATABASE_PATH"-shm
  rm -f "$DATABASE_PATH"-wal
  flyctl ssh console -C "sqlite3 /litefs/data/sqlite.db '.backup /data/backup.db'"
  flyctl ssh sftp get /data/backup.db "$DATABASE_PATH" || true
