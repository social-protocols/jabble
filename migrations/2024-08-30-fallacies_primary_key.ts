import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
-- Create a new table with the desired schema
CREATE TABLE IF NOT EXISTS "Fallacy_new" (
    postId INTEGER PRIMARY KEY NOT NULL REFERENCES Post(id),
    detection BLOB NOT NULL
) STRICT;
		`.execute(trx)

		await sql`
-- Copy data from the old table to the new table
INSERT INTO "Fallacy_new" (postId, detection)
SELECT postId, detection FROM "Fallacy";
		`.execute(trx)

		await sql`
-- Drop the old table
DROP TABLE "Fallacy";
		`.execute(trx)

		await sql`
-- Rename the new table to the original name
ALTER TABLE "Fallacy_new" RENAME TO "Fallacy";
		`.execute(trx)
	})
}
