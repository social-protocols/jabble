// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { json, type DataFunctionArgs } from '@remix-run/node'
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
import { logTagPageView } from "#app/attention.ts"
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

// import { db } from "#app/db.ts"
// import { getPost } from "#app/post.ts"
// import { topNote, voteRate } from '#app/probabilities.ts'

import { getRankedPosts, type RankedPost } from "#app/ranking.ts"
// import { invariantResponse } from '#app/utils/misc.tsx'


// const GLOBAL_TAG = "global";

const tagSchema = z.coerce.string()
const maxPosts = 90

export async function loader({ params }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)

	invariant(tag, 'Missing tag param')

	const posts = await getRankedPosts(tag, maxPosts)
	let userId = "100"
	logTagPageView(userId, tag, posts.map(p => p.id))

	return json({ posts })
}

export default function TagPage() {
	const { posts } = useLoaderData<typeof loader>()

	return posts.map((post: RankedPost) => 
		<div>
			<div>Post Content: {post.content}</div>
			<div>Score: {post.score} voteRate: {post.voteRate} Votes: {post.voteCount}/{post.voteTotal} p: {post.p} q: {post.q}  </div>
		</div>
	)

}