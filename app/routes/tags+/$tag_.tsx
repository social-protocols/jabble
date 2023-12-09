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

import { getPositionsForTag } from '#app/positions.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

import { PostForm } from '#app/components/ui/post-form.tsx'
import { createPost } from '#app/post.ts'
import type { ActionFunctionArgs } from "@remix-run/node"

// const GLOBAL_TAG = "global";

const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()
const maxPosts = 90

export async function loader({ params, request }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)

	const userId = await requireUserId(request)
  
	const positions = await getPositionsForTag(userId, tag)

	invariant(tag, 'Missing tag param')

	const posts = await getRankedPosts(tag, maxPosts)
	logTagPageView(userId, tag)

	return json({ posts, userId, positions, tag })
}

export default function TagPage() {
	const { tag, posts, userId, positions } = useLoaderData<typeof loader>()

	return (
		<div className='flex flex-col p-5'>
			<PostForm />
			<Feed posts={posts} tag={tag} />
		</div>
	)
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId: string = await requireUserId(request)

	const formData = await request.formData()
	const d = Object.fromEntries(formData);
  
	const tag: string = tagSchema.parse(d.tag)
	const content: string = contentSchema.parse(d.newPostContent)
	invariant(content, "content !== undefined")
	invariant(tag, "tag !== ''")

	const newPostId = await createPost(tag, null, content, userId)
  
	return true
};

// <div>
// 	<div>Post Content: {post.content}</div>
// 	<div>Score: {post.score} voteRate: {post.voteRate} Votes: {post.voteCount}/{post.voteTotal} p: {post.p} q: {post.q}  </div>
// </div>
