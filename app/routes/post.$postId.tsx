import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostDetails } from '#app/components/ui/post-details.tsx'
import { TreeReplies } from '#app/components/ui/reply-tree.tsx'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { getTransitiveParents } from '#app/post.ts'
import {
	type ReplyTree,
	type ScoredPost,
	getReplyTree,
	getScoredPost,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { Direction } from '#app/vote.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null

	const postId = postIdSchema.parse(params.postId)
	const post: ScoredPost = await db
		.transaction()
		.execute(async trx => getScoredPost(trx, postId))

	const replyTree: ReplyTree = await db
		.transaction()
		.execute(async trx => getReplyTree(trx, postId, userId))

	const transitiveParents = await db
		.transaction()
		.execute(async trx => getTransitiveParents(trx, post.id))

	return json({ post, replyTree, transitiveParents, loggedIn })
}

export default function Post() {
	const { post, replyTree, transitiveParents, loggedIn } =
		useLoaderData<typeof loader>()
	return (
		<>
			<ParentThread transitiveParents={transitiveParents} />
			<PostDetails
				post={post}
				teaser={false}
				voteState={replyTree.voteState}
				loggedIn={loggedIn}
				className={'mb-2 rounded-sm bg-post p-2'}
			/>
			<div
				className={
					'border-left-solid ml-2 border-l-4 border-post border-transparent pl-3'
				}
			>
				<TreeReplies
					replyTree={replyTree}
					criticalCommentId={post.criticalThreadId}
					targetHasVote={replyTree.voteState.vote !== Direction.Neutral}
					loggedIn={loggedIn}
				/>
			</div>
		</>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Post not found</p>,
			}}
		/>
	)
}
