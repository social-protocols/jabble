// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { type DataFunctionArgs, json } from '@remix-run/node'

import { useLoaderData } from '@remix-run/react'
import Markdown from 'markdown-to-jsx'

// import assert from 'assert';
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
// import { db } from "#app/db.ts";
// import { topNote, voteRate } from '#app/probabilities.ts';
import invariant from 'tiny-invariant'
import { z } from 'zod'
// import { Button } from '#app/components/ui/button.tsx';
// import { Link } from '@remix-run/react';

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

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

	const totalCrossEntropy = post.voteTotal * relativeEntropy(post.p, post.q)

	const markdown = `
# Stats for post [${post.id}](/tags/${tag}/posts/${
		post.id
	}) in [#${tag}](/tags/${tag})

- **Information Rate:** ${post.informationRate.toFixed(3)}
- **Vote Rate:** ${post.voteRate.toFixed(3)}
- **p:** ${post.p.toFixed(3)}
- **q:** ${post.q.toFixed(3)}
- **attention:** ${post.attention.toFixed(3)}
- **upvotes:** ${post.voteCount}
- **downvotes:** ${post.voteTotal - post.voteCount}
- **total votes:** ${post.voteTotal}
- **cognitive dissonance:** ${totalCrossEntropy.toFixed(3)} bits
- **top note:** ${
		post.topNoteId == null
			? 'null'
			: `[${post.topNoteId}](/tags/${tag}/stats/${post.topNoteId})`
	}
- **parent:** ${
		post.parentId == null
			? 'null'
			: `[${post.parentId}](/tags/${tag}/stats/${post.parentId})`
	}
	`

	return (
		<>
			<Markdown className="markdown">{markdown}</Markdown>
		</>
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
