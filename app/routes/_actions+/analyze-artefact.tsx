import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { extractClaims } from '#app/repositories/claim-extraction.ts'
import { fallacyDetection } from '#app/repositories/fallacy-detection.ts'
import {
	getOrCreateArtefact,
	getOrCreateQuote,
} from '#app/repositories/polls.ts'

const quoteDtoSchema = z.object({
	url: z.coerce.string(),
	description: z.coerce.string().nullable(),
	quote: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const quoteDto = quoteDtoSchema.parse(await request.json())
	const { persistedArtefact, persistedQuote } = await db
		.transaction()
		.execute(async trx => {
			const persistedArtefact = await getOrCreateArtefact(
				trx,
				quoteDto.url,
				quoteDto.description,
			)
			const persistedQuote = await getOrCreateQuote(
				trx,
				persistedArtefact.id,
				quoteDto.quote,
			)
			return { persistedArtefact, persistedQuote }
		})

	const detectedFallacies = await fallacyDetection(persistedQuote.quote)
	const extractedClaims = await extractClaims(
		persistedArtefact.id,
		persistedQuote.id,
		persistedQuote.quote,
	)

	return {
		artefact: persistedArtefact,
		detectedFallacies: detectedFallacies,
		candidateClaims: extractedClaims,
	}
}
