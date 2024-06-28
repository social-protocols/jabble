import { type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { db } from '#app/db.ts'
import { createPost } from '#app/repositories/post.ts'
import { getCommentTreeState, getReplyTree } from '#app/repositories/ranking.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

type ReplyData = {
	parentId: number
	focussedPostId: number
	content: string
	isPrivate: number
}

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const dataParsed = (await request.json()) as ReplyData

	const userId: string = await requireUserId(request)

	const content = dataParsed.content
	const parentId = dataParsed.parentId
	const isPrivate = Boolean(dataParsed.isPrivate)
	const focussedPostId = dataParsed.focussedPostId

	invariant(content, 'content !== undefined')

	return await db.transaction().execute(async trx => {
		const postId = await createPost(trx, parentId, content, userId, {
			isPrivate: isPrivate,
			withUpvote: true,
		})
		return focussedPostId
			? {
					commentTreeState: await getCommentTreeState(
						trx,
						focussedPostId,
						userId,
					),
					newReplyTree: await getReplyTree(trx, postId, userId),
				}
			: {}
	})
}
