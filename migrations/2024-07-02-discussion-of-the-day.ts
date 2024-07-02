import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table DiscussionOfTheDay (
				  postId integer not null references Post(id)
				, promotedAt int not null default (unixepoch('subsec')*1000)
			) strict
		`.execute(trx)

		await sql`
			create index idx_DiscussionOfTheDay_promotedAt on DiscussionOfTheDay (promotedAt)
		`.execute(trx)
	})
}
