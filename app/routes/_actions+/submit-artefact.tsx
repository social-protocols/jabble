import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/database/db.ts'
import { submitArtefact } from '#app/modules/claims/claim-service.ts'

const artefactDtoSchema = z.object({
	url: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const artefactDto = artefactDtoSchema.parse(await request.json())
	return await db
		.transaction()
		.execute(async trx => await submitArtefact(trx, artefactDto.url))
}
