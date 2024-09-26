import { type Transaction } from 'kysely'
import { type DB } from '#app/types/kysely-types.ts'
import { snakeToCamelCaseObject } from './scoring-utils.ts'

export async function insertScoreEvent(trx: Transaction<DB>, data: any) {
	const data_flat = {
		voteEventId: data['vote_event_id'],
		voteEventTime: data['vote_event_time'],
		...snakeToCamelCaseObject(data['score']),
	}

	const result = await trx
		.insertInto('ScoreEvent')
		.values(data_flat)
		.onConflict(oc => oc.columns(['voteEventId', 'postId']).doNothing())
		.execute()

	return result
}
