import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

import { db } from '#app/db.ts'
import { fallacyDetection } from '#app/repositories/fallacy-detection.ts'
import {
	getNLatestPlaygroundPosts,
	storePlaygroundPost,
} from '#app/repositories/playground-post.ts'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.json())

	const nLatestPlaygroundPosts = await db
		.transaction()
		.execute(async trx => await getNLatestPlaygroundPosts(trx, 10))

	console.log('detecting fallacies...')
	const detection = await fallacyDetection(postData.content)
	const newPlaygroundPost = await db
		.transaction()
		.execute(trx => storePlaygroundPost(trx, postData.content, detection))

	return {
		newPlaygroundPost,
		nLatestPlaygroundPosts,
	}
}
