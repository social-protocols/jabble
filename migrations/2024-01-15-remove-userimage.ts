import { type Kysely, sql } from 'kysely'

// https://kysely.dev/docs/migrations
// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html

export async function up(db: Kysely<any>): Promise<void> {
	await sql`drop table UserImage`.execute(db)
}
