import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table DiscussionOfTheDay (
				id integer primary key autoincrement
				, postId integer not null references Post(id)
				, promotedAt int not null default (unixepoch('subsec')*1000)
			)
		`.execute(trx)
	})
}
