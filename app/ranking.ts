import { sql } from 'kysely'
import { type Score, type Effect, type Post } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { db } from '#app/db.ts'
import { type Position } from './positions.ts'
// import { GLOBAL_PRIOR_VOTE_RATE, findTopNoteId } from './probabilities.ts'
import { getPost } from './post.ts'
import { getOrInsertTagId } from './tag.ts'
import { relativeEntropy } from './utils/entropy.ts'

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
	effectOnParent: Effect | null
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
		.select(eb =>
			eb.fn.coalesce(sql<number>`replies`, sql<number>`0`).as('nReplies'),
		)
		.where('Post.id', '=', postId)
		.where('FullScore.tagId', '=', tagId)

	const scoredPost = (await query.execute())[0]

	if (scoredPost === undefined) {
		throw new Error(
			`Failed to read scored post tagId=${tagId} postId=${postId}`,
		)
	}

	return scoredPost
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
	return await getEffectOnParentInternal(await getOrInsertTagId(tag), postId)
}

async function getEffectOnParentInternal(
	tagId: number,
	postId: number,
): Promise<Effect | null> {
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
	return effect || null
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
		.select(eb =>
			eb.fn.coalesce(sql<number>`replies`, sql<number>`0`).as('nReplies'),
		)
		.where('FullScore.tagId', '=', tagId)
		.orderBy('FullScore.score', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts = await query.execute()

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				note:
					post.topNoteId == null
						? null
						: await getScoredNoteInternal(tagId, post.topNoteId!),
				parent: post.parentId == null ? null : await getPost(post.parentId!),
				effectOnParent: await getEffectOnParentInternal(tagId, post.id),
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

	const scoredPosts = await query.execute()

	const res = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				parent: post.parentId == null ? null : await getPost(post.parentId!),
				effectOnParent: await getEffectOnParentInternal(post.tagId, post.id),
			}
		}),
	)

	return res
}

export async function getRankedReplies(
	tag: string,
	parentId: number,
): Promise<RankedPost[]> {
	const tagId = await getOrInsertTagId(tag)

	const tree = await getRankedRepliesInternal(tagId, parentId, parentId)
	return tree
}

async function getRankedRepliesInternal(
	tagId: number,
	targetId: number,
	parentId: number,
): Promise<RankedPost[]> {
	let query = db
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.where('parentId', '=', parentId)
		.where('FullScore.tagId', '=', tagId)
		.leftJoin('PostStats', join =>
			join
				.onRef('PostStats.postId', '=', 'Post.id')
				.on('PostStats.tagId', '=', tagId),
		)
		.innerJoin('Tag', 'Tag.id', 'FullScore.tagId')
		.select('tag')
		.innerJoin('Effect', join =>
			join
				.on('Effect.postId', '=', targetId)
				.onRef('Effect.noteId', '=', 'Post.id'),
		)
		.select(sql<number>`Effect.p`.as(`parentP`))
		.select(sql<number>`Effect.q`.as(`parentQ`))
		.select(sql<number>`Effect.pCount`.as(`parentPCount`))
		.selectAll('Post')
		.selectAll('FullScore')
		.select(eb =>
			eb.fn.coalesce(sql<number>`replies`, sql<number>`0`).as('nReplies'),
		)
		// .orderBy('FullScore.score', 'desc')
		// .where('ScoredPost.parentId', '=', parentId)
		.limit(MAX_RESULTS)

	// Sort by relative entropy (strength of effect on target) or in case of tie, on score
	const immediateChildren = (await query.execute()).sort(
		(a, b) =>
			// This is the same as the thread_score in score.jl
			relativeEntropy(a.p, a.q) * a.pSize -
				relativeEntropy(b.p, b.q) * b.pSize || a.score - b.score,
	)

	const results: RankedPost[][] = await Promise.all(
		immediateChildren.map(async (post: ScoredPost) => {
			return [
				{
					...post,
					note:
						post.topNoteId == null
							? null
							: await getScoredNoteInternal(tagId, post.topNoteId!),
					parent: post.parentId == null ? null : await getPost(post.parentId!),
					effectOnParent: await getEffectOnParentInternal(tagId, post.id),
				},
				...(await getRankedRepliesInternal(tagId, targetId, post.id)),
			]
		}),
	)

	return results.flat()
}

export async function getRankedTags(): Promise<string[]> {
	return []
}

export type TagPreview = {
	tag: string
	posts: RankedPost[]
	positions: Position[]
}
