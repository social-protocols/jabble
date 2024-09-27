import { type Transaction } from 'kysely'
import { MAX_CHARS_PER_QUOTE } from '#app/constants.ts'
import { type CandidateClaim } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { extractClaims } from '../claim-extraction/claim-extraction-client.ts'
import {
	getCandidateClaims,
	insertCandidateClaim,
} from './candidate-claim-repository.ts'
import { insertQuote } from './quote-repository.ts'

export async function getOrCreateCandidateClaims(
	trx: Transaction<DB>,
	artefactId: number,
	quote: string,
): Promise<CandidateClaim[]> {
	invariant(
		quote.length <= MAX_CHARS_PER_QUOTE,
		'Document for claim extraction is content too long',
	)
	invariant(
		quote.length > 0,
		'Document for claim extraction is  content too short',
	)

	const existingQuote = await trx
		.selectFrom('Quote')
		.where('artefactId', '=', artefactId)
		.where('quote', '=', quote)
		.selectAll()
		.executeTakeFirst()

	if (existingQuote) {
		return await getCandidateClaims(trx, artefactId, existingQuote.id)
	}

	const persistedQuote = await insertQuote(trx, artefactId, quote)
	const extractedClaims = await extractClaims(persistedQuote.quote)
	const candidateClaims = await Promise.all(
		extractedClaims.map(async rawClaim => {
			return await insertCandidateClaim(
				trx,
				artefactId,
				persistedQuote.id,
				rawClaim,
			)
		}),
	)

	return candidateClaims
}
