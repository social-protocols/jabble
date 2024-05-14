import { type ActionFunctionArgs } from '@remix-run/node'

import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { requireUserId } from '#app/utils/auth.server.ts'
import { Direction, getUserVotes, vote, type VoteState } from '#app/vote.ts'

const postIdSchema = z.coerce.number()
const noteIdSchema = z.coerce.number().optional()
const tagSchema = z.coerce.string()

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
	noteId: noteIdSchema,
	tag: tagSchema,
	direction: directionSchema,
	state: directionSchema,
	oneBasedRank: oneBasedRankSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const parsedData = voteSchema.parse(formData)
	console.log('vote: ', parsedData)
	const direction: Direction = parseDirection(parsedData.direction)
	const state: Direction = parseDirection(parsedData.state)

	// First, interpret the user intent based on the button pressed **and** the current state.
	const newState = direction == state ? Direction.Neutral : direction

	const userId: string = await requireUserId(request)

	const noteId = parsedData.noteId === undefined ? null : parsedData.noteId
	const postId = parsedData.postId
	const tag = parsedData.tag

	const v = await vote(tag, userId, postId, noteId, newState, true)

	const voteState: VoteState[] = await getUserVotes(v.userId, tag, [v.postId])

	return { voteState: voteState[0], postId: postId }
}
