import { type DataFunctionArgs, json } from '@remix-run/node'

import { useLoaderData } from '@remix-run/react'

import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import {
	type ScoredPost,
	getScoredPost,
	getEffectOnParent,
} from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const post: ScoredPost = await getScoredPost(tag, postId)

	const effectOnParent =
		post.parentId == null ? null : await getEffectOnParent(tag, post.id)

	// So the first of the replies and the top note are not necessarily the same thing?!?
	// The top note is the most convincing one. But the replies are ordered by *information rate*.

	// let topNote: Post | null = replies.length > 0 ? replies[0]! : null
	// let topNote = post.topNoteId ? await getPost(post.topNoteId) : null

	let result = json({
		post,
		effectOnParent,
		tag,
	})

	return result
}

export default function PostStats() {
	const { post, effectOnParent, tag } = useLoaderData<typeof loader>()

	const dkl = relativeEntropy(post.p, post.q)
	const totalRelativeEntropy = post.qSize * dkl

	const informationValueNewVotes = post.oCount * (1 + Math.log2(post.p))
	const informationValueTotal = informationValueNewVotes - totalRelativeEntropy

	// - **attention:** ${post.attention.toFixed(3)}
	// - **vote rate:** ${post.voteRate.toFixed(3)}
	//   - voteRate = Bayesian Average(votes/attention, voteRatePrior)
	// - **information rate (new votes):** ${post.informationRate.toFixed(3)}
	//   - informationRate = voteRate * (1 + log(p))

	const overallMarkdown = `
# Stats for post [${post.id}](/tags/${tag}/posts/${
		post.id
	}) in [#${tag}](/tags/${tag})

## Overall

- **parent:** ${
		post.parentId == null
			? 'null'
			: `[${post.parentId}](/tags/${tag}/stats/${post.parentId})`
	}
- **overall votes:** ▲ ${post.oCount} ▼ ${post.oSize - post.oCount}
- **o:** ${post.o.toFixed(3)}
- **p:** ${post.p.toFixed(3)}
- **score:** ${post.score}
`

	// - p = ${
	// 	post.topNoteId === null
	// 		? 'q'
	// 		: `Bayesian Average(upvotes/votes given shown top note ${post.topNoteId}), q)`
	// }

	const topNoteMarkdown =
		post.topNoteId == null
			? ''
			: `
## Top Note 

- **top note id:** ${
					post.topNoteId == null
						? 'null'
						: `[${post.topNoteId}](/tags/${tag}/stats/${post.topNoteId})`
			  }
- **uninformed votes:** ▲ ${post.qCount} ▼ ${post.qSize - post.pCount}
- **q:** ${post.q.toFixed(3)}
- **r**: ${post.r.toFixed(3)}
`

	// - q = Bayesian Average(upvotes/votes), upvoteProbabilityPrior)
	// - see [Docs on Rating and Evaluating Content](https://social-protocols.org/global-brain/rating-and-evaluating-content.html)

	const e = effectOnParent
	const effectOnParentMarkdown =
		e === null
			? ''
			: `
## Effect on Parent

- **informed votes:** ▲ ${e.pCount} ▼ ${e.pSize - e.pCount}
- **p:** ${e.p}
- **uninformed votes:** ▲ ${e.qCount} ▼ ${e.qSize - e.pCount}
- **q:** ${e.q}
- **relativeEntropy:** ${relativeEntropy(e.p, e.q).toFixed(3)}
	- relativeEntropy = DKL(p, q)
- **cognitive dissonance (existing votes):** ${(
					relativeEntropy(e.p, e.q) * e.qCount
			  ).toFixed(3)} bits
	- cognitiveDissonance = votesTotal * Dkl(p,q)
	- see [Docs on Cognitive Dissonance](https://social-protocols.org/global-brain/cognitive-dissonance.html)
	}`

	// - **information value created (new votes)**: ${informationValueNewVotes.toFixed(
	// 		3,
	// 	)}
	//   - informationValue = votesTotal * (1 + log(p))
	//   - see [Docs on Information Value](https://social-protocols.org/global-brain/information-value.html)
	// - **information value created (total)**: ${informationValueTotal.toFixed(3)}
	//   - informationValue = informationValueNewVotes - cognitiveDissonance
	// 	")

	return (
		<div className="markdown">
			<Markdown deactivateLinks={false}>
				{overallMarkdown + topNoteMarkdown + effectOnParentMarkdown}
			</Markdown>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				// 404: ({ params }) => <p>Post not found</p>,
				404: () => <p>Post not found</p>,
			}}
		/>
	)
}
