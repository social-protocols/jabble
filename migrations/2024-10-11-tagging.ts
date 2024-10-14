import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table Tag (
				  id  integer not null primary key autoincrement
				, tag text    not null unique
			)
		`.execute(trx)

		await sql`
			create table PostTag (
				  postId integer not null references Post(id)
				, tagId  integer not null references Tag(id)
				, primary key (postId, tagId)
			)
		`.execute(trx)
	})
}
