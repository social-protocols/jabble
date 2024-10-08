import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { invariant } from '#app/utils/misc.tsx'

export const ClaimExtractionSchema = z.object({
	claimContext: z
		.string()
		.describe(
			'A neutral description of the original text, explaining the context of where the claim was made.',
		),
	extractedClaims: z
		.array(
			z
				.object({
					claim: z
						.string()
						.describe(
							'A claim made in the text. No personal opinions of the author, just statements of fact. The claim should be understandable in isolation.',
						),
					claimWithoutIndirection: z
						.string()
						.describe(
							'The claim without any indirection, i.e. the claim should be direct and not indirect. Bad example: A study showed that X is true. Good example: X is true. If the claim contains no indirection, leave it as it is.',
						),
					normativeOrDescriptive: z
						.enum(['normative', 'descriptive'])
						.describe(
							'Whether the claim makes a normative statement (something should be a certain way) or a descriptive statement (something is a certain way).',
						),
					containsJudgment: z
						.boolean()
						.describe(
							'Whether the claim contains any judgment by the author. Is an opinion about the content of the claim expressed?',
						),
				})
				.strict(),
		)
		.describe(
			'All the claims made in the text. Be exhaustive and really include ALL claims made in the text. Restate them as neutral facts, remove the subjective perspective of the author. The claim itself should be understandable in isolation, without the context.',
		),
})

export async function extractClaims(content: string): Promise<string[]> {
	const openai = new OpenAI()

	const systemMessage = `
Extract all the claims made in the provided piece of content.
Claims should be direct: For example, if a speaker makes claim X, extract "X", not "Speaker claims X".
Don't use the passive form.
If a speaker uses the personal pronoun "I", try to infer the person's name and restate the claim in the third person.
	`

	const completion = await openai.beta.chat.completions.parse({
		model: 'gpt-4o-mini',
		seed: 1337,
		temperature: 0,
		top_p: 1,
		messages: [
			{ role: 'system', content: systemMessage },
			{ role: 'user', content: content },
		],
		response_format: zodResponseFormat(ClaimExtractionSchema, 'event'),
	})

	const choice = completion.choices[0]
	invariant(choice != undefined, 'no choice')
	const event = choice.message.parsed
	invariant(event != null, 'could not parse result')

	return event.extractedClaims.map(
		detection => detection.claimWithoutIndirection,
	)
}
