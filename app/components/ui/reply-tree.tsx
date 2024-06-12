import { type Map } from 'immutable'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { CONVINCINGNESS_THRESHOLD } from '#app/constants.ts'
import {
	type ImmutableReplyTree,
	addReplyToReplyTree,
	type CommentTreeState,
} from '#app/ranking.ts'
import { relativeEntropy } from '#app/utils/entropy.ts'
import { Direction, defaultVoteState } from '#app/vote.ts'
import { PostDetails } from './post-details.tsx'

export function TreeReplies({
	initialReplyTree,
	criticalCommentId,
	targetHasVote,
	loggedIn,
	focussedPostId,
	postDataState,
	setPostDataState,
	isCollapsedState,
	setIsCollapsedState,
}: {
	initialReplyTree: ImmutableReplyTree
	criticalCommentId: number | null
	targetHasVote: boolean
	loggedIn: boolean
	focussedPostId: number
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Map<number, boolean>>>
}) {
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
						loggedIn={loggedIn}
						postDataState={postDataState}
						setPostDataState={setPostDataState}
						isCollapsedState={isCollapsedState}
						setIsCollapsedState={setIsCollapsedState}
					/>
				)
			})}
		</>
	)
}

export function PostWithReplies({
	initialReplyTree,
	criticalCommentId,
	targetHasVote,
	focussedPostId,
	loggedIn,
	postDataState,
	setPostDataState,
	isCollapsedState,
	setIsCollapsedState,
	className,
}: {
	initialReplyTree: ImmutableReplyTree
	criticalCommentId: number | null
	targetHasVote: boolean
	focussedPostId: number
	loggedIn: boolean
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Map<number, boolean>>>
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
	const indicatorTWClass = voteHereIndicator
		? 'border-l-blue-500 border-solid border-l-4 pl-2 dark:border-l-[#7dcfff]'
		: 'border-l-transparent border-solid border-l-4 pl-2'
	return (
		<>
			<div className={indicatorTWClass}>
				<PostDetails
					post={replyTreeState.post}
					teaser={false}
					loggedIn={loggedIn}
					isConvincing={isConvincing}
					voteHereIndicator={voteHereIndicator}
					className={'mt-3 ' + (className || '')}
					focussedPostId={focussedPostId}
					postDataState={postDataState}
					setPostDataState={setPostDataState}
					isCollapsedState={isCollapsedState}
					setIsCollapsedState={setIsCollapsedState}
					onReplySubmit={onReplySubmit}
				/>
			</div>
			<div
				className={
					'border-left-solid mb-2 ml-2 border-l-4 border-post border-transparent pl-3'
				}
			>
				<TreeReplies
					initialReplyTree={replyTreeState}
					criticalCommentId={criticalCommentId}
					targetHasVote={replyTreeState.voteState.vote !== Direction.Neutral}
					loggedIn={loggedIn}
					focussedPostId={focussedPostId}
					postDataState={postDataState}
					setPostDataState={setPostDataState}
					isCollapsedState={isCollapsedState}
					setIsCollapsedState={setIsCollapsedState}
				/>
			</div>
		</>
	)
}
