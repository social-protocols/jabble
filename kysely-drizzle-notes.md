What did I do:
	changed node version in package.json

npm install drizzle-orm better-sqlite3
npm install --include=dev drizzle-kit @types/better-sqlite3
npx drizzle-kit introspect:sqlite

created drizzle.config.ts

mostly followed instructions from https://dev.to/franciscomendes10866/getting-started-with-drizzle-orm-a-beginners-tutorial-4782


gave me:
[✓] Your SQL migration file ➜ migrations/0000_odd_preak.sql 🚀
[✓] You schema file is ready ➜ migrations/schema.ts 🚀


---

npm install kysely
npm install prisma-kysely

Drizzle problems:
- doesn't support views
- doesn't suppot raw sql

Kysely notes:
- better sqlite default
- supports raw sql
	but doesn't infer type
- supports views
- generates type defs from Prisma schema
- pretty easy to use
- type defs are very simple

Questions:
- what is wrong with prisma migrations