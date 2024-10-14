import { sendVoteEvent } from '#app/modules/posts/scoring/global-brain-service.ts'
import { db } from '../app/database/db.ts'
import { type DBVoteEvent } from '../app/database/types.ts'

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
