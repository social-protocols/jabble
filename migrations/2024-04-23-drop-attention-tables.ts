import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`drop table LocationStats`.execute(db)
	await sql`drop table TagStats`.execute(db)
	await sql`alter table PostStats drop column attention`.execute(db)
	await sql`alter table PostStats drop column views`.execute(db)
}
