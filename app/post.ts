import assert from 'assert'
import { type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { Direction, vote } from '#app/vote.ts'

import { logAuthorView } from './attention.ts'
import { invalidateTagPage } from './ranking.ts'
import { getOrInsertTagId } from './tag.ts'

// express the above fn in typescript with kysely queries
export async function createPost(
	tag: string,
	parentId: number | null,
	content: string,
	authorId: string,
): Promise<number> {
	const results: { id: number }[] = await db
		.insertInto('Post')
		.values({ content, parentId, authorId })
		.returning('id')
		.execute()

	const additionalExtractedTags = extractTags(content)
	const allTags = [tag, ...additionalExtractedTags]
	// console.log("All tags", allTags);

	const createdPostId = results[0]!.id

	const direction: Direction = Direction.Up

	await Promise.all(
		allTags.map(tag =>
			vote(tag, authorId, createdPostId, null, direction, null),
		),
	)

	const tagIds: number[] = await Promise.all(
		allTags.map(tag => getOrInsertTagId(tag)),
	)

	if (parentId != null) {
		await Promise.all(tagIds.map(tagId => incrementReplyCount(tagId, parentId)))
	}

	await Promise.all(
		tagIds.map(tagId => logAuthorView(authorId, tagId, createdPostId)),
	)

	await Promise.all(allTags.map(tag => invalidateTagPage(tag)))

	return createdPostId
}

export async function initPostStats(tagId: number, postId: number) {
	let query = db
		.insertInto('PostStats')
		.values({
			tagId: tagId,
			postId: postId,
			// initial attention is 1 + deltaAttention, because each post automatically gets 1 upvote from the author
			// and so the expectedVotes (attention) for a new post is equal to 1.
			attention: 1,
			views: 1,
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

function extractTags(content: string): string[] {
	const regex = /#[a-zA-Z0-9]+/g
	const matches = content.match(regex) || []
	return matches.map(match => match.slice(1))
}
