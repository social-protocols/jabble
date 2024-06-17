import { type Transaction, sql } from 'kysely'
import { type VoteEvent, type InsertableVoteEvent } from '#app/db/types.ts'
import { sendVoteEvent } from '#app/globalbrain.ts'
import { type DB } from './db/kysely-types.ts'
import { invariant } from './utils/misc.tsx'

export enum Direction {
	Up = 1,
	Down = -1,
	Neutral = 0,
}

export type VoteState = {
	postId: number
	vote: Direction
	isInformed: boolean
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
	trx: Transaction<DB>,
	userId: string,
	postId: number,
	direction: Direction,
): Promise<VoteEvent> {
	let voteEvent: VoteEvent = await insertVoteEvent(
		trx,
		userId,
		postId,
		direction,
	)

	await sendVoteEvent(trx, voteEvent)

	return voteEvent
}

async function insertVoteEvent(
	trx: Transaction<DB>,
	userId: string,
	postId: number,
	vote: Direction,
): Promise<VoteEvent> {
	const voteInt = vote as number

	const post: { parentId: number | null } | undefined = await trx
		.selectFrom('Post')
		.where('id', '=', postId)
		.select('parentId')
		.executeTakeFirst()

	invariant(
		post,
		`Post ${postId} not found when inserting vote ${vote} for user ${userId}`,
	)

	const parentId = post.parentId

	const voteEvent: InsertableVoteEvent = {
		userId: userId,
		parentId: parentId,
		postId: postId,
		vote: voteInt,
	}

	const results: VoteEvent[] = await trx
		.insertInto('VoteEvent')
		.values(voteEvent)
		.returning([
			'voteEventId',
			'voteEventTime',
			'userId',
			'parentId',
			'postId',
			'vote',
		])
		.execute()

	invariant(
		results[0],
		`VoteEvent insert for user ${userId} on post ${postId} failed`,
	)

	const outputVoteEvent = results[0]
	invariant(
		outputVoteEvent.voteEventId > 0,
		`Generated voteEventId for user ${userId} on post ${postId} must be greater than 0`,
	)

	return outputVoteEvent
}

export async function getUserVotes(
	trx: Transaction<DB>,
	userId: string,
	postIds: number[],
): Promise<VoteState[]> {
	return await trx
		.selectFrom('Post')
		.innerJoin('ScoreWithDefault as Score', 'Score.postId', 'Post.id')
		.leftJoin('Vote', join =>
			join.onRef('Vote.postId', '=', 'Post.id').on('Vote.userId', '=', userId),
		)
		.where(eb => eb('id', 'in', postIds))
		.leftJoin('Vote as VoteOnCriticalReply', join =>
			join
				.onRef('VoteOnCriticalReply.postId', '=', 'criticalThreadId')
				.onRef('VoteOnCriticalReply.userId', '=', 'Vote.userId'),
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

export async function getAllCurrentVotes(trx: Transaction<DB>, userId: string): Promise<VoteState[]> {
	const result: { postId: number }[] = await trx
		.selectFrom('Vote')
		.where('userId', '=', userId)
		.select('postId')
		.execute()
	const postsUserVotedOn = result.map(row => row.postId)
	return await getUserVotes(trx, userId, postsUserVotedOn)
}
