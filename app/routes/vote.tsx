import { type ActionFunctionArgs } from '@remix-run/node'
import { Direction } from '#app/types/api-types.ts'
import { db } from '#app/db.ts'
import { getCommentTreeState } from '#app/repositories/ranking.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { vote } from '#app/repositories/vote.ts'

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
		.execute(async trx => await vote(trx, userId, dataParsed.postId, newState))

	const commentTreeState = await db
		.transaction()
		.execute(
			async trx =>
				await getCommentTreeState(trx, dataParsed.focussedPostId, userId),
		)

	return commentTreeState
}
