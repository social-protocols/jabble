// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { type DataFunctionArgs, json } from '@remix-run/node'

import { useLoaderData } from '@remix-run/react'

// import assert from 'assert';
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
// import { db } from "#app/db.ts";
// import { topNote, voteRate } from '#app/probabilities.ts';
import invariant from 'tiny-invariant'
import { z } from 'zod'
// import { Button } from '#app/components/ui/button.tsx';
// import { Link } from '@remix-run/react';

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Markdown } from '#app/components/markdown.tsx'

// import type { LinksFunction } from "@remix-run/node"; // or cloudflare/deno

import { type ScoredPost, getScoredPost } from '#app/ranking.ts'

// const GLOBAL_TAG = "global";

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

// export const handle = {
//   scripts: () => [{ src: '/js/vote.js' }]
// }

export async function loader({ params }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const post: ScoredPost = await getScoredPost(tag, postId)

	// So the first of the replies and the top note are not necessarily the same thing?!?
	// The top note is the most convincing one. But the replies are ordered by *information rate*.

	// let topNote: Post | null = replies.length > 0 ? replies[0]! : null
	// let topNote = post.topNoteId ? await getPost(post.topNoteId) : null

	let result = json({
		post,
		tag,
	})

	return result
}

function relativeEntropy(p: number, q: number): number {
	const logp = p == 0 ? 0 : Math.log2(p)
	const lognotp = p == 1 ? 0 : Math.log2(1 - p)
	const logq = q == 0 ? 0 : Math.log2(q)
	const lognotq = q == 1 ? 0 : Math.log2(1 - q)

	console.log(p, q, logp, lognotp, logq, lognotq)
	const e = p * (logp - logq) + (1 - p) * (lognotp - lognotq)
	return e
}

export default function PostStats() {
	const { post, tag } = useLoaderData<typeof loader>()

	const totalCrossEntropy = post.qSize * relativeEntropy(post.p, post.q)

	const informationValueNewVotes = post.oCount * (1 + Math.log2(post.p))
	const informationValueTotal = informationValueNewVotes - totalCrossEntropy

	// - **attention:** ${post.attention.toFixed(3)}
	// - **vote rate:** ${post.voteRate.toFixed(3)}
	//   - voteRate = Bayesian Average(votes/attention, voteRatePrior)
	// - **information rate (new votes):** ${post.informationRate.toFixed(3)}
	//   - informationRate = voteRate * (1 + log(p))

	const markdown = `
# Stats for post [${post.id}](/tags/${tag}/posts/${
		post.id
	}) in [#${tag}](/tags/${tag})

- **parent:** ${
		post.parentId == null
			? 'null'
			: `[${post.parentId}](/tags/${tag}/stats/${post.parentId})`
	}
- **upvotes:** ${post.oCount}
- **downvotes:** ${post.oSize - post.oCount}
- **votes:** ${post.oCount}
- **q**: ${post.q == null ? "" : post.q.toFixed(3)}
  - q = Bayesian Average(upvotes/votes), upvoteProbabilityPrior)
  - see [Docs on Rating and Evaluating Content](https://social-protocols.org/global-brain/rating-and-evaluating-content.html)
- **top note:** ${
		post.topNoteId == null
			? 'null'
			: `[${post.topNoteId}](/tags/${tag}/stats/${post.topNoteId})`
	}
- **p:** ${post.p.toFixed(3)}
	- p = ${
		post.topNoteId === null
			? 'q'
			: `Bayesian Average(upvotes/votes given shown top note ${post.topNoteId}), q)`
	}
- **cognitive dissonance (existing votes):** ${totalCrossEntropy.toFixed(
		3,
	)} bits
	- cognitiveDissonance = votesTotal * Dkl(p,q)
	- see [Docs on Cognitive Dissonance](https://social-protocols.org/global-brain/cognitive-dissonance.html)
- **information value created (new votes)**: ${informationValueNewVotes.toFixed(
		3,
	)}
  - informationValue = votesTotal * (1 + log(p))
  - see [Docs on Information Value](https://social-protocols.org/global-brain/information-value.html)
- **information value created (total)**: ${informationValueTotal.toFixed(3)}
  - informationValue = informationValueNewVotes - cognitiveDissonance
	`

	return (
		<div className="markdown">
			<Markdown deactivateLinks={false}>{markdown}</Markdown>
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
