import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`pragma journal_mode=WAL;`.execute(db)
}
