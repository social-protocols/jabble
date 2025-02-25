import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import { type DB } from './types.ts'

const databasePath = process.env.APP_DATABASE_PATH

var sqliteInstance = new SQLite(databasePath)

// Neat little trick. If you set this environment variable, the database file
// will be copied to memory and the in-memory database will be used for this
// process. So any changes won't persist, but this is just fine for
// simulations, tests, etc.
if (process.env.IN_MEMORY_DB) {
	console.log('Using in-memory DB instance')
	const buffer = sqliteInstance.serialize()
	sqliteInstance = new SQLite(buffer)
}

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<DB>({
	dialect: new SqliteDialect({ database: sqliteInstance }),
})
