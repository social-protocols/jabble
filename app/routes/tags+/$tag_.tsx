// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import { json, type DataFunctionArgs } from '@remix-run/node'
import {
	useLoaderData,
	type ShouldRevalidateFunction,
	Link,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { Feed } from '#app/components/ui/feed.tsx'
import { PostForm } from '#app/components/ui/post-form.tsx'
import { getRankedPosts } from '#app/ranking.ts'

import { getUserId } from '#app/utils/auth.server.ts'
import { type VoteState, getUserVotes } from '#app/vote.ts'

const tagSchema = z.coerce.string()

export async function loader({ params, request }: DataFunctionArgs) {
	const tag: string = tagSchema.parse(params.tag)
	invariant(tag, 'Missing tag param')

	const userId: string | null = await getUserId(request)

	const rankedPosts = await getRankedPosts(tag)
	const posts = rankedPosts
	let votes: VoteState[] = []
	if (userId) {
		votes = await getUserVotes(
			userId,
			tag,
			rankedPosts.map(p => p.id),
		)
	}

	const loggedIn = userId !== null

	return json({ posts, userId, votes, tag, loggedIn })
}

export default function TagPage() {
	const { tag, posts, votes, loggedIn } = useLoaderData<typeof loader>()

	// We lose the type info for votes after serializing and deserializing JSON
	let p = new Map<number, VoteState>()
	for (let position of votes) {
		p.set(position.postId, position)
	}

	return (
		<>
			<div className="mb-5">
				<Link to={`/`}>Home</Link>
				&nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
			</div>
			{loggedIn && <PostForm tag={tag} className="mb-5" />}
			<Feed
				posts={posts}
				votes={p}
				loggedIn={loggedIn}
				rootId={null}
				showNotes={false}
			/>
		</>
	)
}

export const shouldRevalidate: ShouldRevalidateFunction = (args: {
	formAction?: string | undefined
}) => {
	// Optimization that makes it so /votes don't reload the page
	if (args.formAction == '/vote') {
		return false
	}
	return true
}
