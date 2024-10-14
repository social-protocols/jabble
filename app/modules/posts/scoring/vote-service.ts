import { type Transaction } from 'kysely'
import { type DB, type DBVoteEvent } from '#app/database/types.ts'
import { VoteDirection, type VoteState } from '../post-types.ts'
import { sendVoteEvent } from './global-brain-service.ts'
import { insertVoteEvent } from './vote-repository.ts'

export function defaultVoteState(postId: number): VoteState {
	return {
		vote: VoteDirection.Neutral,
		postId: postId,
		isInformed: false,
	}
}

// The vote function inserts a vote record in voteHistory, and also updates attention stats
export async function vote(
	trx: Transaction<DB>,
	userId: string,
	postId: number,
	direction: VoteDirection,
): Promise<DBVoteEvent> {
	let voteEvent: DBVoteEvent = await insertVoteEvent(
		trx,
		userId,
		postId,
		direction,
	)

	await sendVoteEvent(trx, voteEvent)

	return voteEvent
}
