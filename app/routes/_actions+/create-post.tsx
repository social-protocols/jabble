import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/server-runtime'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/database/db.ts'
import { fallacyDetection } from '#app/modules/fallacies/fallacy-detection-client.ts'
import { storeFallacies } from '#app/modules/fallacies/fallacy-repository.ts'
import { createPost } from '#app/modules/posts/post-service.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
	isPrivate: z.coerce.number(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.formData())

	const userId: string = await requireUserId(request)
	console.log('detecting fallacies...')
	const detectedFallaciesPromise = fallacyDetection(postData.content)

	const postId = await db.transaction().execute(
		async trx =>
			await createPost(trx, null, postData.content, userId, {
				isPrivate: postData.isPrivate == 1,
				withUpvote: false,
			}),
	)

	try {
		const detectedFallacies = await detectedFallaciesPromise
		await storeFallacies(postId, detectedFallacies)
	} catch (error) {
		console.error(error)
	}

	return redirect(`/post/${postId}`)
}
