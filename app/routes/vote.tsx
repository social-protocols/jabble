import { type ActionFunctionArgs, json } from '@remix-run/node'
import { db } from '#app/db.ts'
import { getCommentTreeState } from '#app/ranking.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { Direction, vote } from '#app/vote.ts'

type VoteData = {
	postId: number
	focussedPostId: number
	direction: Direction
	currentVoteState: Direction
}

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const dataParsed = (await request.json()) as VoteData

	// First, interpret the user intent based on the button pressed **and** the current state.
	// Example: state is Up and we receive another Up means that we clear the vote.
	const newState =
		dataParsed.direction == dataParsed.currentVoteState
			? Direction.Neutral
			: dataParsed.direction

	const userId: string = await requireUserId(request)

	await db
		.transaction()
		.execute(async trx => vote(trx, userId, dataParsed.postId, newState))

	const commentTreeState = await db
		.transaction()
		.execute(async trx =>
			getCommentTreeState(trx, dataParsed.focussedPostId, userId),
		)

	return json(commentTreeState)
}
