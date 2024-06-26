import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import * as Immutable from 'immutable'
import { Map } from 'immutable'
import { useState } from 'react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostWithReplies } from '#app/components/ui/reply-tree.tsx'
import { db } from '#app/db.ts'
import { getTransitiveParents } from '#app/post.ts'
import {
	getReplyTree,
	getApiStatsPost,
	getCommentTreeState,
	getAllPostIdsInTree,
	toImmutableReplyTree,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { defaultVoteState } from '#app/vote.ts'
import {
  Direction, 
	type ReplyTree,
  type ApiPost,
	type CommentTreeState,
	type ImmutableReplyTree,
} from '#app/api-types.ts'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {

  console.log("===============fetching post data=====================")

  performance.clearMeasures();
  performance.clearMarks();

  performance.mark('start');

	const userId: string | null = await getUserId(request)
  performance.mark('getUserId');

	const loggedIn = userId !== null
  

	const postId = postIdSchema.parse(params.postId)
	const post: ApiPost = await db
		.transaction()
		.execute(async trx => await getApiStatsPost(trx, postId))
  
  performance.mark('getScoredPost');

	const mutableReplyTree: ReplyTree = await db
		.transaction()
		.execute(async trx => await getReplyTree(trx, postId, userId))
  
  performance.mark('getReplyTree');

	const transitiveParents: ApiPost[] = await db
		.transaction()
		.execute(async trx => await getTransitiveParents(trx, post.id))

  performance.mark('getTransitiveParents');

	const commentTreeState: CommentTreeState = await db
		.transaction()
		.execute(async trx => await getCommentTreeState(trx, postId, userId))
    
  performance.mark('getCommentTreeState');

  performance.measure('getUserId', 'start', 'getUserId');
  performance.measure('getScoredPost', 'getUserId', 'getScoredPost');
  performance.measure('getReplyTree', 'getScoredPost', 'getReplyTree');
  performance.measure('getTransitiveParents', 'getReplyTree', 'getTransitiveParents');
  performance.measure('getCommentTreeState', 'getTransitiveParents', 'getCommentTreeState');

  performance.getEntries().forEach(entry => {
    console.log(entry.name + ' duration: ' + entry.duration + ' ms')
  })

  console.log("ReplyTree", JSON.stringify(mutableReplyTree, null, 2))

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
	post: ApiPost
	mutableReplyTree: ReplyTree
	transitiveParents: ApiPost[]
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
