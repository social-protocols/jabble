import assert from 'assert'
import { type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Direction, vote } from '#app/vote.ts'

import { getOrInsertTagId } from './tag.ts'

// express the above fn in typescript with kysely queries
export async function createPost(
	tag: string,
	parentId: number | null, // TODO: use parentId?: number
	content: string,
	authorId: string,
	waitForScoreEvent: boolean = false,
): Promise<number> {
	const results: { id: number }[] = await db
		.insertInto('Post')
		.values({ content, parentId, authorId })
		.returning('id')
		.execute()

	invariant(results[0], `Reply to ${parentId} not submitted successfully`)
	const postId = results[0].id

	const direction: Direction = Direction.Up

	await vote(tag, authorId, postId, null, direction, waitForScoreEvent)

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

export async function getTransitiveParents(id: number): Promise<Post[]> {
	let result: Post[] = await db
		.withRecursive('transitive_parents', db =>
			db
				.selectFrom('Post')
				.where('id', '=', id)
				.select(['id', 'parentId', 'authorId', 'content', 'createdAt'])
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
