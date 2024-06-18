import * as Immutable from 'immutable'
import { type Transaction, sql } from 'kysely'
import { MAX_POSTS_PER_PAGE } from '#app/constants.ts'
import { type Effect, type Post, type FullScore } from '#app/db/types.ts' // this is the Database interface we defined earlier
import { type DB } from './db/kysely-types.ts'
import {
	getDescendantCount,
	getDescendants,
	getPost,
	getReplyIds,
} from './post.ts'
import { relativeEntropy } from './utils/entropy.ts'
import { type VoteState, defaultVoteState, getUserVotes } from './vote.ts'

// Post with score and the effect of its top reply
export type ScoredPost = Post & FullScore & { nReplies: number } // TODO: nReplies not needed anymore -> remove

export type FrontPagePost = ScoredPost & { nTransitiveComments: number }

export type RankedPost = ScoredPost & {
	parent: Post | null
	effects: Effect[]
	isCritical: boolean
}

export type ReplyTree = {
	post: ScoredPost
	effect: Effect | null // TODO: move to CommentTreeState
	replies: ReplyTree[]
}

export type ImmutableReplyTree = {
	post: ScoredPost
	effect: Effect | null // TODO: move to CommentTreeState
	replies: Immutable.List<ImmutableReplyTree>
}

export function toImmutableReplyTree(replyTree: ReplyTree): ImmutableReplyTree {
	return {
		...replyTree,
		replies: Immutable.List(replyTree.replies.map(toImmutableReplyTree)),
	}
}

export function addReplyToReplyTree(
	tree: ImmutableReplyTree,
	reply: ImmutableReplyTree,
): ImmutableReplyTree {
	if (reply.post.parentId == tree.post.id) {
		return {
			...tree,
			replies: tree.replies.insert(0, reply),
		}
	}
	return {
		...tree,
		replies: tree.replies.map(child => addReplyToReplyTree(child, reply)),
	}
}

export type CommentTreeState = {
	[key: number]: {
		p: number | null
		voteState: VoteState
		isDeleted: boolean
	}
}

export async function getCommentTreeState(
	trx: Transaction<DB>,
	rootId: number,
	userId: string | null,
): Promise<CommentTreeState> {
	const descendantIds = await getDescendants(trx, rootId)

	const results = await trx
		.selectFrom('Post')
		.leftJoin('FullScore', join =>
			join.onRef('FullScore.postId', '=', 'Post.id'),
		)
		.select([
			'Post.id as postId',
			'FullScore.p as p',
			'Post.deletedAt as deletedAt',
		])
		.where('Post.id', 'in', descendantIds.concat([rootId]))
		.where('p', 'is not', null)
		.execute()

	const userVotes: VoteState[] | undefined = userId
		? await getUserVotes(trx, userId, descendantIds.concat([rootId]))
		: undefined

	let commentTreeState: CommentTreeState = {}
	results.forEach(result => {
		commentTreeState[result.postId] = {
			// We have to use the non-null assertion here because kysely doesn't
			// return values as non-null type even if we filter nulls with a where
			// condition. We can, however, be sure that the values are never null.
			// See: https://kysely.dev/docs/examples/SELECT/not-null
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			p: result.p!,
			voteState:
				userVotes?.find(voteState => voteState.postId == result.postId) ||
				defaultVoteState(result.postId),
			isDeleted: result.deletedAt != null,
		}
	})

	return commentTreeState
}

export function getAllPostIdsInTree(
	tree: ImmutableReplyTree,
): Immutable.List<number> {
	if (tree.replies.size === 0) {
		return Immutable.List([tree.post.id])
	}
	return Immutable.List(tree.replies.flatMap(getAllPostIdsInTree)).insert(
		0,
		tree.post.id,
	)
}

export async function getReplyTree(
	trx: Transaction<DB>,
	postId: number,
	userId: string | null,
): Promise<ReplyTree> {
	const directReplyIds = await getReplyIds(trx, postId)
	const post = await getScoredPost(trx, postId)
	const effect: Effect | undefined =
		post.parentId == null
			? undefined
			: await getEffect(trx, post.parentId, postId)

	// TODO: not necessary because iterating over empty list is trivial
	if (directReplyIds.length === 0) {
		return {
			post: post,
			effect: effect ? effect : null,
			replies: [],
		}
	}
	const effectsOnParent: Effect[] = await getEffects(trx, postId)
	let effectLookup: Map<number, Effect> = new Map<number, Effect>()
	for (const e of effectsOnParent) {
		if (e.commentId == null) {
			continue
		}
		effectLookup.set(e.commentId, e)
	}
	const scoredReplies: ScoredPost[] = await Promise.all(
		directReplyIds.map(async replyId => await getScoredPost(trx, replyId)),
	)
	let scoredRepliesLookup: Map<number, ScoredPost> = new Map<
		number,
		ScoredPost
	>()
	for (const r of scoredReplies) {
		scoredRepliesLookup.set(r.id, r)
	}
	const directReplyIdsSorted = directReplyIds.sort((a, b) => {
		const effectA = effectLookup.get(a)
		const targetPA = effectA ? effectA.p : 0
		const targetQA = effectA ? effectA.q : 0
		const targetPSizeA = effectA ? effectA.pSize : 0

		const effectB = effectLookup.get(b)
		const targetPB = effectB ? effectB.p : 0
		const targetQB = effectB ? effectB.q : 0
		const targetPSizeB = effectB ? effectB.pSize : 0

		const scoredPostA = scoredRepliesLookup.get(a)
		const scoredPostB = scoredRepliesLookup.get(b)
		const scoreA = scoredPostA ? scoredPostA.score : 0
		const scoreB = scoredPostB ? scoredPostB.score : 0

		return (
			relativeEntropy(targetPB, targetQB) * targetPSizeB -
				relativeEntropy(targetPA, targetQA) * targetPSizeA || scoreB - scoreA
		)
	})

	const replies: ReplyTree[] = await Promise.all(
		directReplyIdsSorted.map(
			async replyId => await getReplyTree(trx, replyId, userId),
		),
	)
	return {
		post: post,
		effect: effect ? effect : null,
		replies: replies,
	}
}

export async function getEffect(
	trx: Transaction<DB>,
	postId: number,
	commentId: number,
): Promise<Effect | undefined> {
	const effect: Effect | undefined = await trx
		.selectFrom('Effect')
		.where('postId', '=', postId)
		.where('commentId', '=', commentId)
		.selectAll()
		.executeTakeFirst()
	return effect
}

export async function getScoredPost(
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

export async function getEffects(
	trx: Transaction<DB>,
	postId: number,
): Promise<Effect[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('EffectWithDefault as Effect', join =>
			join.on('Effect.commentId', '=', postId),
		)
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
		.limit(MAX_POSTS_PER_PAGE)

	const scoredPosts = await query.execute()

	const rankedPosts: RankedPost[] = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				parent: post.parentId ? await getPost(trx, post.parentId) : null,
				effects: await getEffects(trx, post.id),
				isCritical: false,
			}
		}),
	)
	return rankedPosts
}

export async function getChronologicalToplevelPosts(
	trx: Transaction<DB>,
): Promise<FrontPagePost[]> {
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
		.limit(MAX_POSTS_PER_PAGE)

	const scoredPosts = await query.execute()

	const res = await Promise.all(
		scoredPosts.map(async post => {
			return {
				...post,
				parent: post.parentId ? await getPost(trx, post.parentId) : null,
				effects: await getEffects(trx, post.id),
				nTransitiveComments: await getDescendantCount(trx, post.id),
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
	postId: number,
	parentId: number,
): Promise<RankedPost[]> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.where('parentId', '=', parentId)
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.innerJoin('EffectWithDefault as Effect', join =>
			join
				.on('Effect.postId', '=', postId)
				.onRef('Effect.commentId', '=', 'Post.id'),
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
		.limit(MAX_POSTS_PER_PAGE)

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
			const effects = await getEffects(trx, post.id)
			const targetEffect: Effect | undefined = effects.find(
				e => e.postId == postId,
			)

			const isCritical = targetEffect
				? targetEffect.topCommentId === targetEffect.commentId
				: false
			return [
				{
					...post,
					parent: post.parentId ? await getPost(trx, post.parentId) : null,
					effects: effects,
					isCritical: isCritical,
				},
				...(await getRankedRepliesInternal(trx, postId, post.id)),
			]
		}),
	)

	return results.flat()
}

export async function getRankedDirectReplies(
	trx: Transaction<DB>,
	postId: number,
) {
	console.log('Direct replies')
	const query = trx
		.selectFrom('Post')
		.innerJoin('EffectWithDefault as Effect', 'Effect.commentId', 'Post.id')
		.innerJoin('ScoreWithDefault as Score', 'Score.postId', 'Effect.commentId')
		.where('Post.parentId', '=', postId)
		.where('Effect.postId', '=', postId)
		.where('Effect.commentId', 'is not', null)
		.select('Effect.commentId as postId')
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
