import { type DataFunctionArgs, json } from '@remix-run/node'

import { Link, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Feed } from '#app/components/ui/feed.tsx'
import { PostContent, PostDetails } from '#app/components/ui/post.tsx'
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
import { ReplyThread } from '#app/components/ui/reply-thread.tsx'

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

	// let positions: Map<number, VoteState> = new Map<number, VoteState>()
	let votes =
		userId === null
			? []
			: await getUserVotes(
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
		votes,
		loggedIn,
	})

	return result
}

export default function Post() {
	const { post, transitiveParents, replies, tag, votes, loggedIn } =
		useLoaderData<typeof loader>()

	let v = new Map<number, VoteState>()
	for (let vote of votes) {
		v.set(vote.postId, vote)
	}

	let vote = v.get(post.id)!

	// let criticalThreadId = post.criticalThreadId;
	// let isInformed = post.criticalThreadId == null ? true : ( v.get(criticalThreadId!) || Direction.Neutral ) !== Direction.Neutral
	// console.log("Critical Comment id", criticalThreadId)
	// console.log("Vote on critical  comment", v.get(criticalThreadId!))
	console.log('Votes', votes)
	console.log('v', v)
	console.log('Vote', vote)

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
				vote={vote}
				loggedIn={loggedIn}
			/>
			<PostReplies replies={replies} votes={v} loggedIn={loggedIn} criticalThreadId={post.criticalThreadId}/>
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
}: {
	replies: RankedPost[]
	votes: Map<number, VoteState>
	loggedIn: boolean
	criticalThreadId: number | null
}) {
	const nRepliesString = replies.length == 0 ? 'No Replies' : 'Replies'

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
