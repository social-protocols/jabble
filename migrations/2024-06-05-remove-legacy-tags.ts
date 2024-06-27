import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await db.transaction().execute(async trx => {
		await sql`
			alter table VoteEvent drop column tagId
		`.execute(trx)

		await sql`
				drop index voteEvent_userId_tagId_postId_idx
		`.execute(trx)

		await sql`
			CREATE INDEX 'voteEvent_userId_postId_idx'
			ON VoteEvent(userId, 'postId');
		`.execute(trx)

		await sql`
			alter table EffectEvent drop column tagId
		`.execute(trx)

		await sql`
			alter table ScoreEvent drop column tagId
		`.execute(trx)
	})
}
