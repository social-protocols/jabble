import { type ActionFunctionArgs } from '@remix-run/node'
import { sql } from 'kysely'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { createPost } from '#app/repositories/post.ts'
import { getCommentTreeState, getReplyTree } from '#app/repositories/ranking.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { fallacyDetection } from '#app/utils/fallacy_detection.ts'

type ReplyData = {
	parentId: number
	focussedPostId: number
	content: string
	isPrivate: number
}

const replyDataSchema = z.object({
	parentId: z.number(),
	focussedPostId: z.number(),
	content: z.string(),
	isPrivate: z.number(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId: string = await requireUserId(request)

	const { parentId, focussedPostId, content, isPrivate }: ReplyData =
		replyDataSchema.parse(await request.json())

	invariant(content, 'content !== undefined')

	const detectedFallaciesPromise = fallacyDetection(content)

	return await db.transaction().execute(async trx => {
		const postId = await createPost(trx, parentId, content, userId, {
			isPrivate: Boolean(isPrivate),
			withUpvote: true,
		})

		try {
			console.log('detecting fallacies...')
			const detectedFallacies = await detectedFallaciesPromise

			await sql`
        insert into Fallacy (postId, detection)
        values (${postId}, ${JSON.stringify(detectedFallacies)})
      `.execute(trx)
		} catch (error) {
			console.error(error)
		}

		if (focussedPostId) {
			const commentTreeState = await getCommentTreeState(
				trx,
				focussedPostId,
				userId,
			)
			return {
				commentTreeState,
				newReplyTree: await getReplyTree(trx, postId, userId, commentTreeState),
			}
		} else return {}
	})
}
