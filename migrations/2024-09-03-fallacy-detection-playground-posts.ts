import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table PlaygroundPost (
				id integer not null primary key autoincrement
				, content text not null
				, detection blob not null
				, createdAt integer not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)
	})
}

