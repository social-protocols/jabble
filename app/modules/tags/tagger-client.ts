import { invariant } from "#app/utils/misc.tsx"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod.mjs"
import { z } from "zod"

export const TaggingSchema = z.object({
	tags: z
		.array(
			z
				.object({
					tag: z
						.string()
						.describe('A tag for the given content.'),
				})
				.strict(),
		)
		.describe(
			'A list of tags that characterizes the given content.',
		),
})

export async function tagContent(content: string): Promise<string[]> {
	const openai = new OpenAI()

	const systemMessage = `
Generate a list of up to three tags for the given content.
They should be broad categories that the content could be subsumed under.
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
		response_format: zodResponseFormat(TaggingSchema, 'event'),
	})

	const choice = completion.choices[0]
	invariant(choice != undefined, 'no choice')
	const event = choice.message.parsed
	invariant(event != null, 'could not parse result')

	return event.tags.map(tag => tag.tag)
}

