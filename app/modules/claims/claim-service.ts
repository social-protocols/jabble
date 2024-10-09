import { type Transaction } from 'kysely'
import { MAX_CHARS_PER_QUOTE } from '#app/constants.ts'
import { type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { extractTweetTextGraphQL, isValidTweetUrl, parseTweetURL } from '#app/utils/tweet_extraction.server.ts'
import { extractClaims } from '../claim-extraction/claim-extraction-client.ts'
import { fallacyDetection } from '../fallacies/fallacy-detection-client.ts'
import { getArtefact, getOrCreateArtefact } from './artefact-repository.ts'
import { getClaims, insertClaim } from './claim-repository.ts'
import { type Claim, type Artefact, type Quote } from './claim-types.ts'
import { storeQuoteFallacies } from './quote-fallacy-repository.ts'
import { insertQuote } from './quote-repository.ts'

export async function submitArtefact(
	trx: Transaction<DB>,
	url: string,
): Promise<{
	artefact: Artefact
	navigateTo: string
}> {
	const artefact = await getOrCreateArtefact(trx, url)

	if (isValidTweetUrl(url)) {
		const tweetId = parseTweetURL(url)

		invariant(tweetId, `Couldn't parse tweet url for url: ${url}`)

		const existingQuote: Quote | undefined = await trx
			.selectFrom('Quote')
			.where('artefactId', '=', artefact.id)
			.selectAll()
			.executeTakeFirst()

		if (existingQuote !== undefined) {
			return {
				artefact: artefact,
				navigateTo: `/artefact/${artefact.id}/quote/${existingQuote.id}`,
			}
		}

		const quoteContent = await extractTweetTextGraphQL(tweetId)
		const persistedQuote = await submitQuote(trx, artefact.id, quoteContent)

		return {
			artefact: artefact,
			navigateTo: `/artefact/${artefact.id}/quote/${persistedQuote.id}`,
		}
	}

	return {
		artefact: artefact,
		navigateTo: `/artefact/${artefact.id}`,
	}
}

export async function submitQuote(
	trx: Transaction<DB>,
	artefactId: number,
	quoteContent: string,
): Promise<Quote> {
	invariant(
		quoteContent.length <= MAX_CHARS_PER_QUOTE,
		'Document for claim extraction is content too long',
	)
	invariant(
		quoteContent.length > 0,
		'Document for claim extraction is  content too short',
	)

	const artefact = await getArtefact(trx, artefactId)

	const existingQuote: Quote | undefined = await trx
		.selectFrom('Quote')
		.where('quote', '=', quoteContent)
		.where('artefactId', '=', artefact.id)
		.selectAll()
		.executeTakeFirst()

	if (existingQuote !== undefined) {
		return existingQuote
	}

	const persistedQuote = await trx
		.insertInto('Quote')
		.values({
			artefactId: artefact.id,
			quote: quoteContent,
		})
		.returningAll()
		.executeTakeFirstOrThrow()

	const extractedClaims = await extractClaims(persistedQuote.quote)
	await Promise.all(
		extractedClaims.map(async rawClaim => {
			return await insertClaim(trx, persistedQuote.id, rawClaim, null)
		}),
	)

	const detectedFallacies = await fallacyDetection(persistedQuote.quote)
	await storeQuoteFallacies(trx, persistedQuote.id, detectedFallacies)

	return persistedQuote
}

export async function getOrCreateClaims(
	trx: Transaction<DB>,
	artefactId: number,
	quote: string,
): Promise<Claim[]> {
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
		return await getClaims(trx, existingQuote.id)
	}

	const persistedQuote = await insertQuote(trx, artefactId, quote)
	const extractedClaims = await extractClaims(persistedQuote.quote)
	const candidateClaims = await Promise.all(
		extractedClaims.map(async rawClaim => {
			return await insertClaim(trx, persistedQuote.id, rawClaim, null)
		}),
	)

	return candidateClaims
}
