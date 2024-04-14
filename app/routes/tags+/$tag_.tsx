// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import {
	json,
	type DataFunctionArgs,
} from '@remix-run/node'
import {
	useLoaderData,
	type ShouldRevalidateFunction,
	Link,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { logTagPageView } from '#app/attention.ts'

import { Feed } from '#app/components/ui/feed.tsx'
import { PostForm } from '#app/components/ui/post-form.tsx'
import { getUserPositions, type Position } from '#app/positions.ts'
import { getRankedPosts } from '#app/ranking.ts'

import { getUserId } from '#app/utils/auth.server.ts'

import { type Direction } from '#app/vote.ts'

const tagSchema = z.coerce.string()

export async function loader({ params, request }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)
	invariant(tag, 'Missing tag param')

	const userId: string | null = await getUserId(request)

	const rankedPosts = await getRankedPosts(tag)
	const posts = rankedPosts.posts
	let positions: Position[] = []
	if (userId) {
		logTagPageView(userId, tag, rankedPosts)
		positions = await getUserPositions(
			userId,
			tag,
			rankedPosts.posts.map(p => p.id),
		)
	}

	const loggedIn = userId !== null

	return json({ posts, userId, positions, tag, loggedIn})
}

export default function TagPage() {
	const { tag, posts, positions, loggedIn } = useLoaderData<typeof loader>()

	// We lose the type info for positions after serializing and deserializing JSON
	let p = new Map<number, Direction>()
	for (let position of positions) {
		p.set(position.postId, position.vote)
	}

	return (
		<>
			<div className="mb-5">
				<Link to={`/`}>Home</Link>
				&nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
			</div>
			{loggedIn && <PostForm tag={tag} className="mb-5" />}
			<Feed posts={posts} positions={p} loggedIn={loggedIn}/>
		</>
	)
}

export const shouldRevalidate: ShouldRevalidateFunction = (args: {
	formAction?: string | undefined
}) => {
	console.log('shouldRevalidate', args)
	// Optimization that makes it so /votes don't reload the page
	if (args.formAction == '/vote') {
		return false
	}
	return true
}
