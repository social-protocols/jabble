set dotenv-load := true



# List available recipes in the order in which they appear in this file
_default:
    @just --list --unsorted

# Reset and reseed database, and regenerate Keysely type definitions
reset-db:
	rm -f $APP_DATABASE_PATH
	npx tsx migrate.ts
	npx tsx seed.ts

reset-all:
  rm -rf ~/social-protocols-data/*
  mkdir -p ~/social-protocols-data
  touch $SCORE_EVENTS_PATH
  just reset-db

migrate:
	npx tsx migrate.ts

dev:
  npm install
  npm run dev

sqlite:
	sqlite3 $APP_DATABASE_PATH

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
  rm -f "$APP_DATABASE_PATH"
  rm -f "$APP_DATABASE_PATH"-shm
  rm -f "$APP_DATABASE_PATH"-wal
  flyctl ssh console -C "sqlite3 /litefs/data/sqlite.db '.backup /data/backup.db'"
  flyctl ssh sftp get /data/backup.db "$APP_DATABASE_PATH" || true

docker-build-mac:
	docker build --platform linux/amd64 . -t deploy-sn

docker-build:
	docker build . -t deploy-sn

docker-run:
	docker run --rm -it -p 8081:8081 -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET --name deploy-sn deploy-sn bash startup.sh 

docker-kill:
	docker rm -f deploy-sn

docker-exec:
	docker exec -it deploy-sn /bin/bash



