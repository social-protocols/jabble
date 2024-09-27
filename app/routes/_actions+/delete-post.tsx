import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { setDeletedAt } from '#app/modules/posts/post-repository.ts'
import { getCommentTreeState } from '#app/modules/posts/scoring/ranking-service.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'

type DeletionData = {
	postId: number
	focussedPostId: number | null
	deletedAt: number | null
}

const deletionDataSchema = z.object({
	postId: z.number(),
	focussedPostId: z.number().nullable(),
	deletedAt: z.number().nullable(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId = await getUserId(request)
	invariant(userId, `No authenticated user, got userId ${userId}`)

	const { postId, focussedPostId, deletedAt }: DeletionData =
		deletionDataSchema.parse(await request.json())

	return await db.transaction().execute(async trx => {
		await setDeletedAt(trx, postId, deletedAt, userId)
		return focussedPostId
			? await getCommentTreeState(trx, focussedPostId, userId)
			: {}
	})
}
