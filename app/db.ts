
// import * as schema from "#app/schema.ts";
// import Database from "better-sqlite3";
// import {
// 	drizzle,
// 	type BetterSQLite3Database,
// } from "drizzle-orm/better-sqlite3";

// import process from "process";

// const databasePath = process.env.DATABASE_PATH
// const sqlite = new Database(databasePath);

// export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, {
// 	schema,
// });

// import { post, type SelectPost } from "#app/schema.ts";
// import { eq } from 'drizzle-orm';

import assert from 'assert';

import SQLite from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import { Post } from '#app/db/types.ts'; // this is the Database interface we defined earlier
import { DB } from '#app/db/kysely-types.ts'; // this is the Database interface we defined earlier

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

export async function getPost(id: number): Promise<Post> {
	console.log("Gettingn post", id)

	let result: Post | undefined = await db.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	console.log("Got post", result)

	assert(result != null)
	return result


	// return p[0]
}

