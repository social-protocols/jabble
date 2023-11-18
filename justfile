migrate:
	npx prisma migrate dev

# This command should not be used once we have anything in production.
# It deletes and recreates the database based on schema.prisma and seed.ts,
# and creates new migration to create the DB from scratch.
reset-db:
	npx prisma generate

	# delete all the migrations
	rm -rf prisma/migrations/*

	# make the dev DB schema match schema.prisma
	npx prisma db push --force-reset

	# create a new migration init migration that matches the dev db
	npx prisma migrate dev --name init
	npx prisma migrate reset --force

	# create a second migration for the views
	npx prisma migrate dev --create-only --name views
	cp prisma/views.sql prisma/migrations/*_views/migration.sql
	
	# apply the views migration to the dev db
	npx prisma migrate dev


prisma-client:
	npx prisma generate

dev:
	npm run dev

sqlite:
	sqlite3 ./prisma/data.db

typecheck:
	npm run typecheck