import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { createFactCheck } from '#app/repositories/fact-checking.ts'

const ClaimDtoSchema = z.object({
	context: z.coerce.string(),
	claim: z.coerce.string(),
	factOrOpinion: z.coerce.string(),
	verifiableOrDebatable: z.coerce.string(),
	containsJudgment: z.coerce.boolean(),
})

export const action = async (args: ActionFunctionArgs) => {
	const request = args.request
	const claimDto = ClaimDtoSchema.parse(await request.json())
	const userId: string = await requireUserId(request)

	const post = await db
		.transaction()
		.execute(
			async trx =>
				await createFactCheck(
					trx,
					userId,
					claimDto.claim,
					claimDto.context,
					null,
				),
		)

	return post.id
}
