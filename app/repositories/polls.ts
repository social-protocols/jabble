import { type Transaction } from 'kysely'
import { createPost, getPost } from '#app/repositories/post.ts'
import {
	type Artefact,
	type Claim,
	type PollType,
	type Post,
} from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'

export async function createArtefact(
	trx: Transaction<DB>,
	url: string,
	description: string | null,
	quote: string | null,
): Promise<Artefact> {
	const createdArtefact = await trx
		.insertInto('Artefact')
		.values({
			url: url,
			description: description,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	if (quote !== null) {
		await trx
			.insertInto('Quote')
			.values({
				artefactId: createdArtefact.id,
				quote: quote,
			})
			.execute()
	}

	return {
		id: createdArtefact.id,
		url: createdArtefact.url,
		description: createdArtefact.description,
		createdAt: createdArtefact.createdAt,
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

export async function createPoll(
	trx: Transaction<DB>,
	userId: string,
	claim: string,
	artefactId: number | null,
	pollType: PollType,
): Promise<Post> {
	const persistedClaim = await createClaim(trx, claim)

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
