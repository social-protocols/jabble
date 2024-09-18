import { type Transaction } from 'kysely'
import { createPost, getPost } from '#app/repositories/post.ts'
import {
	type Quote,
	type Artefact,
	type Claim,
	type PollType,
	type Post,
} from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { getCandidateClaim } from './fact-checking.ts'

export async function getOrCreateArtefact(
	trx: Transaction<DB>,
	url: string,
	description: string | null,
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
			description: description,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	return {
		id: createdArtefact.id,
		url: createdArtefact.url,
		description: createdArtefact.description,
		createdAt: createdArtefact.createdAt,
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

export async function createPoll(
	trx: Transaction<DB>,
	userId: string,
	candidateClaimId: number,
	artefactId: number | null,
	pollType: PollType,
): Promise<Post> {
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

	const postId = await createPost(trx, null, persistedClaim.claim, userId, {
		isPrivate: false,
		withUpvote: false,
	})

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
