import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
        UPDATE voteEvent
        SET parentId = (
            SELECT p.parentId
            FROM post p
            WHERE p.id = voteEvent.postId
        )
        WHERE EXISTS (
            SELECT 1
            FROM post p
            WHERE p.id = voteEvent.postId
        );
    `.execute(db)
}
