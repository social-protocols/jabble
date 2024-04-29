import { type DataFunctionArgs, json } from '@remix-run/node'

import {
	Link,
	type ShouldRevalidateFunction,
	useLoaderData,
} from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Feed } from '#app/components/ui/feed.tsx'
import { PostContent, PostDetails } from '#app/components/ui/post.tsx'
import { type Post } from '#app/db/types.ts'

import { getUserPositions } from '#app/positions.ts'
import { getTransitiveParents } from '#app/post.ts'
import {
	getRankedReplies,
	getScoredPost,
	type RankedPost,
	type ScoredPost,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { Direction } from '#app/vote.ts'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

export async function loader({ params, request }: DataFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const userId: string | null = await getUserId(request)
	const post: ScoredPost = await getScoredPost(tag, postId)

	invariantResponse(post, 'Post not found', { status: 404 })

	const transitiveParents = await getTransitiveParents(post.id)

	let replies: RankedPost[] = await getRankedReplies(tag, post.id)

	// let positions: Map<number, Direction> = new Map<number, Direction>()
	let positions =
		userId === null
			? []
			: await getUserPositions(
					userId,
					tag,
					replies.map(p => p.id).concat([post.id]),
				)

	const loggedIn = userId !== null

	let result = json({
		post,
		transitiveParents,
		replies,
		tag,
		positions,
		loggedIn,
	})

	return result
}

export default function Post() {
	const {
		post,
		transitiveParents,
		replies,
		tag,
		positions,
		loggedIn,
	} = useLoaderData<typeof loader>()

	let p = new Map<number, Direction>()
	for (let position of positions) {
		p.set(position.postId, position.vote)
	}

	let position = p.get(post.id) || Direction.Neutral

	return (
		<>
			<div className="mb-5">
				<Link to={`/`}>Home</Link>
				&nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
			</div>
			<ParentThread transitiveParents={transitiveParents} tag={tag} />
			<PostDetails
				post={post}
				note={null}
				teaser={false}
				position={position}
				loggedIn={loggedIn}
			/>
			<PostReplies replies={replies} positions={p} loggedIn={loggedIn} />
		</>
	)
}

function ParentThread({
	transitiveParents,
	tag,
}: {
	transitiveParents: Post[]
	tag: string
}) {
	return (
		<div className="threadline">
			{transitiveParents.map(parentPost => (
				<Link key={parentPost.id} to={`/tags/${tag}/posts/${parentPost.id}`}>
					<div
						key={parentPost.id}
						className="postparent mb-1 ml-3 rounded-lg bg-post p-3 text-sm text-postparent-foreground"
					>
						<PostContent
							content={parentPost.content}
							maxLines={3}
							deactivateLinks={true}
						/>
					</div>
				</Link>
			))}
		</div>
	)
}

export function PostReplies({
	replies,
	positions,
	loggedIn,
}: {
	replies: RankedPost[]
	positions: Map<number, Direction>
	loggedIn: boolean
}) {
	const nRepliesString = replies.length == 0 ? 'No Replies' : 'Replies'

	return (
		<>
			<h2 className="mb-4 font-medium">{nRepliesString}</h2>
			{replies.length > 0 && (
				<Feed
					posts={replies}
					positions={positions}
					loggedIn={loggedIn}
					rootId={replies[0]!.parentId}
					showNotes={false}
				/>
			)}
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

export const shouldRevalidate: ShouldRevalidateFunction = (args: {
	formAction?: string | undefined
}) => {
	// Optimization that makes it so /votes don't reload the page
	if (args.formAction == '/vote') {
		return false
	}
	return true
}
