import * as Immutable from 'immutable'
import { type Transaction, sql } from 'kysely'
import { MAX_POSTS_PER_PAGE } from '#app/constants.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import { getEffect } from '#app/modules/scoring/effect-repository.ts'
import { getUserVotes } from '#app/modules/scoring/vote-repository.ts'
import { defaultVoteState } from '#app/modules/scoring/vote-service.ts'
import {
	type Effect,
	type VoteState,
	type ReplyTree,
	type ImmutableReplyTree,
	type CommentTreeState,
	type FrontPagePost,
	type PollType,
	type PollPagePost,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { type DB } from '../types/kysely-types.ts'
import { relativeEntropy } from '../utils/entropy.ts'
import {
	getDescendantCount,
	getDescendantIds,
	getPost,
	getReplyIds,
	getPostWithScore,
	getFallacies,
} from './post.ts'

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
	const descendantIds = await getDescendantIds(trx, targetPostId)

	const results = await trx
		.selectFrom('Post')
		.leftJoin('FullScore', join =>
			join.onRef('FullScore.postId', '=', 'Post.id'),
		)
		.select([
			'Post.id as postId',
			'FullScore.p as p',
			'FullScore.oSize as voteCount',
			'Post.deletedAt as deletedAt',
			'FullScore.criticalThreadId',
		])
		.where('Post.id', 'in', descendantIds.concat([targetPostId]))
		.where('p', 'is not', null)
		.execute()

	const userVotes: VoteState[] | undefined = userId
		? await getUserVotes(trx, userId, descendantIds.concat([targetPostId]))
		: undefined

	const criticalCommentIdToTargetId: { [key: number]: number[] } = {}
	results.forEach(res => {
		const criticalThreadId = res.criticalThreadId
		if (criticalThreadId !== null) {
			const entry = criticalCommentIdToTargetId[criticalThreadId]
			if (entry !== undefined) {
				entry.push(res.postId)
			} else {
				criticalCommentIdToTargetId[criticalThreadId] = [res.postId]
			}
		}
	})

	let commentTreeState: CommentTreeState = {
		targetPostId,
		criticalCommentIdToTargetId,
		posts: {},
	}

	await Promise.all(
		results.map(async result => {
			commentTreeState.posts[result.postId] = {
				criticalCommentId: result.criticalThreadId,
				// We have to use the non-null assertion here because kysely doesn't
				// return values as non-null type even if we filter nulls with a where
				// condition. We can, however, be sure that the values are never null.
				// See: https://kysely.dev/docs/examples/SELECT/not-null
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				p: result.p!,
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				voteCount: result.voteCount!,
				voteState:
					userVotes?.find(voteState => voteState.postId == result.postId) ||
					defaultVoteState(result.postId),
				effectOnTargetPost:
					(await getEffect(trx, targetPostId, result.postId)) ?? null,
				isDeleted: result.deletedAt != null,
			}
		}),
	)

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
	commentTreeState: CommentTreeState,
): Promise<ReplyTree> {
	const directReplyIds = await getReplyIds(trx, postId)
	const post = await getPostWithScore(trx, postId)

	const replies: ReplyTree[] = await Promise.all(
		// Recursively get all subtrees.
		// Stopping criterion: Once we reach a leaf node, its replies will be an
		// empty array, so the Promise.all will resolve immediately.
		directReplyIds.map(
			async replyId =>
				await getReplyTree(trx, replyId, userId, commentTreeState),
		),
	)

	// Sort replies by EffectSize on targetPost
	// (in-place sort)
	replies.sort((a, b) => {
		const effectA = commentTreeState.posts[a.post.id]?.effectOnTargetPost
		const effectB = commentTreeState.posts[b.post.id]?.effectOnTargetPost
		invariant(
			effectA !== undefined,
			`post ${a.post.id} not found in commentTreeState`,
		)
		invariant(
			effectB !== undefined,
			`post ${b.post.id} not found in commentTreeState`,
		)
		if (effectA != null) {
			invariant(
				effectA.commentId == a.post.id,
				`Wrong effect source ${effectA.commentId}. Should be ${a.post.id}`,
			)
			invariant(
				effectA.postId == commentTreeState.targetPostId,
				`Found effect on ${effectA.postId}. Required effect on ${commentTreeState.targetPostId}`,
			)
		}
		if (effectB != null) {
			invariant(
				effectB.commentId == b.post.id,
				`Wrong effect source ${effectB.commentId}. Should be ${b.post.id}`,
			)
			invariant(
				effectB.postId == commentTreeState.targetPostId,
				`Found effect on ${effectB.postId}. Required effect on ${commentTreeState.targetPostId}`,
			)
		}
		const effectSizeA = effectSizeOnTarget(effectA)
		const effectSizeB = effectSizeOnTarget(effectB)

		const tieBreaker = b.post.score - a.post.score
		return effectSizeB - effectSizeA || tieBreaker
	})

	return {
		post: post,
		fallacyList: await getFallacies(trx, postId),
		replies: replies,
	}
}

export function effectSizeOnTarget(effectOnTarget: Effect | null): number {
	const targetP = effectOnTarget?.p ?? 0
	const targetQ = effectOnTarget?.q ?? 0
	const targetPSize = effectOnTarget?.pSize ?? 0
	return relativeEntropy(targetP, targetQ) * targetPSize
}

export async function getChronologicalToplevelPosts(
	trx: Transaction<DB>,
): Promise<FrontPagePost[]> {
	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('Poll', 'Poll.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.where('Poll.pollType', 'is', null)
		.selectAll('Post')
		.selectAll('FullScore')
		.selectAll('Poll')
		.select(sql<number>`replies`.as('nReplies'))
		.orderBy('Post.createdAt', 'desc')
		.limit(MAX_POSTS_PER_PAGE)

	const scoredPosts = await query.execute()

	const res = await Promise.all(
		scoredPosts.map(async post => {
			return {
				id: post.id,
				parentId: post.parentId,
				content: post.content,
				createdAt: post.createdAt,
				deletedAt: post.deletedAt,
				isPrivate: post.isPrivate,
				pollType: post.pollType ? (post.pollType as PollType) : null,
				parent: post.parentId ? await getPost(trx, post.parentId) : null,
				fallacyList: await getFallacies(trx, post.id),
				oSize: post.oSize,
				nTransitiveComments: await getDescendantCount(trx, post.id),
				p: post.p,
			}
		}),
	)

	return res
}

export async function getChronologicalPolls(
	trx: Transaction<DB>,
): Promise<PollPagePost[]> {
	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', join =>
			join.onRef('PostStats.postId', '=', 'Post.id'),
		)
		.leftJoin('ClaimToArtefact', 'ClaimToArtefact.claimId', 'Poll.claimId')
		.leftJoin('Artefact', 'Artefact.id', 'ClaimToArtefact.artefactId')
		.leftJoin('Quote', 'Quote.artefactId', 'Artefact.id')
		.where('Poll.pollType', 'is not', null)
		.selectAll('Post')
		.selectAll('FullScore')
		.selectAll('Poll')
		.select(['Artefact.id as artefactId', 'Quote.id as quoteId'])
		.select(sql<number>`replies`.as('nReplies'))
		.orderBy('Post.createdAt', 'desc')
		.limit(MAX_POSTS_PER_PAGE)

	const scoredPosts = await query.execute()

	const res = await Promise.all(
		scoredPosts.map(async post => {
			return {
				id: post.id,
				parentId: post.parentId,
				content: post.content,
				createdAt: post.createdAt,
				deletedAt: post.deletedAt,
				isPrivate: post.isPrivate,
				pollType: post.pollType ? (post.pollType as PollType) : null,
				context: post.artefactId
					? {
							artefact: await getArtefact(trx, post.artefactId),
							quote: post.quoteId ? await getQuote(trx, post.quoteId) : null,
						}
					: null,
				oSize: post.oSize,
				nTransitiveComments: await getDescendantCount(trx, post.id),
				p: post.p,
			}
		}),
	)

	return res
}
