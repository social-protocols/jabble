import { type VoteEvent } from '../app/db/types.ts'
import { db } from '../app/db.ts'
import { sendVoteEvent } from '../app/globalbrain.ts'

async function replayVoteEvents() {
	const voteEvents: VoteEvent[] = await db
		.selectFrom('VoteEvent')
		.selectAll()
		.execute()

	for (const ve of voteEvents) {
		await sendVoteEvent(ve)
	}
}

replayVoteEvents()
