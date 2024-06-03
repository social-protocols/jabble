import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    alter table post add column isPrivate integer not null default false
  `.execute(db)
}

