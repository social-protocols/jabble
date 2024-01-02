set dotenv-load := true

# List available recipes in the order in which they appear in this file
_default:
    @just --list --unsorted

# Reset and reseed database, and regenerate Keysely type definitions
reset-db:
	rm -f $DATABASE_PATH
	# Create views
	npx prisma db push --skip-generate
	sqlite3 $DATABASE_PATH < sql/views.sql
	npx prisma generate
	npx prisma db seed


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
	npx prisma db seed

sim:
	time IN_MEMORY_DB=true npx tsx simulate-attention-share.ts

# Same as sim, but doesn't use in-memory DB so simulated state is persisted
sim-seed:
	npx tsx simulate-attention-share.ts

import-hn:
	npx tsx import-hn.ts ./other/hn-data/*.json.gz
