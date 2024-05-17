import { type ActionFunctionArgs } from '@remix-run/node'
import { deletePost } from "#app/post.ts"
import { redirect } from "@remix-run/server-runtime"
import { z } from 'zod'
import { zfd } from 'zod-form-data'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

const postDeletionSchema = zfd.formData({
	postId: postIdSchema,
	tag: tagSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()
	const parsedData = postDeletionSchema.parse(formData)

	const postId = parsedData.postId
	const tag = parsedData.tag

	await deletePost(postId)

	return redirect(`/tags/${tag}`)
}
