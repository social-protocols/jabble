import { type Transaction } from 'kysely'
import { type CandidateClaim } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'

export async function insertCandidateClaim(
	trx: Transaction<DB>,
	artefactId: number,
	quoteId: number,
	claim: string,
): Promise<CandidateClaim> {
	return await trx
		.insertInto('CandidateClaim')
		.values({
			artefactId: artefactId,
			quoteId: quoteId,
			claim: claim,
		})
		.returningAll()
		.executeTakeFirstOrThrow()
}

export async function getCandidateClaims(
	trx: Transaction<DB>,
	artefactId: number,
	quoteId: number,
): Promise<CandidateClaim[]> {
	return await trx
		.selectFrom('CandidateClaim')
		.where('artefactId', '=', artefactId)
		.where('quoteId', '=', quoteId)
		.selectAll()
		.execute()
}

export async function getCandidateClaim(
	trx: Transaction<DB>,
	candidateClaimId: number,
): Promise<CandidateClaim> {
	return await trx
		.selectFrom('CandidateClaim')
		.where('id', '=', candidateClaimId)
		.selectAll()
		.executeTakeFirstOrThrow()
}

export async function updatePostIdOnCandidateClaim(
	trx: Transaction<DB>,
	candidateClaimId: number,
	postId: number,
): Promise<CandidateClaim> {
	return await trx
		.updateTable('CandidateClaim')
		.set({ postId: postId })
		.where('id', '=', candidateClaimId)
		.returningAll()
		.executeTakeFirstOrThrow()
}
