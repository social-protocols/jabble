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

	const postId = await db.transaction().execute(
		async trx =>
			await createPost(trx, parentId, content, userId, {
				isPrivate: isPrivate,
				withUpvote: true,
			}),
	)

	if (focussedPostId) {
		const newReplyTree = await db
			.transaction()
			.execute(async trx => await getReplyTree(trx, postId, userId))
		const commentTreeState = await db
			.transaction()
			.execute(
				async trx => await getCommentTreeState(trx, focussedPostId, userId),
			)
		return {
			commentTreeState,
			newReplyTree,
		}
	}

	return {}
}
