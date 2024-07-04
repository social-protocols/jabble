import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useRef, useState } from 'react'
import {
	CollapsedState,
	Direction,
	ImmutableReplyTree,
	type CommentTreeState,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

export function VoteButtons({
	postId,
	focussedPostId,
	replySubTree,
	hasUninformedVote,
	commentTreeState,
	setCommentTreeState,
	showInformedProbability,
	isCollapsedState,
	setIsCollapsedState,
}: {
	postId: number
	focussedPostId: number
	replySubTree: ImmutableReplyTree
	hasUninformedVote: boolean
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
	showInformedProbability: boolean
	isCollapsedState: CollapsedState
	setIsCollapsedState: Dispatch<SetStateAction<CollapsedState>>
}) {
	const postState = commentTreeState.posts[postId]
	invariant(
		postState !== undefined,
		`post ${postId} not found in commentTreeState`,
	)

	const buttonColorClass = hasUninformedVote
		? 'text-blue-500 dark:text-[#7dcfff]'
		: ''

	const upClass =
		postState.voteState.vote == Direction.Up ? buttonColorClass : 'opacity-30'
	const downClass =
		postState.voteState.vote == Direction.Down ? buttonColorClass : 'opacity-30'

	const pCurrent: number = commentTreeState.posts[postId]?.p || NaN
	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	const submitVote = async function (direction: Direction) {
		const payLoad = {
			postId: postId,
			focussedPostId: focussedPostId,
			direction: direction,
			currentVoteState: postState.voteState.vote,
		}
		const response = await fetch('/vote', {
			method: 'POST',
			body: JSON.stringify(payLoad),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		const newCommentTreeState = (await response.json()) as CommentTreeState
		setCommentTreeState(newCommentTreeState)
	}

	const negMargin = 'my-[-1px]'
	const responsiveSize = 'text-[30px] sm:text-base'
	const childrenHidden = isCollapsedState.hideChildren.get(postId) ?? false

	function toggleHideChildren() {
		setIsCollapsedState({
			...isCollapsedState,
			hideChildren: isCollapsedState.hideChildren.set(postId, !childrenHidden),
		})
	}

	return (
		<>
			<div
				key={`vote-buttons-${focussedPostId}-${postId}`}
				className={'flex h-full w-[32px] flex-col items-center'}
			>
				<button
					title={
						hasUninformedVote
							? "Your vote is uninformed. To make it informed, please vote on the comment labeled 'Vote here'"
							: 'Upvote'
					}
					className={upClass + ' ' + negMargin + ' ' + responsiveSize}
					onClick={async () => await submitVote(Direction.Up)}
				>
					<Icon name="thick-arrow-up" />
				</button>
				{showInformedProbability && (
					<Link to={`/stats/${postId}`} className={'text-xs opacity-50'}>
						{pCurrentString}
					</Link>
				)}
				<button
					title={
						hasUninformedVote
							? "Your vote is uninformed. To make it informed, please vote on the comment labeled 'Vote here'"
							: 'Downvote'
					}
					className={downClass + ' ' + negMargin + ' ' + responsiveSize}
					onClick={async () => await submitVote(Direction.Down)}
				>
					<Icon name="thick-arrow-down" />
				</button>
				<div className="mt-auto">
					{childrenHidden ? (
						<button
							title="Expand this comment"
							className="text-[30px] sm:text-base"
							onClick={toggleHideChildren}
						>
							<Icon name="plus-circled" />
						</button>
					) : (
						<button
							title="Collapse this comment"
							className="text-[30px] sm:text-base"
							onClick={toggleHideChildren}
						>
							<Icon name="minus-circled" />
						</button>
					)}
				</div>
			</div>
		</>
	)
}
