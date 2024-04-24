import { sql } from 'kysely'
import { type Score, type Effect, type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { type Position } from './positions.ts'
// import { GLOBAL_PRIOR_VOTE_RATE, findTopNoteId } from './probabilities.ts'
import { getPost } from './post.ts'
import { getOrInsertTagId } from './tag.ts'

// Post with score and the effect of its top note
export type ScoredPost = Post &
	Score &
	Effect & { nReplies: number; tag: string }

// Post with its effect on its parent
export type ScoredNote = Post & Effect

export const MAX_RESULTS = 100

export type RankedPost = ScoredPost & {
	note: ScoredNote | null
	parent: Post | null
}

export async function getScoredPost(
	tag: string,
	postId: number,
): Promise<ScoredPost> {
	const tagId = await getOrInsertTagId(tag)
	return getScoredPostInternal(tagId, postId)
}

async function getScoredPostInternal(
	tagId: number,
	postId: number,
): Promise<ScoredPost> {
	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.innerJoin('Tag', 'Tag.id', 'FullScore.tagId')
		.select('tag')
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where('Post.id', '=', postId)
		.where('FullScore.tagId', '=', tagId)

	const scoredPost = (await query.execute())[0]

	if (scoredPost === undefined) {
		throw new Error(
			`Failed to read scored post tagId=${tagId} postId=${postId}`,
		)
	}

	return scoredPost
	// return {
	// 	...scoredPost,
	// 	effectOnParent: await getEffectOnParent(tagId, postId),
	// }
}

export async function getTopNote(
	tag: string,
	post: ScoredPost,
	// postId: number,
): Promise<ScoredNote | null> {
	const tagId = await getOrInsertTagId(tag)
	return post.topNoteId !== null
		? getScoredNoteInternal(tagId, post.topNoteId)
		: null
}

async function getScoredNoteInternal(
	tagId: number,
	postId: number,
): Promise<ScoredNote> {
	let query = db
		.selectFrom('Post')
		.innerJoin('Effect', join =>
			join
				.on('Effect.tagId', '=', tagId)
				.on('Effect.noteId', '=', postId)
				.onRef('Effect.postId', '=', 'Post.parentId'),
		)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.selectAll('Post')
		.selectAll('Effect')
		.select(sql<number>`replies`.as('nReplies'))
		.where('Post.id', '=', postId)

	const scoredNote = (await query.execute())[0]

	if (scoredNote === undefined) {
		throw new Error(
			`Failed to read scored post tagId=${tagId} postId=${postId}`,
		)
	}

	return scoredNote
}

export async function getEffectOnParent(
	tag: string,
	postId: number,
): Promise<Effect | null> {
	const tagId = await getOrInsertTagId(tag)
	let query = db
		.selectFrom('Post')
		.innerJoin('Effect', join =>
			join
				.on('Effect.tagId', '=', tagId)
				.on('Effect.noteId', '=', postId)
				.onRef('Effect.postId', '=', 'Post.parentId'),
		)
		.selectAll('Effect')
		.where('Post.id', '=', postId)

	const effect = (await query.execute())[0]

	if (effect === undefined) {
		throw new Error(
			`Failed to read scored post tagId=${tagId} postId=${postId}`,
		)
	}

	return effect
}

export async function getRankedPosts(tag: string): Promise<RankedPost[]> {
	const tagId = await getOrInsertTagId(tag)

	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.innerJoin('Tag', 'Tag.id', 'FullScore.tagId')
		.select('tag')
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where('FullScore.tagId', '=', tagId)
		.orderBy('FullScore.score', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts: ScoredPost[] = await query.execute()

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				note:
					post.topNoteId == null
						? null
						: await getScoredNoteInternal(tagId, post.topNoteId!),
				parent: post.parentId == null ? null : await getPost(post.parentId!),
			}
		}),
	)
	return rankedPosts
}

export async function getChronologicalToplevelPosts(
	tag?: string,
): Promise<ScoredPost[]> {
	const tagId = tag == null ? null : await getOrInsertTagId(tag)

	let query = db
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.onRef('PostStats.tagId', '=', 'FullScore.tagId'),
		)
		.innerJoin('Tag', 'Tag.id', 'FullScore.tagId')
		.select('tag')
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.where(sql<boolean>`ifnull(FullScore.tagId = ${tagId}, true)`)
		.orderBy('Post.createdAt', 'desc')
		.limit(MAX_RESULTS)

	return await query.execute()
}

export async function getRankedReplies(
	tag: string,
	postId: number,
): Promise<RankedPost[]> {
	const tagId = await getOrInsertTagId(tag)
	let query = db
		.withRecursive('Descendants', db =>
			db
				.selectFrom('Post')
				.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
				.where('parentId', '=', postId)
				.where('FullScore.tagId', '=', tagId)
				.select(['id', 'parentId', 'authorId', 'content', 'createdAt'])
				.selectAll('FullScore')
				// .orderBy('FullScore.score', 'desc')
				.unionAll(db =>
					db
						.selectFrom('Post as P')
						.innerJoin('Descendants as D', 'P.parentId', 'D.id')
						.innerJoin('FullScore', 'FullScore.postId', 'D.id')
						.where('FullScore.tagId', '=', tagId)
						.select([
							'P.id',
							'P.parentId',
							'P.authorId',
							'P.content',
							'P.createdAt',
						])
						.selectAll('FullScore')
						.orderBy('FullScore.score', 'desc'),
				),
		)
		.selectFrom('Descendants as ScoredPost')
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'ScoredPost.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.innerJoin('Tag', 'Tag.id', 'ScoredPost.tagId')
		.select('tag')
		.selectAll('ScoredPost')
		.select(sql<number>`replies`.as('nReplies'))
		// .where('ScoredPost.parentId', '=', postId)
		.limit(MAX_RESULTS)

	const scoredPosts: ScoredPost[] = await query.execute()

	// const thisPost = await getPost(postId)

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async (post: ScoredPost) => {
			return {
				...post,
				note:
					post.topNoteId == null
						? null
						: await getScoredNoteInternal(tagId, post.topNoteId!),
				parent: await getPost(post.parentId!),
			}
		}),
	)

	return rankedPosts
}

export async function getRankedTags(): Promise<string[]> {
	return []
}

export type TagPreview = {
	tag: string
	posts: RankedPost[]
	positions: Position[]
}
