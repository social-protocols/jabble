import { type ActionFunctionArgs, json } from '@remix-run/node'

import invariant from 'tiny-invariant'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { createPost } from '#app/post.ts'
import { getOrInsertTagId } from '#app/tag.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

const replySchema = zfd.formData({
	parentId: z.coerce.number().optional(),
	tag: z.coerce.string(),
	content: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const userId: string = await requireUserId(request)

	const parsedData = replySchema.parse(formData)

	console.log('Reply action', parsedData)

	const content = parsedData.content
	const parentId = parsedData.parentId || null
	const tag = parsedData.tag
	const tagId = await getOrInsertTagId(tag)

	console.log('Got params', parentId, tag, tagId, content)

	invariant(content, 'content !== undefined')
	invariant(tag, "tag !== ''")

	let postId = await createPost(tag, parentId, content, userId, true)

	return json({ postId: postId })
}
