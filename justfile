set dotenv-load := true


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

test:
	npm run test 

e2e-test:
	npm run test:e2e:dev 


