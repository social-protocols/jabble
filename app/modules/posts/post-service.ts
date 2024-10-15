import { type Transaction } from 'kysely'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { type DB } from '#app/database/types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { insertPostTag, insertTag } from '../tags/tag-repository.ts'
import { extractTags } from '../tags/tagger-client.ts'
import { getPollPost } from './polls/poll-repository.ts'
import {
	getDescendantCount,
	getPost,
	incrementReplyCount,
	insertPost,
} from './post-repository.ts'
import {
	VoteDirection,
	type FrontPagePost,
	type Poll,
	type PollType,
} from './post-types.ts'
import { vote } from './scoring/vote-service.ts'

export async function createPost(
	trx: Transaction<DB>,
	parentId: number | null,
	content: string,
	authorId: string,
	options?: { isPrivate: boolean; withUpvote?: boolean; createdAt?: number },
): Promise<number> {
	invariant(content.length <= MAX_CHARS_PER_POST, 'Post content too long')
	invariant(content.length > 0, 'Post content too short')

	const persistedPost = await insertPost(
		trx,
		parentId,
		content,
		authorId,
		options?.isPrivate ?? false,
		options?.createdAt ?? Date.now(),
	)

	invariant(persistedPost, `Reply to ${parentId} not submitted successfully`)

	if (parentId == null) {
		await tagPost(trx, persistedPost.id)
	}

	if (options?.withUpvote !== undefined ? options.withUpvote : true) {
		await vote(trx, authorId, persistedPost.id, VoteDirection.Up)
	}

	if (parentId !== null) {
		await incrementReplyCount(trx, parentId)
	}

	return persistedPost.id
}

export async function initPostStats(trx: Transaction<DB>, postId: number) {
	await trx
		.insertInto('PostStats')
		.values({
			postId: postId,
			replies: 0,
		})
		.onConflict(oc => oc.column('postId').doNothing())
		.execute()
}

export async function getPostsAndPollsByTagId(
	trx: Transaction<DB>,
	tagId: number,
): Promise<{
	posts: FrontPagePost[]
	polls: Poll[]
}> {
	const results = await trx
		.selectFrom('Post')
		.innerJoin('PostTag', 'PostTag.postId', 'Post.id')
		.leftJoin('Poll', 'Poll.postId', 'Post.id')
		.where('PostTag.tagId', '=', tagId)
		.selectAll('Post')
		.select(['Poll.pollType as pollType'])
		.execute()

	const posts = await Promise.all(
		results
			.filter(row => row.pollType === null)
			.map(async row => {
				const stats = await trx
					.selectFrom('Post')
					.where('Post.id', '=', row.id)
					.where('Post.deletedAt', 'is', null)
					.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
					.select(['FullScore.oSize as oSize', 'FullScore.p as p'])
					.executeTakeFirstOrThrow()

				return {
					id: row.id,
					parentId: row.parentId,
					content: row.content,
					createdAt: row.createdAt,
					deletedAt: row.deletedAt,
					isPrivate: row.isPrivate,
					pollType: row.pollType as PollType,
					oSize: stats.oSize,
					nTransitiveComments: await getDescendantCount(trx, row.id),
					p: stats.p,
				}
			}),
	)

	const polls = await Promise.all(
		results
			.filter(row => row.pollType !== null)
			.map(async row => {
				return await getPollPost(trx, row.id)
			}),
	)

	return {
		posts: posts,
		polls: polls,
	}
}

export async function tagPost(trx: Transaction<DB>, postId: number) {
	const post = await getPost(trx, postId)
	const tags = await extractTags(post.content)
	const persistedTags = await Promise.all(
		tags.map(async tag => await insertTag(trx, tag)),
	)
	await Promise.all(
		persistedTags.map(async tag => await insertPostTag(trx, post.id, tag.id)),
	)
}
