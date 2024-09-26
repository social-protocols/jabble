import { sql, type Transaction } from 'kysely'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import {
	getCandidateClaim,
	updatePostIdOnCandidateClaim,
} from '#app/modules/claims/candidate-claim-repository.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import {
	getDescendantCount,
	getPost,
} from '#app/modules/posts/post-repository.ts'
import { createPost } from '#app/modules/posts/post-service.ts'
import {
	type Claim,
	type PollType,
	type Post,
	type PollPagePost,
} from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'

export async function createClaim(
	trx: Transaction<DB>,
	claim: string,
): Promise<Claim> {
	const createdClaim = await trx
		.insertInto('Claim')
		.values({ claim })
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: createdClaim.id,
		claim: createdClaim.claim,
	}
}

export async function getOrCreatePoll(
	trx: Transaction<DB>,
	userId: string,
	candidateClaimId: number,
	artefactId: number | null,
	pollType: PollType,
): Promise<Post> {
	const existingPoll = await trx
		.selectFrom('Post')
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('CandidateClaim', 'CandidateClaim.postId', 'Post.id')
		.where('CandidateClaim.artefactId', '=', artefactId)
		.where('CandidateClaim.id', '=', candidateClaimId)
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
		}
	}

	const candidateClaim = await getCandidateClaim(trx, candidateClaimId)
	const persistedClaim = await createClaim(trx, candidateClaim.claim)

	if (artefactId !== null) {
		await trx
			.insertInto('ClaimToArtefact')
			.values({
				claimId: persistedClaim.id,
				artefactId: artefactId,
			})
			.execute()
	}

	// TODO: createPost should return the entire post
	const postId = await createPost(trx, null, persistedClaim.claim, userId, {
		isPrivate: false,
		withUpvote: false,
	})

	await updatePostIdOnCandidateClaim(trx, candidateClaimId, postId)

	await trx
		.insertInto('Poll')
		.values({
			claimId: persistedClaim.id,
			postId: postId,
			pollType: pollType,
		})
		.execute()

	return await getPost(trx, postId)
}

export async function getPollPost(
	trx: Transaction<DB>,
	postId: number,
): Promise<PollPagePost> {
	// TODO: check whether the post is actually a poll

	let query = trx
		.selectFrom('Post')
		.where('Post.parentId', 'is', null)
		.where('Post.deletedAt', 'is', null)
		.where('Post.id', '=', postId)
		.innerJoin('Poll', 'Poll.postId', 'Post.id')
		.innerJoin('FullScore', 'FullScore.postId', 'Post.id')
		.leftJoin('PostStats', 'PostStats.postId', 'Post.id')
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

	const post = await query.executeTakeFirstOrThrow()

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
}
