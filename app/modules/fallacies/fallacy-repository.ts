import { sql } from 'kysely'
import { db } from '#app/db.ts'
import { type FallacyList } from './fallacy-types.ts'

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
