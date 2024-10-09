import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { submitQuote } from '#app/modules/claims/claim-service.ts'

const artefactDtoSchema = z.object({
	artefactId: z.coerce.number(),
	quoteContent: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const artefactDto = artefactDtoSchema.parse(await request.json())
	return await db
		.transaction()
		.execute(
			async trx =>
				await submitQuote(
					trx,
					artefactDto.artefactId,
					artefactDto.quoteContent,
				),
		)
}
