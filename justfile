set dotenv-load := true



# List available recipes in the order in which they appear in this file
_default:
    @just --list --unsorted

# Reset and reseed database, and regenerate Keysely type definitions
reset-db:
	rm -f $APP_DATABASE_PATH
	npx tsx migrate.ts
	npx tsx seed.ts

# reset-db and also delete vote and score events files
reset-all:
  rm -rf ~/social-protocols-data/*
  mkdir -p ~/social-protocols-data
  touch $SCORE_EVENTS_PATH
  just reset-db

# run the migration script
migrate:
	npx tsx migrate.ts

# run the app locally and watch for changes
dev:
  npm install
  npm run dev

# open database in sqlite commandline 
db:
	sqlite3 $APP_DATABASE_PATH

# run typescript typechecker
typecheck:
	npm run typecheck

# run linters and formatter
lint:
	npm run lint
	npm run format

# run formatter (edit files in place)
format:
  npm run format

# run all tests non-e2e tests
test:
	npm run test 

# run all e2e tests
e2e-test:
	npm run test:e2e:dev 

# retrun seed script
reseed:
	npx tsx seed.ts

# import json.gz file containing conversations from HN
import-hn:
	npx tsx import-hn.ts ./other/hn-data/*.json.gz

# delete local database, download production database
download-prod-db:
  rm -f "$APP_DATABASE_PATH"
  rm -f "$APP_DATABASE_PATH"-shm
  rm -f "$APP_DATABASE_PATH"-wal
  flyctl ssh console -C "sqlite3 /litefs/data/sqlite.db '.backup /data/backup.db'"
  flyctl ssh sftp get /data/backup.db "$APP_DATABASE_PATH" || true

# build the docker container
docker-build:
	docker build . -t deploy-sn

# docker-build with --platform linux/amd64
docker-build-mac:
	docker build --platform linux/amd64 . -t deploy-sn

# run the app in the docker container (you must run docker-build first)
docker-run:
	docker run --rm -it -p 8081:8081 -e SESSION_SECRET -e INTERNAL_COMMAND_TOKEN -e HONEYPOT_SECRET --name deploy-sn deploy-sn bash startup.sh 

# delete the docker container
docker-kill:
	docker rm -f deploy-sn

# exec /bin/bash in the running docker container
docker-exec:
	docker exec -it deploy-sn /bin/bash

