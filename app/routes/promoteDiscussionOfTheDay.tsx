import { redirect, type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { db } from '#app/db.ts'
import { setDiscussionOfTheDay } from '#app/repositories/post.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariant } from '#app/utils/misc.tsx'

const discussionOfTheDaySchema = z.object({
	postId: z.number(),
})

type DiscussionOfTheDayDTO = {
	postId: number
}

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const userId = await getUserId(request)
	invariant(userId, `No authenticated user, got userId ${userId}`)

	const { postId }: DiscussionOfTheDayDTO = discussionOfTheDaySchema.parse(
		await request.json(),
	)

	await db
		.transaction()
		.execute(async trx => await setDiscussionOfTheDay(trx, postId, userId))

	return redirect(`/post/${postId}`)
}
