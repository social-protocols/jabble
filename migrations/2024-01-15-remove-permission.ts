import { type Kysely, sql } from 'kysely'

// https://kysely.dev/docs/migrations
// https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html

export async function up(db: Kysely<any>): Promise<void> {
  await sql`drop table _RoleToUser`.execute(db)
  await sql`drop table _PermissionToRole`.execute(db)
  await sql`drop table Permission`.execute(db)
  await sql`drop table Role`.execute(db)
}
