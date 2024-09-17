import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { getOrCreateArtefact } from '#app/repositories/polls.ts'

const ArtefactDtoSchema = z.object({
	url: z.string(),
	description: z.string().nullable(),
	quote: z.string().nullable(),
})

export const action = async (args: ActionFunctionArgs) => {
	const request = args.request
	const artefactDto = ArtefactDtoSchema.parse(await request.json())
	return await db
		.transaction()
		.execute(
			async trx =>
				await getOrCreateArtefact(
					trx,
					artefactDto.url,
					artefactDto.description,
					artefactDto.quote,
				),
		)
}
