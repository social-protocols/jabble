import { z } from 'zod'

const baseAlgoliaHackerNewsTreeSchema = z.object({
	author: z.coerce.string(),
	created_at_i: z.coerce.number(),
	id: z.coerce.number(),
	parent_id: z.coerce.number().nullable(),
	story_id: z.coerce.number(),
	text: z.coerce.string().nullable(),
	title: z.coerce.string().nullable(),
	type: z.coerce.string(),
	url: z.coerce.string().nullable(),
})

export const algoliaHackerNewsTreeSchema: z.ZodType<AlgoliaHackerNewsTree> =
	baseAlgoliaHackerNewsTreeSchema.extend({
		children: z.lazy(() => algoliaHackerNewsTreeSchema.array()),
	})

export type AlgoliaHackerNewsTree = z.infer<
	typeof baseAlgoliaHackerNewsTreeSchema
> & {
	children: AlgoliaHackerNewsTree[]
}
