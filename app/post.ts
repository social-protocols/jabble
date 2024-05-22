import assert from 'assert'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Direction, vote } from '#app/vote.ts'

import { getOrInsertTagId } from './tag.ts'
import { Transaction } from 'kysely'
import { DB } from './db/kysely-types.ts'

export async function createPost(
	tag: string,
	parentId: number | null, // TODO: use parentId?: number
	content: string,
	authorId: string,
	trx?: Transaction<DB>,
): Promise<number> {
	async function executeQueryInTransaction(trxLocal: Transaction<DB>) {
		const result: { id: number } = await trxLocal
			.insertInto('Post')
			.values({ content, parentId, authorId })
			.returning('id')
			.executeTakeFirstOrThrow()

		invariant(result, `Reply to ${parentId} not submitted successfully`)
		const postId: number = result.id

		const direction: Direction = Direction.Up

		await vote(tag, authorId, postId, null, direction, trxLocal)

		const tagId = await getOrInsertTagId(tag, trxLocal)

		if (parentId !== null) {
			await incrementReplyCount(tagId, parentId, trxLocal)
		}

		return postId
	}

	return trx
		? await executeQueryInTransaction(trx)
		: await db.transaction().execute(async (trxLocal) => await executeQueryInTransaction(trxLocal))
}

export async function initPostStats(tagId: number, postId: number, trx?: Transaction<DB>) {
	async function executeInTrx(localTrx: Transaction<DB>) {
		await localTrx
			.insertInto('PostStats')
			.values({
				tagId: tagId,
				postId: postId,
				replies: 0,
			})
			// ignore conflict
			.onConflict(oc => oc.column('postId').doNothing())
			.execute()
	}
	trx
		? await executeInTrx(trx)
		: await db.transaction().execute(async (trxLocal) => await executeInTrx(trxLocal))
}

export async function incrementReplyCount(tagId: number, postId: number, trx?: Transaction<DB>) {
	async function executeInTrx(localTrx: Transaction<DB>) {
		await initPostStats(tagId, postId, localTrx)
		await localTrx
			.updateTable('PostStats')
			.set(eb => ({
				replies: eb.bxp('replies', '+', 1),
			}))
			.where('tagId', '=', tagId)
			.where('postId', '=', postId)
			.execute()
		}
		trx
			? await executeInTrx(trx)
			: await db.transaction().execute(async (trxLocal) => await executeInTrx(trxLocal))
}

export async function getPost(id: number): Promise<Post> {
	let result: Post | undefined = await db
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	assert(result != null, 'result != null')
	return result
}

export async function deletePost(id: number, byUserId: string) {
	const user = await db
		.selectFrom('User')
		.where('id', '=', byUserId)
		.selectAll()
		.executeTakeFirst()

	invariant(user, `Cannot delete post: User ${byUserId} not found`)
	invariant(
		user.isAdmin,
		`Cannot delete post: User ${byUserId} doesn't have permission`,
	)

	const existingPost = await db
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	invariant(existingPost, `Cannot delete post: Post ${id} not found`)

	if (existingPost.deletedAt != null) {
		console.warn(`Cannot delete post: Post ${id} already deleted`)
		return
	}

	await db
		.updateTable('Post')
		.set({ deletedAt: Date.now() })
		.where('id', '=', id)
		.execute()
}

export async function restoreDeletedPost(id: number, byUserId: string) {
	const user = await db
		.selectFrom('User')
		.where('id', '=', byUserId)
		.selectAll()
		.executeTakeFirst()

	invariant(user, `Cannot restore post: User ${byUserId} not found`)
	invariant(
		user.isAdmin,
		`Cannot restore post: User ${byUserId} doesn't have permission`,
	)

	const existingPost = await db
		.selectFrom('Post')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirst()

	invariant(existingPost, `Cannot delete post: Post ${id} not found`)

	if (existingPost.deletedAt == null) {
		console.warn(`Cannot restore non-deleted post ${id}`)
		return
	}

	await db
		.updateTable('Post')
		.set({ deletedAt: null })
		.where('id', '=', id)
		.execute()
}

export async function getTransitiveParents(id: number): Promise<Post[]> {
	let result: Post[] = await db
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
