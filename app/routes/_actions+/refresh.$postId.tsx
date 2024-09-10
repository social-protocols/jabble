import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { getPost } from '#app/repositories/post.ts'
import { checkIsAdminOrThrow, requireUserId } from '#app/utils/auth.server.ts'
import {
	fallacyDetection,
	storeFallacies,
} from '#app/repositories/fallacy-detection.ts'

const postIdSchema = z.coerce.number()

export const action = async (args: ActionFunctionArgs) => {
	invariant(args.params.postId, 'Missing postid param')
	const postId: number = postIdSchema.parse(args.params.postId)

	let request = args.request
	const userId: string = await requireUserId(request)
	checkIsAdminOrThrow(userId)

	const post = await db.transaction().execute(async trx => {
		return await getPost(trx, postId)
	})

	console.log('detecting fallacies...')

	try {
		const detectedFallacies = await fallacyDetection(post.content)
		await storeFallacies(postId, detectedFallacies)
	} catch (error) {
		console.error(error)
	}

	return redirect(`/post/${postId}`)
}
