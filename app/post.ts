import assert from 'assert'
import { type Transaction } from 'kysely'
import { type Post } from '#app/db/types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Direction, vote } from '#app/vote.ts'
import { type DB } from './db/kysely-types.ts'

export async function createPost(
	trx: Transaction<DB>,
	parentId: number | null, // TODO: use parentId?: number
	content: string,
	authorId: string,
	isPrivate: boolean,
): Promise<number> {
	const isPrivateNumber: number = isPrivate ? 1 : 0
	const persistedPost: Post = await trx
		.insertInto('Post')
		.values({ content: content, parentId: parentId, authorId: authorId, isPrivate: isPrivateNumber })
		.returningAll()
		.executeTakeFirstOrThrow()

	invariant(persistedPost, `Reply to ${parentId} not submitted successfully`)

	await vote(trx, authorId, persistedPost.id, null, Direction.Up)

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

export async function deletePost(
	trx: Transaction<DB>,
	id: number,
	byUserId: string,
) {
	const user = await trx
		.selectFrom('User')
		.where('id', '=', byUserId)
		.selectAll()
		.executeTakeFirst()

	invariant(user, `Cannot delete post: User ${byUserId} not found`)
	invariant(
		user.isAdmin,
		`Cannot delete post: User ${byUserId} doesn't have permission`,
	)

	const existingPost = await trx
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	invariant(existingPost, `Cannot delete post: Post ${id} not found`)

	if (existingPost.deletedAt != null) {
		console.warn(`Cannot delete post: Post ${id} already deleted`)
		return
	}

	await trx
		.updateTable('Post')
		.set({ deletedAt: Date.now() })
		.where('id', '=', id)
		.execute()
}

export async function restoreDeletedPost(
	trx: Transaction<DB>,
	id: number,
	byUserId: string,
) {
	const user = await trx
		.selectFrom('User')
		.where('id', '=', byUserId)
		.selectAll()
		.executeTakeFirst()

	invariant(user, `Cannot restore post: User ${byUserId} not found`)
	invariant(
		user.isAdmin,
		`Cannot restore post: User ${byUserId} doesn't have permission`,
	)

	const existingPost = await trx
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	invariant(existingPost, `Cannot delete post: Post ${id} not found`)

	if (existingPost.deletedAt == null) {
		console.warn(`Cannot restore non-deleted post ${id}`)
		return
	}

	await trx
		.updateTable('Post')
		.set({ deletedAt: null })
		.where('id', '=', id)
		.execute()
}

export async function getTransitiveParents(
	trx: Transaction<DB>,
	id: number,
): Promise<Post[]> {
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
