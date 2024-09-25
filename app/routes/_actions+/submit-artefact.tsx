import { z } from 'zod'
import {
	type ActionFunctionArgs,
} from '@remix-run/node'
import { db } from '#app/db.ts'
import { getOrCreateArtefact, getOrCreateQuote } from '#app/repositories/polls.ts'
import { fallacyDetection, storeQuoteFallacies } from '#app/repositories/fallacy-detection.ts'
import { extractClaims } from '#app/repositories/claim-extraction.ts'

const artefactDtoSchema = z.object({
	url: z.coerce.string(),
	description: z.coerce.string().nullable(),
	quote: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const artefactDto = artefactDtoSchema.parse(await request.json())

	const {
		persistedArtefact,
		persistedQuote,
	} = await db
		.transaction()
		.execute(async trx => {
			const persistedArtefact = await getOrCreateArtefact(
				trx,
				artefactDto.url,
				artefactDto.description,
			)
			const persistedQuote = await getOrCreateQuote(
				trx,
				persistedArtefact.id,
				artefactDto.quote,
			)
			const detectedFallacies = await fallacyDetection(persistedQuote.quote)
			await storeQuoteFallacies(trx, persistedQuote.id, detectedFallacies)
			return { persistedArtefact, persistedQuote }
		})

	await extractClaims(
		persistedArtefact.id,
		persistedQuote.id,
		persistedQuote.quote,
	)

	return {
		artefact: persistedArtefact,
		quote: persistedQuote,
	}
}

