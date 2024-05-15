import assert from 'assert'
import { sql } from 'kysely'
import { type VoteEvent, type InsertableVoteEvent } from '#app/db/types.ts'
import * as scoreEvents from '#app/score-events.ts'
import { writeVoteEvent } from '#app/vote-events.ts'
import { db } from './db.ts'
import { sendVoteEvent } from '#app/globalbrain.ts'
import { getOrInsertTagId } from './tag.ts'

export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

export type VoteState = {
	postId: number
	vote: Direction
	isInformed: Boolean
}

export function defaultVoteState(postId: number): VoteState {
	return {
		vote: Direction.Neutral,
		postId: postId,
		isInformed: false,
	}
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

	const scoreEvents = await sendVoteEvent(voteEvent)

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
): Promise<VoteState[]> {
	let tagId = await getOrInsertTagId(tag)

	return await db
		.selectFrom('Post')
		.innerJoin('Score', 'Score.postId', 'Post.id')
		.leftJoin('Vote', join =>
			join
				.onRef('Vote.postId', '=', 'Post.id')
				.on('Vote.userId', '=', userId)
				.on('Vote.tagId', '=', tagId),
		)
		.where(eb => eb('id', 'in', postIds))
		.leftJoin('Vote as VoteOnCriticalReply', join =>
			join
				.onRef('VoteOnCriticalReply.postId', '=', 'criticalThreadId')
				.onRef('VoteOnCriticalReply.userId', '=', 'Vote.userId')
				.onRef('VoteOnCriticalReply.tagId', '=', 'Vote.tagId'),
		)
		.select('Post.id as postId')
		.select(sql<number>`ifnull(Vote.vote,0)`.as('vote'))
		// We have decided that isInformed is only true if
		// 1) there is a vote on the target
		// 2) and there is a vote on the critical comment OR there is no critical comment
		.select(
			sql<boolean>`(criticalThreadId is null or coalesce(VoteOnCriticalReply.vote, 0) != 0 )  and coalesce(vote.vote, 0) != 0`.as(
				'isInformed',
			),
		)
		.execute()
}
