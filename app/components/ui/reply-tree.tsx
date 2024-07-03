import { type Map } from 'immutable'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { addReplyToReplyTree } from '#app/repositories/ranking.ts'
import {
	type ImmutableReplyTree,
	type CommentTreeState,
} from '#app/types/api-types.ts'
import { PostDetails } from './post-details.tsx'

export function PostWithReplies({
	initialReplyTree,
	targetHasVote,
	focussedPostId,
	pathFromFocussedPost,
	loggedIn,
	commentTreeState,
	setCommentTreeState,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
	className,
}: {
	initialReplyTree: ImmutableReplyTree
	targetHasVote: boolean
	focussedPostId: number
	pathFromFocussedPost: Immutable.List<number>
	loggedIn: boolean
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Map<number, boolean>>>
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
	className?: string
}) {
	const [replyTreeState, setReplyTreeState] = useState(initialReplyTree)
	const postId = replyTreeState.post.id
	function onReplySubmit(reply: ImmutableReplyTree) {
		const newReplyTreeState = addReplyToReplyTree(replyTreeState, reply)
		setReplyTreeState(newReplyTreeState)
	}

	const isCollapsed = isCollapsedState.get(postId) ?? false

	return (
		<>
			<PostDetails
				key={`${postId}-postdetails`}
				post={replyTreeState.post}
				teaser={false}
				loggedIn={loggedIn}
				className={(isCollapsed ? '' : 'mb-3 ') + (className ?? '')}
				focussedPostId={focussedPostId}
				pathFromFocussedPost={pathFromFocussedPost}
				commentTreeState={commentTreeState}
				setCommentTreeState={setCommentTreeState}
				isCollapsedState={isCollapsedState}
				setIsCollapsedState={setIsCollapsedState}
				onReplySubmit={onReplySubmit}
				onCollapseParentSiblings={onCollapseParentSiblings}
			/>
			{!isCollapsed && (
				<div
					key={`${postId}-subtree`}
					className={
						'border-left-solid ml-2 border-l-4 border-post border-transparent pl-3'
					}
				>
					<TreeReplies
						initialReplyTree={replyTreeState}
						targetHasVote={targetHasVote}
						loggedIn={loggedIn}
						focussedPostId={focussedPostId}
						pathFromFocussedPost={pathFromFocussedPost}
						commentTreeState={commentTreeState}
						setCommentTreeState={setCommentTreeState}
						isCollapsedState={isCollapsedState}
						setIsCollapsedState={setIsCollapsedState}
						onCollapseParentSiblings={onCollapseParentSiblings}
					/>
				</div>
			)}
		</>
	)
}

function TreeReplies({
	initialReplyTree,
	targetHasVote,
	loggedIn,
	focussedPostId,
	pathFromFocussedPost,
	commentTreeState,
	setCommentTreeState,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
}: {
	initialReplyTree: ImmutableReplyTree
	targetHasVote: boolean
	loggedIn: boolean
	focussedPostId: number
	pathFromFocussedPost: Immutable.List<number>
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Map<number, boolean>>>
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
}) {
	// The purpose of this component is to be able to give state to its children
	// so that each one can maintain and update its own children state.
	return (
		<>
			{initialReplyTree.replies.map((tree: ImmutableReplyTree) => {
				return (
					<PostWithReplies
						key={`${focussedPostId}-${tree.post.id}`}
						initialReplyTree={tree}
						targetHasVote={targetHasVote}
						focussedPostId={focussedPostId}
						pathFromFocussedPost={pathFromFocussedPost.push(tree.post.id)}
						loggedIn={loggedIn}
						commentTreeState={commentTreeState}
						setCommentTreeState={setCommentTreeState}
						isCollapsedState={isCollapsedState}
						setIsCollapsedState={setIsCollapsedState}
						onCollapseParentSiblings={onCollapseParentSiblings}
					/>
				)
			})}
		</>
	)
}
