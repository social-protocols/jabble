import assert from 'assert'
import { type Transaction } from 'kysely'
import { type Post } from '#app/db/types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { vote } from '#app/vote.ts'
import { type DB } from './db/kysely-types.ts'
import { checkIsAdminOrThrow } from './utils/auth.server.ts'
import { Direction, type ApiPost } from '#app/api-types.ts'

export async function createPost(
	trx: Transaction<DB>,
	parentId: number | null, // TODO: use parentId?: number
	content: string,
	authorId: string,
	options?: { isPrivate: boolean; withUpvote?: boolean },
): Promise<number> {
	const persistedPost: Post = await trx
		.insertInto('Post')
		.values({
			content: content,
			parentId: parentId,
			authorId: authorId,
			isPrivate: options ? Number(options.isPrivate) : 0,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

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
		// ignore conflict
		.onConflict(oc => oc.column('postId').doNothing())
		.execute()
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

export async function getPost(trx: Transaction<DB>, id: number): Promise<Post> {
	let result: Post | undefined = await trx
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	assert(result != null, 'result != null')
	return result
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
	return result.map(postResult => postResult.id)
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
): Promise<ApiPost[]> {
	let result: Post[] = await trx
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
	let resultReversed = result.slice(1).reverse()

	return resultReversed
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

export async function getDescendants(
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
