// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { logTagPageView } from "#app/attention.ts"
import { json, type DataFunctionArgs } from '@remix-run/node'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { useLoaderData, type ShouldRevalidateFunction } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

// import { db } from "#app/db.ts"
// import { getPost } from "#app/post.ts"
// import { topNote, voteRate } from '#app/probabilities.ts'

import { getRankedPosts } from "#app/ranking.ts"
// import { invariantResponse } from '#app/utils/misc.tsx'

// import { Feed } from "#app/components/ui/feed.tsx"

import { getPositionsForTag } from '#app/positions.ts'
import { requireUserId } from '#app/utils/auth.server.ts'

import { PostForm } from '#app/components/ui/post-form.tsx'
import { createPost } from '#app/post.ts'
import type { ActionFunctionArgs } from "@remix-run/node"
// import {type PostId } from '#app/post.ts'
import { TagFeed } from "#app/components/ui/feed.tsx"
import { Direction } from "#app/vote.ts"
import { Link } from '@remix-run/react'
// const GLOBAL_TAG = "global";

const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

export async function loader({ params, request }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)

	const userId = await requireUserId(request)
  
	const positions = await getPositionsForTag(userId, tag)

	invariant(tag, 'Missing tag param')

	const posts = await getRankedPosts(tag)
	logTagPageView(userId, tag)

	return json({ posts, userId, positions, tag })
}

export default function TagPage() {
	const { tag, posts, positions } = useLoaderData<typeof loader>()

	// We lose the type info for positions after serializing and deserializing JSON
	let p = new Map<number, Direction>()
	for (let position of positions) {
		p.set(position.postId, position.direction)
	}

	return (
		<div className='p-10'>
			<div>
				<Link to={`/`}>Home</Link> 
				 &nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
			</div>	
			<PostForm tag={tag} />
			<TagFeed posts={posts} tag={tag} positions={p} />
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

export const shouldRevalidate: ShouldRevalidateFunction = (args: { formAction?: string | undefined }) => {

	// Optimization that makes it so /votes don't reload the page
	if (args.formAction == "/vote") {
		return false
	}
	return true;
};
