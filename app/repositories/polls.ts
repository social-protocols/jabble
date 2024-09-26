import { sql, type Transaction } from 'kysely'
import {
	createPost,
	getDescendantCount,
	getPost,
} from '#app/repositories/post.ts'
import {
	type Quote,
	type Artefact,
	type Claim,
	type PollType,
	type Post,
	type PollPagePost,
} from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import {
	getCandidateClaim,
	updatePostIdOnCandidateClaim,
} from './claim-extraction.ts'

export async function getOrCreateArtefact(
	trx: Transaction<DB>,
	url: string,
): Promise<Artefact> {
	const existingArtefact: Artefact | undefined = await trx
		.selectFrom('Artefact')
		.where('url', '=', url)
		.selectAll()
		.executeTakeFirst()

	if (existingArtefact !== undefined) {
		return existingArtefact
	}

	const createdArtefact = await trx
		.insertInto('Artefact')
		.values({
			url: url,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: createdArtefact.id,
		url: createdArtefact.url,
		createdAt: createdArtefact.createdAt,
	}
}

export async function getArtefact(
	trx: Transaction<DB>,
	id: number,
): Promise<Artefact> {
	const result = await trx
		.selectFrom('Artefact')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirstOrThrow()

	return {
		id: result.id,
		url: result.url,
		createdAt: result.createdAt,
	}
}

export async function getOrCreateQuote(
	trx: Transaction<DB>,
	artefactId: number,
	quote: string,
): Promise<Quote> {
	const existingQuote: Quote | undefined = await trx
		.selectFrom('Quote')
		.where('quote', '=', quote)
		.where('artefactId', '=', artefactId)
		.selectAll()
		.executeTakeFirst()

	if (existingQuote !== undefined) {
		return existingQuote
	}

	return await trx
		.insertInto('Quote')
		.values({
			artefactId: artefactId,
			quote: quote,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function getQuote(
	trx: Transaction<DB>,
	id: number,
): Promise<Quote> {
	const result = await trx
		.selectFrom('Quote')
		.where('id', '=', id)
		.selectAll()
		.executeTakeFirstOrThrow()

	return {
		id: result.id,
		artefactId: result.artefactId,
		quote: result.quote,
		createdAt: result.createdAt,
	}
}

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
