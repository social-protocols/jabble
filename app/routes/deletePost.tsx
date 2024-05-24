import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/server-runtime'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/db.js'
import { deletePost } from '#app/post.ts'
import { invariant } from '#app/utils/misc.tsx'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()
const userIdSchema = z.coerce.string().optional()

const postDeletionSchema = zfd.formData({
	postId: postIdSchema,
	tag: tagSchema,
	userId: userIdSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()
	const parsedData = postDeletionSchema.parse(formData)

	const postId = parsedData.postId
	const tag = parsedData.tag
	const userId = parsedData.userId

	invariant(
		userId,
		`Tried deleting post ${postId} from tag ${tag} without a userId`,
	)

	await db.transaction().execute(async trx => deletePost(trx, postId, userId))

	return redirect(`/tags/${tag}/posts/${postId}`)
}
