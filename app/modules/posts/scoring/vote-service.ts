import { type Transaction } from 'kysely'
import { type DB, type DBVoteEvent } from '#app/database/types.ts'
import { Direction, type VoteState } from '#app/types/api-types.ts'
import { sendVoteEvent } from './global-brain-service.ts'
import { insertVoteEvent } from './vote-repository.ts'

export function defaultVoteState(postId: number): VoteState {
	return {
		vote: Direction.Neutral,
		postId: postId,
		isInformed: false,
	}
}

// The vote function inserts a vote record in voteHistory, and also updates attention stats
export async function vote(
	trx: Transaction<DB>,
	userId: string,
	postId: number,
	direction: Direction,
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
