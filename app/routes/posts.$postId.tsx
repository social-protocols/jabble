import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, useNavigate } from '@remix-run/react'
import invariant from 'tiny-invariant'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { DeletedPost } from '#app/components/ui/deleted-post.tsx'
import { PostContent, PostDetails } from '#app/components/ui/post.tsx'
import { ReplyThread } from '#app/components/ui/reply-thread.tsx'
import { getCriticalThread, type ThreadPost } from '#app/conversations.ts'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
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

export async function loader({ params, request }: LoaderFunctionArgs) {
	invariant(params.postId, 'Missing postid param')
	const postId: number = postIdSchema.parse(params.postId)

	const userId: string | null = await getUserId(request)
	const post: ScoredPost = await db
		.transaction()
		.execute(async trx => getScoredPost(trx, postId))

	invariantResponse(post, 'Post not found', { status: 404 })

	const transitiveParents = await db
		.transaction()
		.execute(async trx => getTransitiveParents(trx, post.id))

	let criticalThread: ThreadPost[] = await db
		.transaction()
		.execute(async trx => getCriticalThread(trx, post.id))

	const otherReplies: ScoredPost[] = await db
		.transaction()
		.execute(async trx => getRankedDirectReplies(trx, post.id))

	let votes: VoteState[] =
		userId === null
			? []
			: await db.transaction().execute(async trx => {
					return getUserVotes(
						trx,
						userId,
						otherReplies
							.map(p => p.id)
							.concat(criticalThread.map(p => p.id))
							.concat([post.id])
							// dedupe array: https://stackoverflow.com/a/23282067/13607059
							.filter(function (item, i, ar) {
								return ar.indexOf(item) === i
							}),
					)
				})

	const loggedIn = userId !== null

	let result = json({
		post,
		transitiveParents,
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

	const navigate = useNavigate()
	const reloadPage = () => navigate('.', { replace: true })

	const otherRepliesToDisplay = otherReplies.filter(
		p => p.id !== post.topNoteId,
	)

	const otherRepliesToDisplayExist = otherRepliesToDisplay.length > 0

	const noReplies = criticalThread.length === 0 && !otherRepliesToDisplayExist

	return (
		<>
			<ParentThread transitiveParents={transitiveParents} />
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
						onVote={reloadPage}
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
						onVote={reloadPage}
					/>
				</>
			)}
		</>
	)
}

function ParentThread({ transitiveParents }: { transitiveParents: Post[]
}) {
	return (
		<div className="threadline">
			{transitiveParents.map(parentPost => (
				<Link key={parentPost.id} to={`/posts/${parentPost.id}`}>
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
	onVote,
}: {
	posts: ScoredPost[]
	voteStates: VoteState[]
	loggedIn: boolean
	onVote: Function
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
								onVote={onVote}
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

