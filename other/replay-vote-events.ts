import { type VoteEvent } from '../app/db/types.ts'
import { db } from '../app/db.ts'
import { sendVoteEvent } from '../app/globalbrain.ts'

async function replayVoteEvents() {
	console.log('Replaying vote events')
	const voteEvents: VoteEvent[] = await db
		.selectFrom('VoteEvent')
		.selectAll()
		.execute()

	for (const ve of voteEvents) {
		console.log('Sending vote event')
		await db.transaction().execute(async trx => sendVoteEvent(trx, ve))
	}
	console.log('Done')
}

replayVoteEvents()
