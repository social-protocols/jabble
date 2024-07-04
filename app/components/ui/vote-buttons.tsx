import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useRef, useState } from 'react'
import { Direction, ImmutableReplyTree, type CommentTreeState } from '#app/types/api-types.ts'
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
	isCollapsedState: Immutable.Map<number, boolean>
	setIsCollapsedState: Dispatch<SetStateAction<Immutable.Map<number, boolean>>>
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

	console.log(`FOR POST ${postId}`)
	const childFound = replySubTree.replies.find(replyTree => isCollapsedState.get(replyTree.post.id) ?? false)
	console.log("find output", childFound)
	const anyChildIsCollapsed = childFound !== undefined
	console.log(replySubTree.replies.toJS())
	console.log(JSON.stringify(isCollapsedState), anyChildIsCollapsed)

	function toggleCollapseSubTree() {
		const directChildIds = replySubTree.replies.map(replyTree => replyTree.post.id)
		let newIsCollapsedState = isCollapsedState
		directChildIds.forEach(childId => {
			newIsCollapsedState = newIsCollapsedState.set(childId, !anyChildIsCollapsed)
		})
		setIsCollapsedState(newIsCollapsedState)
	}

	return (
		<>
			<div
				key={`vote-buttons-${focussedPostId}-${postId}`}
				className={'flex w-[32px] flex-col items-center h-full'}
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
					{anyChildIsCollapsed ? (
						<button
							title="Expand this comment"
							className="text-[30px] sm:text-base"
							onClick={toggleCollapseSubTree}
						>
							<Icon name="plus-circled" />
						</button>
					) : (
						<button
							title="Collapse this comment"
							className="text-[30px] sm:text-base"
							onClick={toggleCollapseSubTree}
						>
							<Icon name="minus-circled" />
						</button>
					)}
				</div>
			</div>
		</>
	)
}
