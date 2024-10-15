import Immutable from 'immutable'
import { type Transaction, sql } from 'kysely'
import { MAX_POSTS_PER_PAGE } from '#app/constants.ts'
import { type DB } from '#app/database/types.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import { getFallacies } from '#app/modules/fallacies/fallacy-repository.ts'
import {
	getDescendantCount,
	getDescendantIds,
	getPost,
	getReplyIds,
} from '#app/modules/posts/post-repository.ts'
import { invariant } from '#app/utils/misc.tsx'
import {
	type VoteState,
	type FrontPagePost,
	type FrontPagePoll,
	type PollType,
} from '../post-types.ts'
import { getEffect } from '../scoring/effect-repository.ts'
import { effectSizeOnTarget } from '../scoring/scoring-utils.ts'
import { getUserVotes } from '../scoring/vote-repository.ts'
import { defaultVoteState } from '../scoring/vote-service.ts'
import {
	type CommentTreeState,
	type ReplyTree,
	type MutableReplyTree,
} from './ranking-types.ts'

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
		])
		.where('Post.id', 'in', descendantIds.concat([targetPostId]))
		.where('p', 'is not', null)
		.execute()

	const userVotes: VoteState[] | undefined = userId
		? await getUserVotes(trx, userId, descendantIds.concat([targetPostId]))
		: undefined

	let commentTreeState: CommentTreeState = {
		targetPostId,
		posts: {},
	}

	await Promise.all(
		results.map(async result => {
			commentTreeState.posts[result.postId] = {
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

export function getAllPostIdsInTree(tree: ReplyTree): Immutable.List<number> {
	if (tree.replies.size === 0) {
		return Immutable.List([tree.post.id])
	}
	return Immutable.List(tree.replies.flatMap(getAllPostIdsInTree)).insert(
		0,
		tree.post.id,
	)
}

export async function getMutableReplyTree(
	trx: Transaction<DB>,
	postId: number,
	userId: string | null,
	commentTreeState: CommentTreeState,
): Promise<MutableReplyTree> {
	const directReplyIds = await getReplyIds(trx, postId)
	const post = await getPost(trx, postId)
	const score: number = await trx
		.selectFrom('FullScore')
		.where('FullScore.postId', '=', postId)
		.select('score')
		.executeTakeFirstOrThrow()
		.then(row => row.score)

	const replies: MutableReplyTree[] = await Promise.all(
		// Recursively get all subtrees.
		// Stopping criterion: Once we reach a leaf node, its replies will be an
		// empty array, so the Promise.all will resolve immediately.
		directReplyIds.map(
			async replyId =>
				await getMutableReplyTree(trx, replyId, userId, commentTreeState),
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

		const tieBreaker = b.score - a.score
		return effectSizeB - effectSizeA || tieBreaker
	})

	return {
		post: post,
		score: score,
		fallacyList: await getFallacies(trx, postId),
		replies: replies,
	}
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
): Promise<FrontPagePoll[]> {
	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', 'PostStats.postId', 'Post.id')
		.leftJoin('Claim', 'Claim.postId', 'Post.id')
		.leftJoin('Quote', 'Quote.id', 'Claim.quoteId')
		.leftJoin('Artefact', 'Artefact.id', 'Quote.artefactId')
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
