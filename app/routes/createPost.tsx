import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/server-runtime'
import { sql } from 'kysely'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/db.ts'
import { createPost } from '#app/repositories/post.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

import { fallacyDetection } from '#app/utils/fallacy_detection.ts'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
	isPrivate: z.coerce.number(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.formData())

	const userId: string = await requireUserId(request)
	const detectedFallaciesPromise = fallacyDetection(postData.content)

	const postId = await db.transaction().execute(
		async trx =>
			await createPost(trx, null, postData.content, userId, {
				isPrivate: postData.isPrivate == 1,
				withUpvote: false,
			}),
	)

	try {
		console.log('detecting fallacies...')
		const detectedFallacies = await detectedFallaciesPromise

		await db.transaction().execute(
			async trx =>
				await sql`
        insert into Fallacy (postId, detection)
        values (${postId}, ${JSON.stringify(detectedFallacies)})
      `.execute(trx),
		)
	} catch (error) {
		console.error(error)
	}

	return redirect(`/post/${postId}`)
}
