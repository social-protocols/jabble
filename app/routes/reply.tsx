import { type ActionFunctionArgs, redirect } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/db.ts'
import { createPost } from '#app/post.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const replySchema = zfd.formData({
	parentId: z.coerce.number().optional(),
	content: z.coerce.string(),
	isPrivate: z.coerce.number(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const userId: string = await requireUserId(request)

	const parsedData = replySchema.parse(formData)

	const content = parsedData.content
	const parentId = parsedData.parentId || null
	const isPrivate = Boolean(parsedData.isPrivate)

	invariant(content, 'content !== undefined')

	let postId = await db
		.transaction()
		.execute(async trx => createPost(trx, parentId, content, userId, { isPrivate: isPrivate, withUpvote: true }))

	return redirect(`/post/${postId}`)
}
