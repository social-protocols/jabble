migrate:
	npx prisma migrate dev

reset-db:
	npx prisma migrate reset 

prisma-client:
	npx prisma generate

dev:
	npm run dev

sqlite:
	sqlite3 ./prisma/data.db
