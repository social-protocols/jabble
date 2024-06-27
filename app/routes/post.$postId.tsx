import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import * as Immutable from 'immutable'
import { Map } from 'immutable'
import { useState } from 'react'
import { z } from 'zod'
import {
	Direction,
	type ReplyTree,
	type Post,
	type CommentTreeState,
	type ImmutableReplyTree,
} from '#app/types/api-types.ts'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostWithReplies } from '#app/components/ui/reply-tree.tsx'
import { db } from '#app/db.ts'
import { getPost, getTransitiveParents } from '#app/repositories/post.ts'
import {
	getReplyTree,
	getCommentTreeState,
	getAllPostIdsInTree,
	toImmutableReplyTree,
} from '#app/repositories/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { defaultVoteState } from '#app/repositories/vote.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)

	const loggedIn = userId !== null

	const postId = postIdSchema.parse(params.postId)
	const post: Post = await db
		.transaction()
		.execute(async trx => await getPost(trx, postId))

	const mutableReplyTree: ReplyTree = await db
		.transaction()
		.execute(async trx => await getReplyTree(trx, postId, userId))

	const transitiveParents: Post[] = await db
		.transaction()
		.execute(async trx => await getTransitiveParents(trx, post.id))

	const commentTreeState: CommentTreeState = await db
		.transaction()
		.execute(async trx => await getCommentTreeState(trx, postId, userId))

	return json({
		post,
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		loggedIn,
	})
}

export default function PostPage() {
	const {
		post,
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		loggedIn,
	} = useLoaderData<typeof loader>()

	const params = useParams()

	// subcomponent and key needed for react to not preserve state on page changes
	return (
		<Post
			key={params['postId']}
			post={post}
			mutableReplyTree={mutableReplyTree}
			transitiveParents={transitiveParents}
			initialCommentTreeState={commentTreeState}
			loggedIn={loggedIn}
		/>
	)
}

function Post({
	post,
	mutableReplyTree,
	transitiveParents,
	initialCommentTreeState,
	loggedIn,
}: {
	post: Post
	mutableReplyTree: ReplyTree
	transitiveParents: Post[]
	initialCommentTreeState: CommentTreeState
	loggedIn: boolean
}) {
	const replyTree = toImmutableReplyTree(mutableReplyTree)

	const [commentTreeState, setCommentTreeState] = useState<CommentTreeState>(
		initialCommentTreeState,
	)

	const currentVoteState =
		commentTreeState.posts[post.id]?.voteState || defaultVoteState(post.id)

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
				targetHasVote={currentVoteState.vote !== Direction.Neutral}
				loggedIn={loggedIn}
				focussedPostId={post.id}
				pathFromFocussedPost={Immutable.List()}
				commentTreeState={commentTreeState}
				setCommentTreeState={setCommentTreeState}
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
