import assert from 'assert'
import { type VoteEvent, type InsertableVoteEvent } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { writeVoteEvent } from '#app/vote-events.ts'
import {
	type Location,
	logTagVote,
	logVoteOnRandomlyRankedPost,
} from './attention.ts'
import { getOrInsertTagId } from './tag.ts'

export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}
// TODO: if a new post is untagged, do we post in in #global?

// The vote function inserts a vote record in voteHistory, and also updates attention stats
export async function vote(
	tag: string,
	userId: string,
	postId: number,
	noteId: number | null,
	direction: Direction,
	randomLocation?: Location | null,
) {
	const tagId = await getOrInsertTagId(tag)

	let vote_event: VoteEvent = await insertVoteEvent(
		tagId,
		userId,
		postId,
		noteId,
		direction,
	)

	await writeVoteEvent(vote_event)

	// console.log("result of inserting vote record", vote_event)

	// Todo: dedupe in case user toggles vote multiple times
	if (randomLocation != null) {
		logTagVote(tag)
		logVoteOnRandomlyRankedPost(randomLocation)
	}

	return vote_event
}

async function insertVoteEvent(
	tagId: number,
	userId: string,
	postId: number,
	noteId: number | null,
	vote: Direction,
): Promise<VoteEvent> {
	// TODO: transaction
	const voteInt = vote as number

	const parentId = (
		await db
			.selectFrom('Post')
			.where('id', '=', postId)
			.select('parentId')
			.execute()
	)[0]!.parentId

	const vote_event: InsertableVoteEvent = {
		userId: userId,
		tagId: tagId,
		parentId: parentId,
		postId: postId,
		noteId: noteId,
		vote: voteInt,
	}

	// Copilot now use kysely to insert
	const query = db
		.insertInto('VoteEvent')
		.values(vote_event)
		.returning(['voteEventId', 'voteEventTime'])

	let results = await query.execute()

	assert(results !== undefined)
	assert(results.length > 0)

	const result = results[0]!
	const voteEventId = result.voteEventId
	assert(voteEventId > 0)

	const output_vote_event: VoteEvent = {
		...vote_event,
		noteId: vote_event.noteId!,
		parentId: parentId,
		voteEventTime: result.voteEventTime!,
		voteEventId: voteEventId,
	}

	return output_vote_event
}
