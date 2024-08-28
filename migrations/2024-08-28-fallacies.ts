import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			create table Fallacies (
				  postId integer not null references Post(id)
				, detection text not null
			) strict
		`.execute(trx)
	})
}

