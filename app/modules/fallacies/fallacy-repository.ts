import { type Transaction, sql } from 'kysely'
import { db } from '#app/database/db.ts'
import { type DB } from '#app/database/types.ts'
import {
	type FallacyList,
	FallacyListSchema,
} from '#app/modules/fallacies/fallacy-types.ts'

export async function storeFallacies(
	postId: number,
	detectedFallacies: FallacyList,
) {
	await db.transaction().execute(
		async trx =>
			await sql`
				insert into Fallacy (postId, detection)
				values (${postId}, jsonb(${JSON.stringify(detectedFallacies)})) on conflict(postId) do update set detection = excluded.detection
			`.execute(trx),
	)
}

export async function getFallacies(
	trx: Transaction<DB>,
	postId: number,
): Promise<FallacyList> {
	const fallacies = await trx
		.selectFrom('Fallacy')
		.where('postId', '=', postId)
		.select(sql<string>`json(detection)`.as('detection'))
		.executeTakeFirst()
	if (fallacies == null) return []
	else {
		return FallacyListSchema.parse(JSON.parse(fallacies.detection))
	}
}
