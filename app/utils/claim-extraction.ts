import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { invariant } from './misc.tsx'

export const ClaimExtractionSchema = z.object({
	extracted_claims: z.array(
		z
			.object({
				claim: z.string()
					.describe('A claim made in the text. No personal opinions of the author, just statements of fact. The claim should be understandable in isolation.'),
				context: z.string()
					.describe('Important context to understand the claim.'),
				contains_judgment: z.boolean()
					.describe('Whether or not the claim contains judgment by the author.'),
				verifiable_or_debatable: z.enum(['verifiable', 'debatable'])
					.describe('Whether the claim is verifiable (i.e. can be verified as true or false linking to a source) or debatable (people can have different opinions about it).'),
				fact_or_opinion: z.enum(['fact', 'opinion'])
					.describe('The type of claim made in the text.'),
			})
			.strict(),
	)
	.describe('All the claims made in the text.')
})

export type ClaimList = z.infer<typeof ClaimExtractionSchema>

export async function extractClaims(content: string): Promise<ClaimList> {
	const openai = new OpenAI()

	const completion = await openai.beta.chat.completions.parse({
		model: 'gpt-4o-mini',
		seed: 1337,
		temperature: 0,
		top_p: 1,
		messages: [
			{ role: 'user', content: content },
		],
		response_format: zodResponseFormat(ClaimExtractionSchema, 'event'),
	})

	const choice = completion.choices[0]
	invariant(choice != undefined, 'no choice')
	const event = choice.message.parsed
	invariant(event != null, 'could not parse result')

	return event
}
