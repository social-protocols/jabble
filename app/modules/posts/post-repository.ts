import { type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { checkIsAdminOrThrow } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'
import { initPostStats } from './post-service.ts'
import { type Post, type StatsPost } from './post-types.ts'

export async function insertPost(
	trx: Transaction<DB>,
	parentId: number | null,
	content: string,
	authorId: string,
	isPrivate: boolean,
	createdAt?: number,
): Promise<Post> {
	// TODO: handle in one database call

	const persistedPost: { id: number } = await trx
		.insertInto('Post')
		.values({
			content: content,
			parentId: parentId,
			authorId: authorId,
			isPrivate: isPrivate ? 1 : 0,
			createdAt: createdAt ?? Date.now(),
		})
		.returning(['id'])
		.executeTakeFirstOrThrow()

	return await getPost(trx, persistedPost.id)
}

export async function getPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<Post> {
	return await trx
		.selectFrom('Post')
		.where('Post.id', '=', postId)
		.selectAll('Post')
		.executeTakeFirstOrThrow()
}

export async function incrementReplyCount(
	trx: Transaction<DB>,
	postId: number,
) {
	await initPostStats(trx, postId)
	await trx
		.updateTable('PostStats')
		.set(eb => ({
			replies: eb('replies', '+', 1),
		}))
		.where('postId', '=', postId)
		.execute()
}

export async function getStatsPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<StatsPost> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('Poll', 'Poll.postId', 'Post.id')
		.selectAll('Post')
		.selectAll('FullScore')
		.selectAll('Poll')
		.where('Post.id', '=', postId)

	const scoredPost = (await query.execute())[0]

	if (scoredPost === undefined) {
		throw new Error(`Failed to read scored post postId=${postId}`)
	}

	return scoredPost
}

export async function getReplyIds(
	trx: Transaction<DB>,
	postId: number,
): Promise<number[]> {
	const result: { id: number }[] = await trx
		.selectFrom('Post')
		.where('parentId', '=', postId)
		.select('id')
		.execute()
	const ids = result.map(postResult => postResult.id)
	return ids
}

export async function setDeletedAt(
	trx: Transaction<DB>,
	postId: number,
	deletedAt: number | null,
	byUserId: string,
) {
	checkIsAdminOrThrow(byUserId)

	const existingPost = await trx
		.selectFrom('Post')
		.where('id', '=', postId)
		.selectAll()
		.executeTakeFirst()

	invariant(existingPost, `Cannot delete post: Post ${postId} not found`)

	if (deletedAt != null && existingPost.deletedAt != null) {
		console.warn(`Cannot delete post: Post ${postId} already deleted`)
		return
	}

	if (deletedAt == null && existingPost.deletedAt == null) {
		console.warn(`Cannot restore non-deleted post ${postId}`)
		return
	}

	await trx
		.updateTable('Post')
		.set({ deletedAt: deletedAt })
		.where('id', '=', postId)
		.execute()
}

export async function getTransitiveParents(
	trx: Transaction<DB>,
	id: number,
): Promise<Post[]> {
	const result = await trx
		.withRecursive('transitive_parents', db =>
			db
				.selectFrom('Post')
				.where('id', '=', id)
				.select([
					'id',
					'parentId',
					'authorId',
					'content',
					'createdAt',
					'deletedAt',
					'isPrivate',
				])
				.unionAll(db =>
					db
						.selectFrom('Post as P')
						.innerJoin('transitive_parents as TP', 'P.id', 'TP.parentId')
						.select([
							'P.id',
							'P.parentId',
							'P.authorId',
							'P.content',
							'P.createdAt',
							'P.deletedAt',
							'P.isPrivate',
						]),
				),
		)
		.selectFrom('transitive_parents')
		.selectAll()
		.execute()

	// the topmost parent is the first element in the array
	// skip the first element, which is the post itself
	const resultReversed = result.slice(1).reverse()

	const transitiveParents = resultReversed.map(post => {
		return {
			id: post.id,
			parentId: post.parentId,
			content: post.content,
			createdAt: post.createdAt,
			deletedAt: post.deletedAt,
			isPrivate: post.isPrivate,
		}
	})

	return transitiveParents
}

export async function getDescendantCount(
	trx: Transaction<DB>,
	postId: number,
): Promise<number> {
	const result = await trx
		.selectFrom('Lineage')
		.where('ancestorId', '=', postId)
		.select(eb => eb.fn.count<number>('descendantId').as('count'))
		.executeTakeFirstOrThrow()

	return result.count
}

export async function getDescendantIds(
	trx: Transaction<DB>,
	postId: number,
): Promise<number[]> {
	const result = await trx
		.selectFrom('Lineage')
		.where('ancestorId', '=', postId)
		.select('descendantId')
		.execute()

	return result.map(row => row.descendantId)
}

export async function getRootPostId(
	trx: Transaction<DB>,
	postId: number,
): Promise<number> {
	const parentId = (
		await trx
			.selectFrom('Post')
			.where('id', '=', postId)
			.select('parentId')
			.executeTakeFirst()
	)?.parentId
	return parentId == null ? postId : await getRootPostId(trx, parentId)
}
