import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { createPoll } from '#app/repositories/polls.ts'
import { PollType } from '#app/types/api-types.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const PollCreationDtoSchema = z.object({
	candidateClaimId: z.coerce.number(),
	artefactId: z.coerce.number().nullable(),
	pollType: z.nativeEnum(PollType),
})

export const action = async (args: ActionFunctionArgs) => {
	const request = args.request
	const claimDto = PollCreationDtoSchema.parse(await request.json())
	const userId: string = await requireUserId(request)

	const post = await db
		.transaction()
		.execute(
			async trx =>
				await createPoll(
					trx,
					userId,
					claimDto.candidateClaimId,
					claimDto.artefactId,
					claimDto.pollType,
				),
		)

	return post.id
}
