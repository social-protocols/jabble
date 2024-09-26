import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/db.ts'
import { getStatsPost } from '#app/modules/posts/post-repository.ts'
import { getEffects } from '#app/modules/scoring/effect-repository.ts'
import { type StatsPost } from '#app/types/api-types.ts'
import { type DBEffect } from '#app/types/db-types.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params }: LoaderFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	const postId: number = postIdSchema.parse(params.postId)

	const {
		post,
		effects,
	}: {
		post: StatsPost
		effects: DBEffect[]
	} = await db.transaction().execute(async trx => {
		const post = await getStatsPost(trx, postId)
		const effects = post.parentId == null ? [] : await getEffects(trx, post.id)
		return { post, effects }
	})

	// So the first of the replies and the top comment are not necessarily the same thing?!?
	// The top comment is the most convincing one. But the replies are ordered by *information rate*.

	return json({
		post,
		effects,
	})
}

export default function PostStats() {
	const { post, effects } = useLoaderData<typeof loader>()

	// const dkl = relativeEntropy(post.p, post.q)
	// const totalRelativeEntropy = post.qSize * dkl

	// const informationValueNewVotes = post.oCount * (1 + Math.log2(post.p))
	// const informationValueTotal = informationValueNewVotes - totalRelativeEntropy

	// - **attention:** ${post.attention.toFixed(3)}
	// - **vote rate:** ${post.voteRate.toFixed(3)}
	//   - voteRate = Bayesian Average(votes/attention, voteRatePrior)
	// - **information rate (new votes):** ${post.informationRate.toFixed(3)}
	//   - informationRate = voteRate * (1 + log(p))

	const overallMarkdown = `
# Stats for post [${post.id}](/post/${post.id})

## Overall

- **parent:** ${
		post.parentId == null
			? 'null'
			: `[${post.parentId}](/stats/${post.parentId})`
	}
- **overall votes:** ${post.oCount} ▲ ${
		post.oSize - post.oCount
	} ▼ &nbsp; **o**: ${(post.o * 100).toFixed(1)}%
- **p:** ${(post.p * 100).toFixed(1)}%
- **score:** ${post.score}
`

	const topCommentMarkdown =
		post.criticalThreadId == null
			? ''
			: `
## Critical Comment

- **top reply id:** ${
					post.criticalThreadId == null
						? 'null'
						: `[${post.criticalThreadId}](/stats/${post.criticalThreadId})`
				}
- **informed votes:** &nbsp;&nbsp;&nbsp;&nbsp; ${post.pCount} ▲ ${
					post.pSize - post.pCount
				} ▼ &nbsp; **p**: ${(post.p * 100).toFixed(1)}%
- **uninformed votes:** ${post.qCount} ▲ ${
					post.qSize - post.qCount
				} ▼ &nbsp; **q**: ${(post.q * 100).toFixed(1)}%
- **r**: ${post.r.toFixed(3)}
`

	// - q = Bayesian Average(upvotes/votes), upvoteProbabilityPrior)
	// - see [Docs on Rating and Evaluating Content](https://social-protocols.org/global-brain/rating-and-evaluating-content.html)

	const effectsMarkdown =
		effects.length === 0
			? ''
			: `
## Effects

${effects
	.map(
		e => `

### on [post ${e.postId}](/stats/${e.postId})

- **informed votes:** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${e.pCount} ▲  ${
			e.pSize - e.pCount
		} ▼ &nbsp;  **p**: ${(e.p * 100).toFixed(1)}%
- **uninformed votes:** ${e.qCount} ▲ ${e.qSize - e.qCount} ▼ &nbsp; **q:** ${(
			e.q * 100
		).toFixed(1)}%
- **relative entropy:** ${relativeEntropy(e.p, e.q).toFixed(3)}
- **cognitive dissonance:** ${(relativeEntropy(e.p, e.q) * e.qCount).toFixed(
			3,
		)} bits
	`,
	)
	.join('')}
`

	// - cognitiveDissonance = votesTotal * Dkl(p,q)
	// - see [Docs on Cognitive Dissonance](https://social-protocols.org/global-brain/cognitive-dissonance.html)
	// - relativeEntropy = DKL(p, q)
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
				{overallMarkdown + topCommentMarkdown + effectsMarkdown}
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
