import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { zfd } from 'zod-form-data'

import { fallacyDetection } from '#app/utils/fallacy_detection.ts'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request

	const postData = postDataSchema.parse(await request.json())

	console.log('detecting fallacies...')
	const detectedFallacies = await fallacyDetection(postData.content)
	return detectedFallacies
}
