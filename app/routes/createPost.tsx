import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/server-runtime'
import { db } from '#app/db.ts'
import { createPost } from '#app/post.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
	isPrivate: z.coerce.number(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.formData())

	const userId: string = await requireUserId(request)

	const postId = await db.transaction().execute(
		async trx =>
			await createPost(trx, null, postData.content, userId, {
				isPrivate: postData.isPrivate == 1,
				withUpvote: true,
			}),
	)

	return redirect(`/post/${postId}`)
}

