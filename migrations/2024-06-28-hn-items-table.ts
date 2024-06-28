import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await trx
			.insertInto('User')
			.values({
				id: 'ea4e6cf6-afba-4f14-9040-00d5457e827f',
				username: 'hackernews',
				email: '',
				isAdmin: 0,
			})
			.execute()

		await sql`
			create table HNItem (
				hnId integer not null,
				postId integer not null references post(id),
				primary key (hnId, postId)
			)
    `.execute(trx)
    
    await sql`
			create index idx_HNItem_postId on HNItem(postId)
    `.execute(trx)
	})
}
