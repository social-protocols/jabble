import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { createPost } from '#app/repositories/post.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const postDataSchema = z.object({
	claim: z.coerce.string(),
	context: z.coerce.string(),
	factOrOpinion: z.coerce.string(),
	verifiableOrDebatable: z.coerce.string(),
	containsJudgment: z.coerce.boolean(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.json())

	console.log(postData)

	const userId: string = await requireUserId(request)

	const postId = await db.transaction().execute(
		async trx =>
			await createPost(trx, null, postData.claim, userId, {
				isPrivate: false,
				withUpvote: false,
			}),
	)

	return postId
}
