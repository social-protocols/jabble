import { type Transaction } from 'kysely'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { Direction } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { insertPostTag, insertTag } from '../tags/tag-repository.ts'
import { extractTags } from '../tags/tagger-client.ts'
import { getPollPost } from './polls/poll-repository.ts'
import { incrementReplyCount, insertPost } from './post-repository.ts'
import { type PollPagePost, type PollType, type Post } from './post-types.ts'
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
		const tags = await extractTags(content)
		const persistedTags = await Promise.all(
			tags.map(async tag => await insertTag(trx, tag)),
		)
		await Promise.all(
			persistedTags.map(
				async tag => await insertPostTag(trx, persistedPost.id, tag.id),
			),
		)
	}

	if (options?.withUpvote !== undefined ? options.withUpvote : true) {
		await vote(trx, authorId, persistedPost.id, Direction.Up)
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
	posts: Post[]
	polls: PollPagePost[]
}> {
	const results = await trx
		.selectFrom('Post')
		.innerJoin('PostTag', 'PostTag.postId', 'Post.id')
		.leftJoin('Poll', 'Poll.postId', 'Post.id')
		.where('PostTag.tagId', '=', tagId)
		.selectAll('Post')
		.select(['Poll.pollType as pollType'])
		.execute()

	const posts = results
		.filter(row => row.pollType === null)
		.map(row => {
			return {
				id: row.id,
				parentId: row.parentId,
				content: row.content,
				createdAt: row.createdAt,
				deletedAt: row.deletedAt,
				isPrivate: row.isPrivate,
				pollType: row.pollType as PollType,
			}
		})

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
