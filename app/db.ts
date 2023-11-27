
import assert from 'assert';

import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import { type DB } from '#app/db/kysely-types.ts'; // this is the Database interface we defined earlier
import { type Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier

const databasePath = process.env.DATABASE_PATH

const dialect = new SqliteDialect({
	database: new SQLite(databasePath),
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely 
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how 
// to communicate with your database.
export const db = new Kysely<DB>({
	dialect,
})

