import { json, type LoaderFunctionArgs } from '@remix-run/node'

import { Link, useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { DeletedPost } from '#app/components/ui/deleted-post.tsx'
import { PostContent, PostDetails } from '#app/components/ui/post.tsx'
import { ReplyThread } from '#app/components/ui/reply-thread.tsx'
import { getCriticalThread, type ThreadPost } from '#app/conversations.ts'
import { type Post } from '#app/db/types.ts'

import { getTransitiveParents } from '#app/post.ts'
import {
	getRankedDirectReplies,
	getScoredPost,
	type ScoredPost,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { getUserVotes, type VoteState } from '#app/vote.ts'

const postIdSchema = z.coerce.number()
const tagSchema = z.coerce.string()

export async function loader({ params, request }: LoaderFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	invariant(params.tag, 'Missing tag param')
	const postId: number = postIdSchema.parse(params.postId)
	const tag: string = tagSchema.parse(params.tag)

	const userId: string | null = await getUserId(request)
	const post: ScoredPost = await getScoredPost(tag, postId)

	invariantResponse(post, 'Post not found', { status: 404 })

	const transitiveParents = await getTransitiveParents(post.id)

	let criticalThread: ThreadPost[] = await getCriticalThread(post.id, tag)

	const otherReplies: ScoredPost[] = await getRankedDirectReplies(tag, post.id)

	let votes: VoteState[] =
		userId === null
			? []
			: await getUserVotes(
					userId,
					tag,
					otherReplies
						.map(p => p.id)
						.concat(criticalThread.map(p => p.id))
						.concat([post.id])
						// dedupe array: https://stackoverflow.com/a/23282067/13607059
						.filter(function (item, i, ar) {
							return ar.indexOf(item) === i
						}),
				)

	const loggedIn = userId !== null

	let result = json({
		post,
		transitiveParents,
		tag,
		votes,
		loggedIn,
		criticalThread,
		otherReplies,
	})

	return result
}

export default function Post() {
	const {
		post,
		transitiveParents,
		tag,
		votes,
		loggedIn,
		criticalThread,
		otherReplies,
	} = useLoaderData<typeof loader>()

	let allVoteStates = new Map<number, VoteState>()
	for (let vote of votes) {
		allVoteStates.set(vote.postId, vote)
	}

	let vote = allVoteStates.get(post.id)

	const otherRepliesToDisplay = otherReplies.filter(
		p => p.id !== post.topNoteId,
	)

	const otherRepliesToDisplayExist = otherRepliesToDisplay.length > 0

	const noReplies = criticalThread.length === 0 && !otherRepliesToDisplayExist

	return (
		<>
			<div className="mb-5">
				<Link to={`/`}>Home</Link>
				&nbsp; &gt; <Link to={`/tags/${tag}`}>#{tag}</Link>
			</div>
			<ParentThread transitiveParents={transitiveParents} tag={tag} />
			{post.deletedAt == null ? (
				<PostDetails
					key={post.id}
					post={post}
					note={null}
					teaser={false}
					voteState={vote}
					loggedIn={loggedIn}
				/>
			) : (
				<DeletedPost post={post} />
			)}
			{noReplies && <h2 className="mb-4 font-medium">No Replies</h2>}
			{criticalThread.length > 0 && (
				<>
					<h2 className="mb-4 font-medium">Top Conversation</h2>
					<ReplyThread
						posts={criticalThread}
						votes={allVoteStates}
						loggedIn={loggedIn}
						targetId={post.id}
						criticalThreadId={post.criticalThreadId}
					/>
				</>
			)}
			{otherRepliesToDisplayExist && (
				<>
					<h2 className="mb-4 font-medium">Replies</h2>
					<DirectReplies
						posts={otherRepliesToDisplay}
						voteStates={votes}
						loggedIn={loggedIn}
					/>
				</>
			)}
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
						{parentPost.deletedAt == null ? (
							<PostContent
								content={parentPost.content}
								maxLines={3}
								deactivateLinks={true}
							/>
						) : (
							<div
								style={{ cursor: 'pointer' }}
								className={'italic text-gray-400'}
							>
								This post was deleted.
							</div>
						)}
					</div>
				</Link>
			))}
		</div>
	)
}

function DirectReplies({
	posts,
	voteStates,
	loggedIn,
}: {
	posts: ScoredPost[]
	voteStates: VoteState[]
	loggedIn: boolean
}) {
	const voteStatesMap = new Map<number, VoteState>()
	voteStates.forEach(voteState => {
		voteStatesMap.set(voteState.postId, voteState)
	})

	return (
		<>
			{posts.map(post => {
				const vs = voteStatesMap.get(post.id)
				return (
					<div key={post.id}>
						{post.deletedAt == null ? (
							<PostDetails
								post={post}
								note={null}
								teaser={true}
								voteState={vs}
								loggedIn={loggedIn}
							/>
						) : (
							<DeletedPost post={post} />
						)}
					</div>
				)
			})}
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
