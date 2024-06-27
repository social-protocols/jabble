import * as Immutable from 'immutable'
import { type Transaction, sql } from 'kysely'
import {
	type VoteState,
	type PostWithOSize,
	type StatsPost,
	type Post,
	type Effect,
	type ReplyTree,
	type ImmutableReplyTree,
	type CommentTreeState,
	type FrontPagePost,
} from '#app/api-types.ts'
import { MAX_POSTS_PER_PAGE } from '#app/constants.ts'
import { type DB } from './db/kysely-types.ts'
import { type DBEffect } from './db/types.ts'
import {
	getDescendantCount,
	getDescendants,
	getPost,
	getReplyIds,
} from './post.ts'
import { relativeEntropy } from './utils/entropy.ts'
import { defaultVoteState, getUserVotes } from './vote.ts'

export function toImmutableReplyTree(
	replyTree: ReplyTree,
): ImmutableReplyTree {
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

export async function getCommentTreeState(
	trx: Transaction<DB>,
	targetPostId: number,
	userId: string | null,
): Promise<CommentTreeState> {
	const descendantIds = await getDescendants(trx, targetPostId)

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
		.where('Post.id', 'in', descendantIds.concat([targetPostId]))
		.where('p', 'is not', null)
		.execute()

	const criticalCommentId = (
		await trx
			.selectFrom('FullScore')
			.where('postId', '=', targetPostId)
			.select('criticalThreadId')
			.executeTakeFirstOrThrow()
	).criticalThreadId

	const userVotes: VoteState[] | undefined = userId
		? await getUserVotes(trx, userId, descendantIds.concat([targetPostId]))
		: undefined

	let commentTreeState: CommentTreeState = { criticalCommentId, posts: {} }
	results.forEach(result => {
		commentTreeState.posts[result.postId] = {
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
	indent: number = 0,
): Promise<ReplyTree> {

	const directReplyIds = await getReplyIds(trx, postId)

	const post = await getApiPostWithOSize(trx, postId)

	const effect: DBEffect | undefined =
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
	// const effectsOnParent: Effect[] = await getEffects(trx, postId)

	// let effectLookup: Map<number, Effect> = new Map<number, Effect>()
	// for (const e of effectsOnParent) {
	// 	if (e.commentId == null) {
	// 		continue
	// 	}
	// 	effectLookup.set(e.commentId, e)
	// }
	// const scoredReplies: ScoredPost[] = await Promise.all(
	// 	directReplyIds.map(async replyId => await getScoredPost(trx, replyId)),
	// )

	// let scoredRepliesLookup: Map<number, ScoredPost> = new Map<
	// 	number,
	// 	ScoredPost
	// >()
	// for (const r of scoredReplies) {
	// 	scoredRepliesLookup.set(r.id, r)
	// }
	// const directReplyIdsSorted = directReplyIds.sort((a, b) => {
	// 	const effectA = effectLookup.get(a)
	// 	const targetPA = effectA ? effectA.p : 0
	// 	const targetQA = effectA ? effectA.q : 0
	// 	const targetPSizeA = effectA ? effectA.pSize : 0

	// 	const effectB = effectLookup.get(b)
	// 	const targetPB = effectB ? effectB.p : 0
	// 	const targetQB = effectB ? effectB.q : 0
	// 	const targetPSizeB = effectB ? effectB.pSize : 0

	// 	const scoredPostA = scoredRepliesLookup.get(a)
	// 	const scoredPostB = scoredRepliesLookup.get(b)
	// 	const scoreA = scoredPostA ? scoredPostA.score : 0
	// 	const scoreB = scoredPostB ? scoredPostB.score : 0

	// 	return (
	// 		relativeEntropy(targetPB, targetQB) * targetPSizeB -
	// 			relativeEntropy(targetPA, targetQA) * targetPSizeA || scoreB - scoreA
	// 	)
	// })

	const replies: ReplyTree[] = await Promise.all(
		directReplyIds.map(
			async replyId => await getReplyTree(trx, replyId, userId, indent + 1),
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
): Promise<DBEffect | undefined> {
	const effect: DBEffect | undefined = await trx
		.selectFrom('Effect')
		.where('postId', '=', postId)
		.where('commentId', '=', commentId)
		.selectAll()
		.executeTakeFirst()
	return effect
}

export async function getApiPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<Post> {
	return await trx
		.selectFrom('Post')
		.selectAll('Post')
		.where('Post.id', '=', postId)
		.executeTakeFirstOrThrow()
}

export async function getApiPostWithOSize(
	trx: Transaction<DB>,
	postId: number,
): Promise<PostWithOSize> {
	let query = trx
		.selectFrom('Post')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.selectAll('Post')
		.select('oSize')
		.where('Post.id', '=', postId)

	const scoredPost = await query.executeTakeFirstOrThrow()

	if (scoredPost === undefined) {
		throw new Error(`Failed to read scored post postId=${postId}`)
	}

	return scoredPost
}

export async function getApiStatsPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<StatsPost> {
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
): Promise<DBEffect[]> {
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
