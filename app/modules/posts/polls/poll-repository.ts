import { sql, type Transaction } from 'kysely'
import { type DB } from '#app/database/types.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import {
	getClaim,
	updatePostIdOnClaim,
} from '#app/modules/claims/claim-repository.ts'
import { getClaimContextByPollPostId } from '#app/modules/claims/claim-service.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import {
	getDescendantCount,
	getPost,
} from '#app/modules/posts/post-repository.ts'
import { createPost } from '#app/modules/posts/post-service.ts'
import { type Poll, type FrontPagePoll, type PollType } from '../post-types.ts'

export async function getOrCreatePoll(
	trx: Transaction<DB>,
	userId: string,
	claimId: number,
	pollType: PollType,
): Promise<Poll> {
	const existingPoll = await trx
		.selectFrom('Post')
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('Claim', 'Claim.postId', 'Post.id')
		.where('Claim.id', '=', claimId)
		.where('Poll.pollType', '=', pollType)
		.selectAll('Post')
		.select(['Poll.pollType as pollType'])
		.executeTakeFirst()

	if (existingPoll !== undefined) {
		return {
			id: existingPoll.id,
			parentId: existingPoll.parentId,
			content: existingPoll.content,
			createdAt: existingPoll.createdAt,
			deletedAt: existingPoll.deletedAt,
			isPrivate: existingPoll.isPrivate,
			pollType: existingPoll.pollType as PollType,
			context: await getClaimContextByPollPostId(trx, existingPoll.id),
		}
	}

	const claim = await getClaim(trx, claimId)

	// TODO: createPost should return the entire post
	const postId = await createPost(trx, null, claim.claim, userId, {
		isPrivate: false,
		withUpvote: false,
	})

	await updatePostIdOnClaim(trx, claimId, postId)

	await trx
		.insertInto('Poll')
		.values({
			claimId: claimId,
			postId: postId,
			pollType: pollType,
		})
		.execute()

	const persistedPost = await getPost(trx, postId)
	return {
		id: persistedPost.id,
		parentId: persistedPost.parentId,
		content: persistedPost.content,
		createdAt: persistedPost.createdAt,
		deletedAt: persistedPost.deletedAt,
		isPrivate: persistedPost.isPrivate,
		pollType: pollType,
		context: await getClaimContextByPollPostId(trx, persistedPost.id),
	}
}

export async function getPollByPostId(
	trx: Transaction<DB>,
	pollPostId: number,
): Promise<Poll> {
	const result = await trx
		.selectFrom('Post')
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.where('Post.id', '=', pollPostId)
		.selectAll('Post')
		.select('Poll.pollType as pollType')
		.executeTakeFirstOrThrow()

	return {
		...result,
		pollType: result.pollType as PollType,
		context: await getClaimContextByPollPostId(trx, pollPostId),
	}
}

export async function getFrontPagePoll(
	trx: Transaction<DB>,
	postId: number,
): Promise<FrontPagePoll> {
	// TODO: check whether the post is actually a poll

	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.where('Post.id', '=', postId)
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

	const result = await query.executeTakeFirstOrThrow()

	return {
		id: result.id,
		parentId: result.parentId,
		content: result.content,
		createdAt: result.createdAt,
		deletedAt: result.deletedAt,
		isPrivate: result.isPrivate,
		pollType: result.pollType as PollType,
		context: result.artefactId
			? {
					artefact: await getArtefact(trx, result.artefactId),
					quote: result.quoteId ? await getQuote(trx, result.quoteId) : null,
				}
			: null,
		oSize: result.oSize,
		nTransitiveComments: await getDescendantCount(trx, result.id),
		p: result.p,
	}
}
