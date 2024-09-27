import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { extractClaims } from '#app/modules/claim-extraction/claim-extraction-client.ts'
import { getOrCreateArtefact } from '#app/modules/claims/artefact-repository.ts'
import { getOrDetectQuoteFallacies } from '#app/modules/claims/quote-fallacy-repository.ts'
import { getOrCreateQuote } from '#app/modules/claims/quote-repository.ts'

const artefactDtoSchema = z.object({
	url: z.coerce.string(),
	quote: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const artefactDto = artefactDtoSchema.parse(await request.json())

	const { persistedArtefact, persistedQuote } = await db
		.transaction()
		.execute(async trx => {
			const persistedArtefact = await getOrCreateArtefact(trx, artefactDto.url)
			const persistedQuote = await getOrCreateQuote(
				trx,
				persistedArtefact.id,
				artefactDto.quote,
			)
			await getOrDetectQuoteFallacies(trx, persistedQuote.id)
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