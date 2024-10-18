import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/database/db.ts'
import { submitClaim } from '#app/modules/claims/claim-service.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const claimDtoSchema = z.object({
	quoteId: z.coerce.number(),
	claimContent: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId: string = await requireUserId(request)
	const claimDto = claimDtoSchema.parse(await request.json())
	return await db
		.transaction()
		.execute(
			async trx =>
				await submitClaim(trx, claimDto.quoteId, claimDto.claimContent, userId),
		)
}
