import * as Immutable from 'immutable'
import { type Transaction, sql } from 'kysely'
import {
	type VoteState,
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
	getPostWithOSizeAndScore,
} from './post.ts'
import { relativeEntropy } from './utils/entropy.ts'
import { defaultVoteState, getUserVotes } from './vote.ts'

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
): Promise<ReplyTree> {
	const directReplyIds = await getReplyIds(trx, postId)

	const post = await getPostWithOSizeAndScore(trx, postId)

	const effect: DBEffect | undefined =
		post.parentId == null
			? undefined
			: await getEffect(trx, post.parentId, postId)

	const replies: ReplyTree[] = await Promise.all(
		// Stopping criterion: Once we reach a leaf node, its replies will be an
		// empty array, so the Promise.all will resolve immediately.
		directReplyIds.map(
			async replyId => await getReplyTree(trx, replyId, userId),
		),
	).then(replyTrees => {
		return replyTrees.sort((a, b) => {
			const targetPA = a.effect ? a.effect.p : 0
			const targetQA = a.effect ? a.effect.q : 0
			const targetPSizeA = a.effect ? a.effect.pSize : 0

			const targetPB = b.effect ? b.effect.p : 0
			const targetQB = b.effect ? b.effect.q : 0
			const targetPSizeB = b.effect ? b.effect.pSize : 0

			const scoreA = a.post ? a.post.score : 0
			const scoreB = b.post ? b.post.score : 0

			return (
				relativeEntropy(targetPB, targetQB) * targetPSizeB -
					relativeEntropy(targetPA, targetQA) * targetPSizeA || scoreB - scoreA
			)
		})
	})

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
