import { type Transaction, sql } from 'kysely'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { createPost, getPost } from '#app/repositories/post.ts'
import { type Post } from '#app/types/api-types.ts'
import { type FactCheck, type DB } from '#app/types/kysely-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'

export const ClaimExtractionSchema = z.object({
	claim_context: z
		.string()
		.describe(
			'A neutral description of the original text, explaining the context of where the claim was made.',
		),
	extracted_claims: z
		.array(
			z
				.object({
					claim: z
						.string()
						.describe(
							'A claim made in the text. No personal opinions of the author, just statements of fact. The claim should be understandable in isolation.',
						),
					contains_judgment: z
						.boolean()
						.describe(
							'Whether or not the claim contains judgment by the author.',
						),
					verifiable_or_debatable: z
						.enum(['verifiable', 'debatable'])
						.describe(
							'Whether the claim is verifiable (i.e. can be verified as true or false linking to a source) or debatable (people can have different opinions about it).',
						),
					fact_or_opinion: z
						.enum(['fact', 'opinion'])
						.describe('The type of claim made in the text.'),
				})
				.strict(),
		)
		.describe(
			'All the claims made in the text. Be exhaustive and really include ALL claims made in the text. Restate them as neutral facts, remove the subjective perspective of the author. The claim itself should be understandable in isolation, without the context.',
		),
})

export type ClaimList = z.infer<typeof ClaimExtractionSchema>

export async function extractClaims(content: string): Promise<ClaimList> {

	invariant(content.length <= MAX_CHARS_PER_POST, 'Post content too long')
	invariant(content.length > 0, 'Post content too short')

	const openai = new OpenAI()

	const completion = await openai.beta.chat.completions.parse({
		model: 'gpt-4o-mini',
		seed: 1337,
		temperature: 0,
		top_p: 1,
		messages: [{ role: 'user', content: content }],
		response_format: zodResponseFormat(ClaimExtractionSchema, 'event'),
	})

	const choice = completion.choices[0]
	invariant(choice != undefined, 'no choice')
	const event = choice.message.parsed
	invariant(event != null, 'could not parse result')

	return event
}

export async function createFactCheck(
	trx: Transaction<DB>,
	userId: string,
	claim: string,
	context: string,
	origin: string | null,
): Promise<Post> {
	const postContent = `
**Claim:** ${claim}

**Context:** ${context}
`.trim()

	const postId = await createPost(trx, null, postContent, userId, {
		isPrivate: false,
		withUpvote: false,
	})

	const claimId: { id: number } = await trx
		.insertInto('Claim')
		.values({ claim })
		.returning('id')
		.executeTakeFirstOrThrow()

	const claimContextId: { id: number } = await trx
		.insertInto('ClaimContext')
		.values({ context, origin })
		.returning('id')
		.executeTakeFirstOrThrow()

	await sql`
		insert or ignore into ClaimToClaimContext
		values (${claimId.id}, ${claimContextId.id})
	`.execute(trx)

	await sql`
		insert or ignore into FactCheck
		values (${claimId.id}, ${claimContextId.id}, ${postId})
	`.execute(trx)

	return await getPost(trx, postId)
}

export async function isFactCheckDiscussion(
	trx: Transaction<DB>,
	postId: number,
): Promise<boolean> {
	const existingFactCheck: FactCheck[] = await trx
		.selectFrom('FactCheck')
		.where('postId', '=', postId)
		.selectAll()
		.execute()

	if (existingFactCheck.length !== 0) {
		return true
	}

	return false
}
