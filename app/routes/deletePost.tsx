import { type ActionFunctionArgs } from '@remix-run/node'
import { db } from '#app/db.ts'
import { deletePost } from '#app/post.ts'
import { getCommentTreeState } from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'

type deleteData = {
	postId: number
	focussedPostId: number | null
}

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId = await getUserId(request)
	invariant(userId, `No authenticated user, got userId ${userId}`)

	const data = (await request.json()) as deleteData
	const postId = data.postId
	const focussedPostId = data.focussedPostId

	await db
		.transaction()
		.execute(async trx => await deletePost(trx, postId, userId))

	if (focussedPostId) {
		const newCommentTreeState = await db
			.transaction()
			.execute(async trx => getCommentTreeState(trx, focussedPostId, userId))
		return newCommentTreeState
	}

	return {}
}
