import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
import { extractClaims } from '#app/utils/claim-extraction.ts'

const postDataSchema = zfd.formData({
	content: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const postData = postDataSchema.parse(await request.json())
	return await extractClaims(postData.content)
}
