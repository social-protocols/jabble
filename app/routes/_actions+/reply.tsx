import { type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { db } from '#app/database/db.ts'
import { fallacyDetection } from '#app/modules/fallacies/fallacy-detection-client.ts'
import { storeFallacies } from '#app/modules/fallacies/fallacy-repository.ts'
import { createPost } from '#app/modules/posts/post-service.ts'
import {
	getCommentTreeState,
	getMutableReplyTree,
} from '#app/modules/posts/ranking/ranking-service.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

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

	console.log('detecting fallacies...')
	const detectedFallaciesPromise = fallacyDetection(content)

	const postId = await db.transaction().execute(async trx => {
		const postId = await createPost(trx, parentId, content, userId, {
			isPrivate: Boolean(isPrivate),
			withUpvote: true,
		})
		return postId
	})

	try {
		const detectedFallacies = await detectedFallaciesPromise
		await storeFallacies(postId, detectedFallacies)
		console.log('stored fallacies', detectedFallacies)
	} catch (error) {
		console.error(error)
	}

	return await db.transaction().execute(async trx => {
		if (focussedPostId) {
			const commentTreeState = await getCommentTreeState(
				trx,
				focussedPostId,
				userId,
			)
			return {
				commentTreeState,
				newReplyTree: await getMutableReplyTree(
					trx,
					postId,
					userId,
					commentTreeState,
				),
			}
		} else return {}
	})
}
