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

import { Feed } from "#app/components/ui/feed.tsx"

import { requireUserId } from '#app/utils/auth.server.ts'
import { getPositionsForTag } from '#app/positions.ts'

// const GLOBAL_TAG = "global";

const tagSchema = z.coerce.string()
const maxPosts = 90

export async function loader({ params, request }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)

	const userId = await requireUserId(request)
  
  const positions = await getPositionsForTag(userId, tag)

	invariant(tag, 'Missing tag param')

	const posts = await getRankedPosts(tag, maxPosts)

	logTagPageView(userId, tag, posts.map(p => p.id))

	return json({ posts, userId, positions })
}

export default function TagPage() {
	const { posts, userId, positions } = useLoaderData<typeof loader>()

  return (
    <div>
      <Feed posts={posts} />
    </div>
  )
}

		// <div>
		// 	<div>Post Content: {post.content}</div>
		// 	<div>Score: {post.score} voteRate: {post.voteRate} Votes: {post.voteCount}/{post.voteTotal} p: {post.p} q: {post.q}  </div>
		// </div>
