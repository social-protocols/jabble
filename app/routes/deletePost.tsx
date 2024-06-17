import { type ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/server-runtime'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { db } from '#app/db.ts'
import { deletePost } from '#app/post.ts'
import { invariant } from '#app/utils/misc.tsx'
import { getUserId } from '#app/utils/auth.server.ts'

const postIdSchema = z.coerce.number()
const postDeletionSchema = zfd.formData({ postId: postIdSchema })

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId = await getUserId(request)
	invariant(userId, `No authenticated user, got userId ${userId}`)

	const formData = await request.formData()
	const parsedData = postDeletionSchema.parse(formData)
	const postId = parsedData.postId

	await db.transaction().execute(async trx => deletePost(trx, postId, userId))

	return redirect(`/post/${postId}`)
}
