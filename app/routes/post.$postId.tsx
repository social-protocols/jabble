import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useParams } from '@remix-run/react'
import * as Immutable from 'immutable'
import { useState } from 'react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { InfoText } from '#app/components/ui/info-text.tsx'
import { ParentThread } from '#app/components/ui/parent-thread.tsx'
import { PostWithReplies } from '#app/components/ui/reply-tree.tsx'
import { db } from '#app/db.ts'
import { updateHN } from '#app/repositories/hackernews.ts'
import { getDiscussionOfTheDay, getTransitiveParents } from '#app/repositories/post.ts'
import {
	getReplyTree,
	getCommentTreeState,
	toImmutableReplyTree,
} from '#app/repositories/ranking.ts'
import { defaultVoteState } from '#app/repositories/vote.ts'
import {
	Direction,
	type ReplyTree,
	type Post,
	type CommentTreeState,
	type ImmutableReplyTree,
	type CollapsedState,
} from '#app/types/api-types.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { DiscussionOfTheDayHeader } from '#app/components/ui/discussion-of-the-day-header.tsx'

const postIdSchema = z.coerce.number()

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null
	const postId = postIdSchema.parse(params.postId)

	const {
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		isDiscussionOfTheDay,
	}: {
		mutableReplyTree: ReplyTree
		transitiveParents: Post[]
		commentTreeState: CommentTreeState
		isDiscussionOfTheDay: boolean
	} = await db.transaction().execute(async trx => {
		await updateHN(trx, postId)
		const commentTreeState = await getCommentTreeState(trx, postId, userId)
		const discussionOfTheDayPostId = await getDiscussionOfTheDay(trx)
		return {
			mutableReplyTree: await getReplyTree(
				trx,
				postId,
				userId,
				commentTreeState,
			),
			transitiveParents: await getTransitiveParents(trx, postId),
			commentTreeState: commentTreeState,
			isDiscussionOfTheDay: postId === discussionOfTheDayPostId,
		}
	})

	return json({
		mutableReplyTree,
		transitiveParents,
		commentTreeState,
		loggedIn,
		isDiscussionOfTheDay,
	})
}

export default function PostPage() {
	const { mutableReplyTree, transitiveParents, commentTreeState, loggedIn, isDiscussionOfTheDay } =
		useLoaderData<typeof loader>()

	const params = useParams()

	// subcomponent and key needed for react to not preserve state on page changes
	return (
		<>
			<InfoText className="mb-8" />
			{isDiscussionOfTheDay && <DiscussionOfTheDayHeader />}
			<DiscussionView
				key={params['postId']}
				mutableReplyTree={mutableReplyTree}
				transitiveParents={transitiveParents}
				initialCommentTreeState={commentTreeState}
				loggedIn={loggedIn}
			/>
		</>
	)
}

export function DiscussionView({
	mutableReplyTree,
	transitiveParents,
	initialCommentTreeState,
	loggedIn,
}: {
	mutableReplyTree: ReplyTree
	transitiveParents: Post[]
	initialCommentTreeState: CommentTreeState
	loggedIn: boolean
}) {
	const replyTree = toImmutableReplyTree(mutableReplyTree)
	console.log(replyTree.replies.toJS())

	const [commentTreeState, setCommentTreeState] = useState<CommentTreeState>(
		initialCommentTreeState,
	)

	const postId = replyTree.post.id

	const currentVoteState =
		commentTreeState.posts[postId]?.voteState || defaultVoteState(postId)

	const [isCollapsedState, setIsCollapsedState] = useState<CollapsedState>({
		currentlyFocussedPostId: null,
		hidePost: Immutable.Map<number, boolean>(),
		hideChildren: Immutable.Map<number, boolean>(),
	})

	return (
		<>
			<ParentThread transitiveParents={transitiveParents} />
			<PostWithReplies
				className={'mb-2 rounded-sm bg-post p-2'}
				initialReplyTree={replyTree}
				targetHasVote={currentVoteState.vote !== Direction.Neutral}
				loggedIn={loggedIn}
				focussedPostId={postId}
				pathFromFocussedPost={Immutable.List([postId])}
				commentTreeState={commentTreeState}
				setCommentTreeState={setCommentTreeState}
				isCollapsedState={isCollapsedState}
				setIsCollapsedState={setIsCollapsedState}
				onCollapseParentSiblings={pathFromFocussedPost => {
					const newCollapseState = collapseParentSiblingsAndIndirectChildren(
						pathFromFocussedPost,
						isCollapsedState,
						replyTree,
					)
					if (
						isCollapsedState.currentlyFocussedPostId !==
						newCollapseState.currentlyFocussedPostId
					) {
						setIsCollapsedState(newCollapseState)
					} else {
						setIsCollapsedState({
							currentlyFocussedPostId: null,
							hidePost: Immutable.Map(),
							hideChildren: isCollapsedState.hideChildren,
						})
					}
				}}
			/>
			<div className="h-[300px]" />
		</>
	)
}

function collapseParentSiblingsAndIndirectChildren(
	pathFromFocussedPost: Immutable.List<number>,
	collapsedState: CollapsedState,
	replyTree: ImmutableReplyTree,
): CollapsedState {
	// go down the tree along the path
	// and collapse all siblings on the way.
	let newCollapseState = collapsedState
	let currentSubTree = replyTree
	pathFromFocussedPost.rest().forEach(postId => {
		// postId must be among currentSubTree.replies
		currentSubTree.replies.forEach(reply => {
			if (reply.post.id == postId) {
				newCollapseState = {
					...newCollapseState,
					hidePost: newCollapseState.hidePost.set(reply.post.id, false),
					hideChildren: newCollapseState.hideChildren.set(reply.post.id, false),
				}
				currentSubTree = reply
			} else {
				newCollapseState = {
					...newCollapseState,
					hidePost: newCollapseState.hidePost.set(reply.post.id, true),
				}
			}
		})
	})
	currentSubTree.replies.forEach(directChild => {
		newCollapseState = {
			...newCollapseState,
			hideChildren: newCollapseState.hideChildren.set(
				directChild.post.id,
				true,
			),
		}
	})
	newCollapseState = {
		...newCollapseState,
		currentlyFocussedPostId: pathFromFocussedPost.last(),
	}
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
