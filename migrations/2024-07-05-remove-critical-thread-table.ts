import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`drop view CriticalThreadView`.execute(trx)
		await sql`drop table CriticalThread`.execute(trx)
	})
}
