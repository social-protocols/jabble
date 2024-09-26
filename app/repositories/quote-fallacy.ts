import { type Transaction } from 'kysely'
import { fallacyDetection } from '#app/modules/fallacies/fallacy-detection-client.ts'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import { type QuoteFallacy } from '#app/types/api-types.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { getQuote } from './quote.ts'

export async function storeQuoteFallacies(
	trx: Transaction<DB>,
	quoteId: number,
	fallacies: FallacyList,
): Promise<QuoteFallacy[]> {
	return await Promise.all(
		fallacies.map(fallacy => {
			return trx
				.insertInto('QuoteFallacy')
				.values({
					quoteId: quoteId,
					name: fallacy.name,
					rationale: fallacy.analysis,
					probability: fallacy.probability,
				})
				.returningAll()
				.executeTakeFirstOrThrow()
		}),
	)
}

export async function getOrDetectQuoteFallacies(
	trx: Transaction<DB>,
	quoteId: number,
): Promise<QuoteFallacy[]> {
	const existingQuoteFallacies = await trx
		.selectFrom('QuoteFallacy')
		.where('QuoteFallacy.quoteId', '=', quoteId)
		.selectAll()
		.execute()

	if (existingQuoteFallacies.length > 0) {
		return existingQuoteFallacies
	}

	const quote = await getQuote(trx, quoteId)
	const detectedFallacies = await fallacyDetection(quote.quote)
	await storeQuoteFallacies(trx, quote.id, detectedFallacies)

	return await getQuoteFallacies(trx, quoteId)
}

export async function getQuoteFallacies(
	trx: Transaction<DB>,
	quoteId: number,
): Promise<QuoteFallacy[]> {
	return await trx
		.selectFrom('QuoteFallacy')
		.where('quoteId', '=', quoteId)
		.selectAll()
		.execute()
}
