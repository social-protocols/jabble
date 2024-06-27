import { type DBVoteEvent } from '../app/types/db-types.ts'
import { db } from '../app/db.ts'
import { sendVoteEvent } from '../app/globalbrain.ts'

async function replayVoteEvents() {
	console.log('Replaying vote events')
	const voteEvents: DBVoteEvent[] = await db
		.selectFrom('VoteEvent')
		.selectAll()
		.execute()

	for (const ve of voteEvents) {
		console.log(
			`Sending vote event ${ve.voteEventId} to globalbrain.process_vote_event`,
		)
		await db.transaction().execute(async trx => await sendVoteEvent(trx, ve))
	}
	console.log('Done')
}

replayVoteEvents()
