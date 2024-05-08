import assert from 'assert'
import { type VoteEvent, type InsertableVoteEvent } from '#app/db/types.ts'
import * as scoreEvents from '#app/score-events.ts'
import { writeVoteEvent } from '#app/vote-events.ts'
import { db } from './db.ts'
import { getOrInsertTagId } from './tag.ts'
import { Vote } from './db/types.ts'

export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

// The vote function inserts a vote record in voteHistory, and also updates attention stats
export async function vote(
	tag: string,
	userId: string,
	postId: number,
	noteId: number | null,
	direction: Direction,
	waitForScoreEvent: Boolean = false,
): Promise<VoteEvent> {
	const tagId = await getOrInsertTagId(tag)

	let voteEvent: VoteEvent = await insertVoteEvent(
		tagId,
		userId,
		postId,
		noteId,
		direction,
	)

	let scoreEventPromise
	if (waitForScoreEvent) {
		scoreEventPromise = scoreEvents.waitForScoreEvent({
			postId: postId,
			tagId: tagId,
			voteEventId: voteEvent.voteEventId,
		})
	}

	await writeVoteEvent(voteEvent)

	if (waitForScoreEvent) {
		await scoreEventPromise
	}

	return voteEvent
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

export async function getUserVotes(
	userId: string,
	tag: string,
	postIds: number[],
): Promise<Vote[]> {
	let tagId = await getOrInsertTagId(tag)

	return await db
		.selectFrom('Vote')
		.innerJoin('Post', 'postId', 'Post.id')
		.where('userId', '=', userId)
		.where('tagId', '=', tagId)
		.where(eb =>
			eb.or([eb('parentId', 'in', postIds), eb('id', 'in', postIds)]),
		)
		.selectAll('Vote')
		.execute()
}

