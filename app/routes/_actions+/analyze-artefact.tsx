import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { extractClaims } from '#app/repositories/fact-checking.ts'
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
	const artefact = await db.transaction().execute(async trx => {
		const persistedArtefact = await getOrCreateArtefact(
			trx,
			quoteDto.url,
			quoteDto.description,
		)
		await getOrCreateQuote(trx, persistedArtefact.id, quoteDto.quote)
		return persistedArtefact
	})
	return await extractClaims(artefact.id, quoteDto.quote)
}
