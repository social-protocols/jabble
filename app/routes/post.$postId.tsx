import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import * as Immutable from 'immutable'
import { Map } from 'immutable'
import { useState } from 'react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostWithReplies } from '#app/components/ui/reply-tree.tsx'
import { type Post } from '#app/db/types.ts'
import { db } from '#app/db.ts'
import { getTransitiveParents } from '#app/post.ts'
import {
	type ReplyTree,
	type ScoredPost,
	getReplyTree,
	getScoredPost,
	getCommentTreeState,
	type CommentTreeState,
	getAllPostIdsInTree,
	toImmutableReplyTree,
	type ImmutableReplyTree,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { Direction, defaultVoteState } from '#app/vote.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null

	const postId = postIdSchema.parse(params.postId)
	const post: ScoredPost = await db
		.transaction()
		.execute(async trx => getScoredPost(trx, postId))

	const mutableReplyTree: ReplyTree = await db
		.transaction()
		.execute(async trx => getReplyTree(trx, postId, userId))

	const transitiveParents = await db
		.transaction()
		.execute(async trx => getTransitiveParents(trx, post.id))

	const postData: CommentTreeState = await db
		.transaction()
		.execute(async trx => await getCommentTreeState(trx, postId, userId))

	return json({ post, mutableReplyTree, transitiveParents, postData, loggedIn })
}

export default function Post() {
	const { post, mutableReplyTree, transitiveParents, postData, loggedIn } =
		useLoaderData<typeof loader>()

	const replyTree = toImmutableReplyTree(mutableReplyTree)

	const [postDataState, setPostDataState] = useState<CommentTreeState>(postData)

	const currentVoteState =
		postDataState[post.id]?.voteState || defaultVoteState(post.id)

	let initialIsCollapsedState = Map<number, boolean>()
	const allIds = getAllPostIdsInTree(replyTree)
	allIds.forEach(id => {
		if (!(id == post.id)) {
			initialIsCollapsedState = initialIsCollapsedState.set(id, false)
		}
	})
	const [isCollapsedState, setIsCollapsedState] = useState<
		Map<number, boolean>
	>(initialIsCollapsedState)

	return (
		<>
			<ParentThread transitiveParents={transitiveParents} />
			<PostWithReplies
				className={'mb-2 rounded-sm bg-post p-2'}
				initialReplyTree={replyTree}
				criticalCommentId={post.criticalThreadId}
				targetHasVote={currentVoteState.vote !== Direction.Neutral}
				loggedIn={loggedIn}
				focussedPostId={post.id}
				pathFromFocussedPost={Immutable.List()}
				postDataState={postDataState}
				setPostDataState={setPostDataState}
				isCollapsedState={isCollapsedState}
				setIsCollapsedState={setIsCollapsedState}
				onCollapseParentSiblings={pathFromFocussedPost =>
					setIsCollapsedState(
						collapseParentSiblingsAndIndirectChildren(
							pathFromFocussedPost,
							isCollapsedState,
							replyTree,
						),
					)
				}
			/>
		</>
	)
}

function collapseParentSiblingsAndIndirectChildren(
	pathFromFocussedPost: Immutable.List<number>,
	collapseState: Immutable.Map<number, boolean>,
	replyTree: ImmutableReplyTree,
): Immutable.Map<number, boolean> {
	// go down the tree along the path
	// and collapse all siblings on the way.
	let newCollapseState = collapseState
	let currentSubTree = replyTree
	pathFromFocussedPost.forEach(postId => {
		// postId must be among currentSubTree.replies
		currentSubTree.replies.forEach(reply => {
			if (reply.post.id == postId) {
				newCollapseState = newCollapseState.set(reply.post.id, false)
				currentSubTree = reply
			} else {
				newCollapseState = newCollapseState.set(reply.post.id, true)
			}
		})
	})
	// collapse all children of direct children of clicked post
	currentSubTree.replies.forEach(directChild => {
		newCollapseState = newCollapseState.set(directChild.post.id, false)
		directChild.replies.forEach(reply => {
			newCollapseState = newCollapseState.set(reply.post.id, true)
		})
	})
	return newCollapseState
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
