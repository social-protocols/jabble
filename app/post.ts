import assert from 'assert'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Direction, vote } from '#app/vote.ts'

import { getOrInsertTagId } from './tag.ts'

export async function createPost(
	tag: string,
	parentId: number | null, // TODO: use parentId?: number
	content: string,
	authorId: string,
): Promise<number> {
	const results: { id: number }[] = await db
		.insertInto('Post')
		.values({ content, parentId, authorId })
		.returning('id')
		.execute()

	invariant(results[0], `Reply to ${parentId} not submitted successfully`)
	const postId: number = results[0].id

	const direction: Direction = Direction.Up

	await vote(tag, authorId, postId, null, direction)

	const tagId = await getOrInsertTagId(tag)

	if (parentId != null) {
		await incrementReplyCount(tagId, parentId)
	}

	return postId
}

export async function initPostStats(tagId: number, postId: number) {
	let query = db
		.insertInto('PostStats')
		.values({
			tagId: tagId,
			postId: postId,
			replies: 0,
		})
		// ignore conflict
		.onConflict(oc => oc.column('postId').doNothing())
	await query.execute()
}

export async function incrementReplyCount(tagId: number, postId: number) {
	await initPostStats(tagId, postId)
	await db
		.updateTable('PostStats')
		.set(eb => ({
			replies: eb.bxp('replies', '+', 1),
		}))
		.where('tagId', '=', tagId)
		.where('postId', '=', postId)
		.execute()
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
