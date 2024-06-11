import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/db.ts'
import { getCommentTreeState } from '#app/ranking.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { Direction, vote } from '#app/vote.ts'

const postIdSchema = z.coerce.number()

// little hack described here: https://stackoverflow.com/questions/76797356/zod-nativeenum-type-checks-enums-value
const directionKeys = Object.keys(Direction) as [keyof typeof Direction]
const directionSchema = z.enum(directionKeys)

function parseDirection(
	directionString: FormDataEntryValue | undefined,
): Direction {
	const d: string = directionSchema.parse(directionString)

	// if d is a (possibly negative) integer
	if (/^-?\d+$/.test(d)) {
		// parse it as an int
		const i = parseInt(d)
		return i
	}

	// @ts-ignore: typescript doesn't know directionString is guaranteed to overlap with Direction
	return Direction[d]
}

const oneBasedRankSchema = z.coerce.number().optional()
const voteSchema = zfd.formData({
	postId: postIdSchema,
	focussedPostId: postIdSchema,
	direction: directionSchema,
	state: directionSchema,
	oneBasedRank: oneBasedRankSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const parsedData = voteSchema.parse(formData)
	const direction: Direction = parseDirection(parsedData.direction)
	const state: Direction = parseDirection(parsedData.state)

	// First, interpret the user intent based on the button pressed **and** the current state.
	// Example: state is Up and we receive another Up means that we clear the vote.
	const newState = direction == state ? Direction.Neutral : direction

	const userId: string = await requireUserId(request)

	const postId = parsedData.postId
	const focussedPostId = parsedData.focussedPostId

	await db
		.transaction()
		.execute(async trx => vote(trx, userId, postId, newState))

	const commentTreeState = await db
		.transaction()
		.execute(async trx => getCommentTreeState(trx, focussedPostId))

	return commentTreeState
}
