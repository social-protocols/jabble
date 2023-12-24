// import { Spacer } from '#app/components/spacer.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
import {
	type ActionFunctionArgs,
	type DataFunctionArgs,
	json,
} from '@remix-run/node'

import {
	Link,
	type ShouldRevalidateFunction,
	useLoaderData,
} from '@remix-run/react'
// import assert from 'assert';
// import { Form, Link, useLoaderData, type MetaFunction } from '@remix-run/react'
// import { db } from "#app/db.ts";
// import { topNote, voteRate } from '#app/probabilities.ts';
import Markdown from 'markdown-to-jsx'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { zfd } from 'zod-form-data'
// import { Button } from '#app/components/ui/button.tsx';
// import { Link } from '@remix-run/react';

import { logPostPageView } from '#app/attention.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { PostDetails } from '#app/components/ui/post.tsx'
import { type Post } from '#app/db/types.ts'

// import type { LinksFunction } from "@remix-run/node"; // or cloudflare/deno

import { getUserPositions } from '#app/positions.ts'
import { createPost, getPost, getTransitiveParents } from '#app/post.ts'
import {
	getRankedReplies,
	getScoredPost,
	type RankedPost,
	type ScoredPost,
} from '#app/ranking.ts'
import { getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'

import { Direction } from '#app/vote.ts'

// const GLOBAL_TAG = "global";

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()
const contentSchema = z.coerce.string()

// export const handle = {
//   scripts: () => [{ src: '/js/vote.js' }]
// }

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

	await logPostPageView(tag, post.id, userId)

	// So the first of the replies and the top note are not necessarily the same thing?!?
	// The top note is the most convincing one. But the replies are ordered by *information rate*.

	// let topNote: Post | null = replies.length > 0 ? replies[0]! : null
	let topNote = post.topNoteId ? await getPost(post.topNoteId) : null

	// let positions: Map<number, Direction> = new Map<number, Direction>()
	let positions =
		userId === null
			? []
			: await getUserPositions(
				userId,
				tag,
				replies.map(p => p.id).concat([post.id]),
			)

	let result = json({
		post,
		transitiveParents,
		replies,
		tag,
		positions,
		topNote,
	})

	return result
}

const replySchema = zfd.formData({
	parentId: postIdSchema,
	tag: tagSchema,
	content: contentSchema,
})

export const action = async (args: ActionFunctionArgs) => {
	let request = args.request
	const formData = await request.formData()

	const userId: string = await requireUserId(request)

	const parsedData = replySchema.parse(formData)
	const content = parsedData.content
	const parentId = parsedData.parentId
	const tag = parsedData.tag

	invariant(content, 'content !== undefined')
	invariant(tag, "tag !== ''")

	let newPostId = await createPost(tag, parentId, content, userId)

	console.log('New post id', newPostId)

	return json({ newPostId: newPostId })
}

export default function Post() {
	const { post, transitiveParents, replies, tag, positions, topNote } =
		useLoaderData<typeof loader>()

	let p = new Map<number, Direction>()
	for (let position of positions) {
		p.set(position.postId, position.direction)
	}

	let position = p.get(post.id) || Direction.Neutral
	let notePosition: Direction =
		(topNote && p.get(topNote.id)) || Direction.Neutral

	return (
		<>
			<div className="mb-5">
				<Link to={`/`}>Home</Link>
				&nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
				&nbsp; &gt; View post
			</div>
			<ParentThread transitiveParents={transitiveParents} tag={tag} />
			<PostDetails
				tag={tag}
				post={post}
				note={topNote}
				teaser={false}
				randomLocation={null}
				position={position}
				notePosition={notePosition}
			/>
			<PostReplies tag={tag} replies={replies} positions={p} />
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
		<div className="border-postparent-threadline border-l-4">
			{transitiveParents.map(parentPost => (
				<Link key={parentPost.id} to={`/tags/${tag}/posts/${parentPost.id}`}>
					<div
						key={parentPost.id}
						className="markdown postparent text-postparent-foreground mb-2 ml-3 rounded-lg bg-post p-3 text-sm"
					>
						<Markdown>{parentPost.content}</Markdown>
					</div>
				</Link>
			))}
		</div>
	)
}

export function PostReplies({
	tag,
	replies,
	positions,
}: {
	tag: string
	replies: RankedPost[]
	positions: Map<number, Direction>
}) {
	return (
		<>
			<h2 className="mb-4 font-medium">{replies.length} Replies</h2>
			{replies.length > 0 && (
				<ol>
					{replies.map((post: RankedPost) => {
						// let randomLocation = {locationType: LocationType.PostReplies, oneBasedRank: i + 1}

						let position: Direction =
							positions.get(post.id) || Direction.Neutral

						return (
							<li key={post.id}>
								<PostDetails
									tag={tag}
									post={post}
									note={post.note}
									teaser={true}
									randomLocation={null}
									position={position}
									notePosition={Direction.Neutral}
								/>
							</li>
						)
					})}
				</ol>
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