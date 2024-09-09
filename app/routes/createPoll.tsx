import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { createPoll } from '#app/repositories/fact-checking.ts'
import { PollType } from '#app/types/api-types.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const ClaimDtoSchema = z.object({
	context: z.coerce.string(),
	claim: z.coerce.string(),
	pollType: z.nativeEnum(PollType),
})

export const action = async (args: ActionFunctionArgs) => {
	const request = args.request
	const claimDto = ClaimDtoSchema.parse(await request.json())
	const userId: string = await requireUserId(request)

	const post = await db
		.transaction()
		.execute(
			async trx =>
				await createPoll(
					trx,
					userId,
					claimDto.claim,
					claimDto.context,
					null,
					claimDto.pollType,
				),
		)

	return post.id
}
