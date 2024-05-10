import { type DataFunctionArgs, json } from '@remix-run/node'

import { Link, useLoaderData } from '@remix-run/react'
import { useReducer } from 'react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { PostContent, PostDetails } from '#app/components/ui/post.tsx'
import { ReplyThread } from '#app/components/ui/reply-thread.tsx'
import { getCriticalThread, type ThreadPost } from '#app/conversations.ts'
import { type Post } from '#app/db/types.ts'

import { getTransitiveParents } from '#app/post.ts'
import {
	getRankedReplies,
	getScoredPost,
	type RankedPost,
	type ScoredPost,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { getUserVotes, type VoteState } from '#app/vote.ts'
import { Feed } from '#app/components/ui/feed.tsx'

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

	let criticalThread: ThreadPost[] = await getCriticalThread(post.id, tag)

	let votes: VoteState[] =
		userId === null
			? []
			: await getUserVotes(
					userId,
					tag,
					replies.map(p => p.id)
						.concat(criticalThread.map(p => p.id))
						.concat([post.id])
						// dedupe array: https://stackoverflow.com/a/23282067/13607059
						.filter(function(item, i, ar){ return ar.indexOf(item) === i; }),
				)

	const loggedIn = userId !== null

	let result = json({
		post,
		transitiveParents,
		replies,
		tag,
		votes,
		loggedIn,
		criticalThread,
	})

	return result
}

export default function Post() {
	const {
		post,
		transitiveParents,
		replies,
		tag,
		votes,
		loggedIn,
		criticalThread,
	} = useLoaderData<typeof loader>()

	let allVoteStates = new Map<number, VoteState>()
	for (let vote of votes) {
		allVoteStates.set(vote.postId, vote)
	}

	let vote = allVoteStates.get(post.id)!

	// https://stackoverflow.com/questions/46240647/how-to-force-a-functional-react-component-to-render/53837442#53837442
	// force this component to re-render when there is any vote on a child.
	const [, forceUpdate] = useReducer(x => x + 1, 0)

	const otherRepliesExist = replies.length > 0

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
				voteState={vote}
				loggedIn={loggedIn}
			/>
			<PostReplies
				replies={criticalThread}
				votes={allVoteStates}
				loggedIn={loggedIn}
				criticalThreadId={post.criticalThreadId}
				onVote={forceUpdate}
			/>
			{otherRepliesExist &&
				<>
					<h2 className="mb-4 font-medium">Other Replies</h2>
					<Feed
						posts={replies}
						votes={allVoteStates}
						rootId={post.id}
						loggedIn={loggedIn}
						showNotes={false}
					/>
				</>
			}
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
	votes,
	loggedIn,
	criticalThreadId,
	onVote,
}: {
	replies: ThreadPost[]
	votes: Map<number, VoteState>
	loggedIn: boolean
	criticalThreadId: number | null
	onVote: Function
}) {
	const nRepliesString = replies.length == 0 ? 'No Replies' : 'Top Conversation'

	return (
		<>
			<h2 className="mb-4 font-medium">{nRepliesString}</h2>
			{replies.length > 0 && (
				<ReplyThread
					posts={replies}
					votes={votes}
					loggedIn={loggedIn}
					targetId={replies[0]!.parentId}
					criticalThreadId={criticalThreadId}
					onVote={onVote}
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
