import { type Transaction, sql } from 'kysely'
import { type Effect, type Post, type FullScore } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { type DB } from './db/kysely-types.ts'
import { getPost } from './post.ts'
import { relativeEntropy } from './utils/entropy.ts'

// Post with score and the effect of its top note
export type ScoredPost = Post & FullScore & { nReplies: number }

// Post with its effect on its parent
export type ScoredNote = Post & Effect

export const MAX_RESULTS = 100

export type RankedPost = ScoredPost & {
	note: ScoredNote | null
	parent: Post | null
	effects: Effect[]
	isCritical: boolean
}

export async function getScoredPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<ScoredPost> {
	return getScoredPostInternal(trx, postId)
}

async function getScoredPostInternal(
	trx: Transaction<DB>,
	postId: number,
): Promise<ScoredPost> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(eb =>
			eb.fn.coalesce(sql<number>`replies`, sql<number>`0`).as('nReplies'),
		)
		.where('Post.id', '=', postId)

	const scoredPost = (await query.execute())[0]

	if (scoredPost === undefined) {
		throw new Error(`Failed to read scored post postId=${postId}`)
	}

	return scoredPost
}

export async function getTopNote(
	trx: Transaction<DB>,
	post: ScoredPost,
): Promise<ScoredNote | null> {
	return post.topNoteId !== null
		? getScoredNoteInternal(trx, post.topNoteId)
		: null
}

async function getScoredNoteInternal(
	trx: Transaction<DB>,
	postId: number,
): Promise<ScoredNote> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('Effect', join =>
			join
				.on('Effect.noteId', '=', postId)
				.onRef('Effect.postId', '=', 'Post.parentId'),
		)
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.selectAll('Post')
		.selectAll('Effect')
		.select(sql<number>`replies`.as('nReplies'))
		.where('Post.id', '=', postId)

	const scoredNote = (await query.execute())[0]

	if (scoredNote === undefined) {
		throw new Error(`Failed to read scored post postId=${postId}`)
	}

	return scoredNote
}

export async function getEffects(
	trx: Transaction<DB>,
	postId: number,
): Promise<Effect[]> {
	return await getEffectsInternal(trx, postId)
}

async function getEffectsInternal(
	trx: Transaction<DB>,
	postId: number,
): Promise<Effect[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('Effect', join => join.on('Effect.noteId', '=', postId))
		.innerJoin('Post as TargetPost', 'TargetPost.id', 'Effect.postId')
		.selectAll('Effect')
		.where('Post.id', '=', postId)
		.orderBy('TargetPost.createdAt')

	const effects = await query.execute()
	return effects
}

export async function getRankedPosts(
	trx: Transaction<DB>,
): Promise<RankedPost[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.where('Post.deletedAt', 'is', null)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(eb =>
			eb.fn.coalesce(sql<number>`replies`, sql<number>`0`).as('nReplies'),
		)
		.orderBy('FullScore.score', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts = await query.execute()

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				note: post.topNoteId
					? await getScoredNoteInternal(trx, post.topNoteId)
					: null,
				parent: post.parentId ? await getPost(trx, post.parentId) : null,
				effects: await getEffectsInternal(trx, post.id),
				isCritical: false,
			}
		}),
	)
	return rankedPosts
}

export async function getChronologicalToplevelPosts(
	trx: Transaction<DB>,
): Promise<ScoredPost[]> {
	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.selectAll('Post')
		.selectAll('FullScore')
		.select(sql<number>`replies`.as('nReplies'))
		.orderBy('Post.createdAt', 'desc')
		.limit(MAX_RESULTS)

	const scoredPosts = await query.execute()

	const res = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				parent: post.parentId ? await getPost(trx, post.parentId) : null,
				effects: await getEffectsInternal(trx, post.id),
			}
		}),
	)

	return res
}

export async function getRankedReplies(
	trx: Transaction<DB>,
	parentId: number,
): Promise<RankedPost[]> {
	const tree = await getRankedRepliesInternal(trx, parentId, parentId)
	return tree
}

async function getRankedRepliesInternal(
	trx: Transaction<DB>,
	targetId: number,
	parentId: number,
): Promise<RankedPost[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.where('parentId', '=', parentId)
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.innerJoin('Effect', join =>
			join
				.on('Effect.postId', '=', targetId)
				.onRef('Effect.noteId', '=', 'Post.id'),
		)
		.select(sql<number>`Effect.p`.as(`targetP`))
		.select(sql<number>`Effect.q`.as(`targetQ`))
		.select(sql<number>`Effect.r`.as(`targetR`))
		.select(sql<number>`Effect.pCount`.as(`targetPCount`))
		.select(sql<number>`Effect.pCount`.as(`targetPSize`))
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
			relativeEntropy(a.targetP, a.targetQ) * a.targetPSize -
				relativeEntropy(b.targetP, b.targetQ) * b.targetPSize ||
			a.score - b.score,
	)

	const results: RankedPost[][] = await Promise.all(
		immediateChildren.map(async (post: ScoredPost) => {
			const effects = await getEffectsInternal(trx, post.id)
			const targetEffect: Effect | undefined = effects.find(
				e => e.postId == targetId,
			)

			const isCritical = targetEffect
				? targetEffect.topSubthreadId === targetEffect.noteId
				: false
			return [
				{
					...post,
					note: post.topNoteId
						? await getScoredNoteInternal(trx, post.topNoteId)
						: null,
					parent: post.parentId ? await getPost(trx, post.parentId) : null,
					effects: effects,
					isCritical: isCritical,
				},
				...(await getRankedRepliesInternal(trx, targetId, post.id)),
			]
		}),
	)

	return results.flat()
}

export async function getRankedDirectReplies(
	trx: Transaction<DB>,
	targetId: number,
) {
	const query = trx
		.selectFrom('Post')
		.innerJoin('Effect', 'Effect.noteId', 'Post.id')
		.innerJoin('Score', 'Score.postId', 'Effect.noteId')
		.where('Post.parentId', '=', targetId)
		.where('Effect.postId', '=', targetId)
		.where('Effect.noteId', 'is not', null)
		.select('Effect.noteId as postId')
		.select('Effect.p as targetP')
		.select('Effect.pSize as targetPSize')
		.select('Effect.q as targetQ')
		.select('Effect.qSize as targetQSize')
		.select('Score.score')

	const result = await query.execute()

	const resultSorted = result
		.sort(
			(a, b) =>
				// This is the same as the thread_score in score.jl
				relativeEntropy(a.targetP, a.targetQ === null ? a.targetP : a.targetQ) *
					a.targetPSize -
					relativeEntropy(b.targetP, b.targetQ ? a.targetP : a.targetQ) *
						b.targetPSize || a.score - b.score,
		)
		// reversed because we sort ascending
		.reverse()

	const scoredPosts = await Promise.all(
		resultSorted.map(item => getScoredPost(trx, item.postId as number)),
	)

	return scoredPosts
}
