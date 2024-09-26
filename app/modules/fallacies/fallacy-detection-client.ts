import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { MAX_CHARS_PER_QUOTE } from '#app/constants.ts'
import { invariant } from '#app/utils/misc.tsx'
import { FallacyDetectionSchema, type FallacyList } from './fallacy-types.ts'

// Fallacy detection based on a paper by Helwe et at. (2023): https://arxiv.org/abs/2311.09761

export async function fallacyDetection(content: string): Promise<FallacyList> {
	invariant(content.length <= MAX_CHARS_PER_QUOTE, 'Quote content too long')
	invariant(content.length > 0, 'Quote content too short')

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
