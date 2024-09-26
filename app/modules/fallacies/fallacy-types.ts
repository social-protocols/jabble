import { z } from 'zod'

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

export const FallacyDetectionSchema = z
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
