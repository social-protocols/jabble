import { type Map } from 'immutable'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { CONVINCINGNESS_THRESHOLD } from '#app/constants.ts'
import {
	type ImmutableReplyTree,
	addReplyToReplyTree,
	type CommentTreeState,
} from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { Direction, defaultVoteState } from '#app/vote.ts'
import { PostDetails } from './post-details.tsx'

export function PostWithReplies({
	initialReplyTree,
	criticalCommentId,
	targetHasVote,
	focussedPostId,
	pathFromFocussedPost,
	loggedIn,
	postDataState,
	setPostDataState,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
	className,
}: {
	initialReplyTree: ImmutableReplyTree
	criticalCommentId: number | null
	targetHasVote: boolean
	focussedPostId: number
	pathFromFocussedPost: Immutable.List<number>
	loggedIn: boolean
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Map<number, boolean>>>
	onCollapseParentSiblings: (
		pathFromFocussedPost: Immutable.List<number>,
	) => void
	className?: string
}) {
	const effectOnParentSize = relativeEntropy(
		initialReplyTree.effect ? initialReplyTree.effect.p : 0,
		initialReplyTree.effect ? initialReplyTree.effect.q : 0,
	)
	const isConvincing = effectOnParentSize > CONVINCINGNESS_THRESHOLD

	const [replyTreeState, setReplyTreeState] = useState(initialReplyTree)
	function onReplySubmit(reply: ImmutableReplyTree) {
		const newReplyTreeState = addReplyToReplyTree(replyTreeState, reply)
		console.log('updated', newReplyTreeState)
		setReplyTreeState(newReplyTreeState)
	}

	const currentVoteState =
		postDataState[replyTreeState.post.id]?.voteState ||
		defaultVoteState(replyTreeState.post.id)

	const voteHereIndicator =
		criticalCommentId == replyTreeState.post.id &&
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
					isConvincing={isConvincing}
					voteHereIndicator={voteHereIndicator}
					className={'mt-3 ' + (className || '')}
					focussedPostId={focussedPostId}
					pathFromFocussedPost={pathFromFocussedPost}
					postDataState={postDataState}
					setPostDataState={setPostDataState}
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
						criticalCommentId={criticalCommentId}
						targetHasVote={targetHasVote}
						loggedIn={loggedIn}
						focussedPostId={focussedPostId}
						pathFromFocussedPost={pathFromFocussedPost}
						postDataState={postDataState}
						setPostDataState={setPostDataState}
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
	criticalCommentId,
	targetHasVote,
	loggedIn,
	focussedPostId,
	pathFromFocussedPost,
	postDataState,
	setPostDataState,
	isCollapsedState,
	setIsCollapsedState,
	onCollapseParentSiblings,
}: {
	initialReplyTree: ImmutableReplyTree
	criticalCommentId: number | null
	targetHasVote: boolean
	loggedIn: boolean
	focussedPostId: number
	pathFromFocussedPost: Immutable.List<number>
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
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
						criticalCommentId={criticalCommentId}
						targetHasVote={targetHasVote}
						focussedPostId={focussedPostId}
						pathFromFocussedPost={pathFromFocussedPost.push(tree.post.id)}
						loggedIn={loggedIn}
						postDataState={postDataState}
						setPostDataState={setPostDataState}
						isCollapsedState={isCollapsedState}
						setIsCollapsedState={setIsCollapsedState}
						onCollapseParentSiblings={onCollapseParentSiblings}
					/>
				)
			})}
		</>
	)
}
