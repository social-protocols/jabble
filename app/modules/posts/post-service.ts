import { type Transaction } from 'kysely'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { vote } from '#app/modules/scoring/vote-service.ts'
import { Direction } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { incrementReplyCount, insertPost } from './post-repository.ts'

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
