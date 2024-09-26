import { type Transaction } from 'kysely'
import { type DB } from '#app/types/kysely-types.ts'
import { snakeToCamelCaseObject } from './scoring-utils.ts'

export async function insertEffectEvent(trx: Transaction<DB>, data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['effect']),
	}

	await trx
		.insertInto('EffectEvent')
		.values(data_flat)
		.onConflict(oc =>
			oc.columns(['voteEventId', 'postId', 'commentId']).doNothing(),
		)
		.execute()
}
