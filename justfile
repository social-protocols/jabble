migrate:
	npx prisma migrate dev

# This command should not be used once we have data in production.
# It deletes and recreates the database based on schema.prisma and seed.ts,
# then deletes all migrations and creates a new migration that creates the DB from scratch.
reset-schema:
	npx prisma generate

	# delete all the migrations
	rm -rf prisma/migrations/*

	# make the dev DB schema match schema.prisma
	npx prisma db push --force-reset

	# create a new migration init migration that matches the dev db
	npx prisma migrate dev --name init

	# delete database, recreate, and reseed
	npx prisma migrate reset --force

	# create a second migration for the views
	npx prisma migrate dev --create-only --name views
	cp prisma/views.sql prisma/migrations/*_views/migration.sql
	
	# apply the views migration to the dev db
	npx prisma migrate dev

reseed:
	npx prisma migrate reset --force

prisma-client:
	npx prisma generate

dev:
	npm run dev

sqlite:
	sqlite3 ./prisma/data.db

typecheck:
	npm run typecheck