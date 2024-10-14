import { sql, type Transaction } from 'kysely'
import {
	type DB,
	type DBInsertableVoteEvent,
	type DBVoteEvent,
} from '#app/database/types.ts'
import { type Direction, type VoteState } from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'

export async function insertVoteEvent(
	trx: Transaction<DB>,
	userId: string,
	postId: number,
	vote: Direction,
): Promise<DBVoteEvent> {
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

	const voteEvent: DBInsertableVoteEvent = {
		userId: userId,
		parentId: parentId,
		postId: postId,
		vote: voteInt,
	}

	const results: DBVoteEvent[] = await trx
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
		.innerJoin('FullScore as Score', 'Score.postId', 'Post.id')
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

export async function getAllCurrentVotes(
	trx: Transaction<DB>,
	userId: string,
): Promise<VoteState[]> {
	const result: { postId: number }[] = await trx
		.selectFrom('Vote')
		.where('userId', '=', userId)
		.select('postId')
		.execute()
	const postsUserVotedOn = result.map(row => row.postId)
	return await getUserVotes(trx, userId, postsUserVotedOn)
}
