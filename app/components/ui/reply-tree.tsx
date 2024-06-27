import { type Map } from 'immutable'
import { useState, type Dispatch, type SetStateAction } from 'react'
import {
	Direction,
	type ImmutableReplyTree,
	type CommentTreeState,
} from '#app/types/api-types.ts'
import { addReplyToReplyTree } from '#app/repositories/ranking.ts'
import { defaultVoteState } from '#app/repositories/vote.ts'
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
	function onReplySubmit(reply: ImmutableReplyTree) {
		const newReplyTreeState = addReplyToReplyTree(replyTreeState, reply)
		setReplyTreeState(newReplyTreeState)
	}

	const currentVoteState =
		commentTreeState.posts[replyTreeState.post.id]?.voteState ||
		defaultVoteState(replyTreeState.post.id)

	const voteHereIndicator =
		commentTreeState.criticalCommentId === replyTreeState.post.id &&
		targetHasVote &&
		currentVoteState.vote == Direction.Neutral

	const isCollapsed = isCollapsedState.get(replyTreeState.post.id) || false

	const isRootPost = replyTreeState.post.id == focussedPostId

	const lineColor = voteHereIndicator
		? 'border-l-blue-500 dark:border-l-[#7dcfff]'
		: 'border-l-transparent'

	const lineClass = isRootPost
		? ''
		: 'border-l-4 border-solid pl-2 ' + lineColor

	return (
		<>
			<div className={lineClass}>
				<PostDetails
					post={replyTreeState.post}
					teaser={false}
					loggedIn={loggedIn}
					voteHereIndicator={voteHereIndicator}
					className={'mt-3 ' + (className || '')}
					focussedPostId={focussedPostId}
					pathFromFocussedPost={pathFromFocussedPost}
					commentTreeState={commentTreeState}
					setCommentTreeState={setCommentTreeState}
					isCollapsedState={isCollapsedState}
					setIsCollapsedState={setIsCollapsedState}
					onReplySubmit={onReplySubmit}
					onCollapseParentSiblings={onCollapseParentSiblings}
				/>
			</div>
			{!isCollapsed && (
				<div
					className={
						'border-left-solid mb-2 ml-2 border-l-4 border-post border-transparent pl-3'
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
