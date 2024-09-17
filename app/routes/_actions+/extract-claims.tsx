import { type ActionFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { extractClaims } from '#app/repositories/fact-checking.ts'

const quoteDtoSchema = z.object({
	quote: z.coerce.string(),
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const quoteDto = quoteDtoSchema.parse(await request.json())
	return await extractClaims(quoteDto.quote)
}
