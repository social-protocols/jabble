import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
-- Step 1: Create a new table with JSONB column
CREATE TABLE Fallacy_new (
    postId INTEGER NOT NULL REFERENCES Post(id),
    detection BLOB NOT NULL
) STRICT;
		`.execute(trx)

		await sql`
-- Step 2: Copy data from the old table to the new table
--         extract the dectection array on the way
INSERT INTO Fallacy_new (postId, detection)
SELECT postId,  jsonb_extract(detection, '$.detected_fallacies')
FROM Fallacy;
		`.execute(trx)

		await sql`
-- Step 3: Drop the old table
DROP TABLE Fallacy;
		`.execute(trx)

		await sql`
-- Step 4: Rename the new table to the old table's name
ALTER TABLE Fallacy_new RENAME TO Fallacy;
		`.execute(trx)
	})
}
