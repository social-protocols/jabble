import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { submitArtefactWithQuote } from '#app/modules/claims/claim-service.ts'

const artefactDtoSchema = z.object({
	url: z.coerce.string(),
	quote: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const artefactDto = artefactDtoSchema.parse(await request.json())
	return await db
		.transaction()
		.execute(
			async trx =>
				await submitArtefactWithQuote(trx, artefactDto.url, artefactDto.quote),
		)
}
