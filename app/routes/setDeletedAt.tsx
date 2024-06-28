import { type ActionFunctionArgs } from '@remix-run/node'
import { db } from '#app/db.ts'
import { setDeletedAt } from '#app/repositories/post.ts'
import { getCommentTreeState } from '#app/repositories/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'

type deletionData = {
	postId: number
	focussedPostId: number | null
	deletedAt: number | null
}

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId = await getUserId(request)
	invariant(userId, `No authenticated user, got userId ${userId}`)

	const data = (await request.json()) as deletionData
	const postId = data.postId
	const focussedPostId = data.focussedPostId
	const deletedAt = data.deletedAt

	return await db.transaction().execute(async trx => {
		await setDeletedAt(trx, postId, deletedAt, userId)
		return focussedPostId
			? await getCommentTreeState(trx, focussedPostId, userId)
			: {}
	})
}
