import { sql } from 'kysely'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { db } from '#app/db.ts'
import { invariant } from './misc.tsx'

// Fallacy detection based on a paper by Helwe et at. (2023): https://arxiv.org/abs/2311.09761

const probEnum = z.enum([
	'no',
	'maybe',
	'arguably',
	'definitely',
	'needs further analysis',
])

export const FallacyListSchema = z.array(
	z
		.object({
			name: z.string(),
			analysis: z.string(),
			probability: z.number(),
		})
		.strict(),
)

const FallacyListSchemaPrompt = z
	.array(
		z
			.object({
				name: z.enum([
					// logical fallacies
					'Slippery Slope',
					'Hasty Generalization',
					'False Analogy',
					'Guilt by Association',
					'Causal Oversimplification',
					'Ad Populum',
					'Circular Reasoning',
					'Appeal to Fear',
					'Ad Hominem',
					'Appeal to (False) Authority',
					'False Causality',
					'Fallacy of Division',
					'Appeal to Ridicule',
					'Appeal to Worse Problems',
					'Appeal to Nature',
					'False Dilemma',
					'Straw Man',
					'Appeal to Anger',
					'Appeal to Positive Emotion',
					'Equivocation',
					'Appeal to Tradition',
					'Appeal to Pity',
					'Tu Quoque',
					// rthetorical
					'NIMBY',
				]),
				analysis: z
					.string()
					.describe(
						'Explain why the given fallacy is present and how this leads to a wrong conclusion. Use simple language. Be concise. Write in the language of the content you analyze.',
					),
				probability: z
					.number()
					.describe(
						'Probability of the fallacy being present based on the analysis (between 0.0 and 1.0).',
					),
			})
			.strict(),
	)
	.describe(
		'The detected fallacies. If in doubt, conduct the analysis as well.',
	)

const FallacyDetectionSchema = z
	.object({
		detected_language: z.string(),
		initial_guesses: z
			.object({
				// TODO: generate this object from enum
				// logical fallacies
				ad_hominem: probEnum,
				ad_populum: probEnum,
				appeal_to_anger: probEnum,
				appeal_to_false_authority: probEnum,
				appeal_to_fear: probEnum,
				appeal_to_nature: probEnum,
				appeal_to_pity: probEnum,
				appeal_to_positive_emotion: probEnum,
				appeal_to_ridicule: probEnum,
				appeal_to_tradition: probEnum,
				appeal_to_worse_problems: probEnum,
				causal_oversimplification: probEnum,
				circular_reasoning: probEnum,
				equivocation: probEnum,
				fallacy_of_division: probEnum,
				false_analogy: probEnum,
				false_causality: probEnum,
				false_dilemma: probEnum,
				guilt_by_association: probEnum,
				hasty_generalization: probEnum,
				slippery_slope: probEnum,
				straw_man: probEnum,
				tu_quoque: probEnum,
				// rthetorical
				nimby: probEnum,
			})
			.describe('Rough guess which fallacies might be present in the content.'),
		detected_fallacies: FallacyListSchemaPrompt,
	})
	.strict()

export type FallacyList = z.infer<typeof FallacyListSchema>

export async function fallacyDetection(content: string): Promise<FallacyList> {
	invariant(content.length <= MAX_CHARS_PER_POST, 'Post content too long')
	invariant(content.length > 0, 'Post content too short')

	const openai = new OpenAI()

	const completion = await openai.beta.chat.completions.parse({
		model: 'gpt-4o-mini',
		seed: 1337,
		temperature: 0,
		top_p: 1,
		messages: [
			{
				role: 'system',
				content: `
You will be presented with a piece of content.
Your task is to detect whether or not there is a rhetorical fallacy in it.

These are the definitions of the fallacies:

We begin by defining the variables/placeholders used in the formal templates:

A = attack
E = entity (persons, organizations) or group of entities
P, Pᵢ = premises, properties, or possibilities
C = conclusion

Abusive Ad Hominem
E claims P. E’s character is attacked (A). Therefore, ¬P.

Guilt by Association
E₁ claims P. Also, E₂ claims P, and E₂’s character is attacked (A). Therefore, ¬P.
OR E₁ claims P. E₂’s character is attacked (A) and is similar to E₁. Therefore, ¬P.

Tu quoque
E claims P, but E is acting as if ¬P. Therefore, ¬P.

Appeal to Anger
E claims P. E is outraged. Therefore, P.
OR E₁ claims P. E₂ is outraged by P. Therefore, P (or ¬P depending on the situation).

Appeal to Authority
E claims P (when E is seen as an authority on the facts relevant to P). Therefore, P.

Ad Populum
A lot of people believe/do P. Therefore, P.
OR Only a few people believe/do P. Therefore, ¬P.

Appeal to Fear
If ¬P₁, something terrible P₂ will happen. Therefore, P₁.

Appeal to Nature
P₁ is natural. P₂ is not natural. Therefore, P₁ is better than P₂.
OR P₁ is natural, therefore P₁ is good.

Appeal to Pity
P which is pitiful, therefore C, with only a superficial link between P and C.

Appeal to Tradition
We have been doing P for generations. Therefore, we should keep doing P.
OR Our ancestors thought P. Therefore, P.

Causal Oversimplification
P₁ caused C (although P₂, P₃, P₄, etc. also contributed to C).

Circular Reasoning
C because of P. P because of C.
OR C because C.

Equivocation
No logical form: P₁ uses a term T that has a meaning M₁. P₂ uses the term T with the meaning M₂ to mislead.

False Dilemma
Either P₁ or P₂, while there are other possibilities.
OR Either P₁, P₂, or P₃, while there are other possibilities.

Hasty Generalization
Sample E₁ is taken from population E. (Sample E₁ is a very small part of population E.) Conclusion C is drawn from sample E₁.

False Causality
P is associated with C (when the link is mostly temporal and not logical). Therefore, P causes C.

Appeal to Worse Problems
P₁ is presented. P₂ is presented as a best-case. Therefore, P₁ is not that good.
OR P₁ is presented. P₂ is presented as a worst-case. Therefore, P₁ is very good.

Slippery Slope
P₁ implies P₂, then P₂ implies P₃, … then C which is negative. Therefore, ¬P₁.

Strawman Fallacy
E₁ claims P. E₂ restates E₁’s claim (in a distorted way P'). E₂ attacks (A) P'. Therefore, ¬P.

Appeal to Positive Emotion
P is positive. Therefore, P.

False Analogy
E₁ is like E₂. E₂ has property P. Therefore, E₁ has property P. (but E₁ really is not too much like E₂)

Appeal to Ridicule
E₁ claims P. E₂ makes P look ridiculous, by misrepresenting P (P'). Therefore, ¬P.

Fallacy of Division
E₁ is part of E, E has property P. Therefore, E₁ has property P.
        `,
			},
			{ role: 'user', content: content },
		],
		response_format: zodResponseFormat(FallacyDetectionSchema, 'event'),
	})

	const choice = completion.choices[0]
	invariant(choice != undefined, 'no choice')
	const event = choice.message.parsed
	invariant(event != null, 'could not parse result')
	return event.detected_fallacies
}

export async function storeFallacies(
	postId: number,
	detectedFallacies: FallacyList,
) {
	await db.transaction().execute(
		async trx =>
			await sql`
        insert into Fallacy (postId, detection)
        values (${postId}, jsonb(${JSON.stringify(detectedFallacies)})) on conflict(postId) do update set detection = excluded.detection
      `.execute(trx),
	)
}
