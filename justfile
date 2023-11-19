migrate:
	npx prisma migrate dev

# Reset database to match schema.prisma and views.sql, and reseed
reset-db:
	npx prisma generate

	# make the dev DB schema match schema.prisma
	npx prisma db push --force-reset

	# Create views
	sqlite3 ./prisma/data.db < ./prisma/views.sql

	# reseed
	npx prisma db seed


# This command should not be used once we have data in production.
# It deletes and recreates the database based on schema.prisma, seed.ts, and views.sql,
# then deletes all migrations and creates a new migration that creates the DB from scratch.
initial-migration:
	# make database match 
	just reset-db

	# delete all the migrations
	rm -rf prisma/migrations/*

	# create a new migration init migration that matches the dev db
	npx prisma migrate dev --name init

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