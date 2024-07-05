import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction } from 'react'
import {
	type CollapsedState,
	Direction,
	type CommentTreeState,
} from '#app/types/api-types.ts'
import { invariant } from '#app/utils/misc.tsx'
import { Icon } from './icon.tsx'

export function VoteButtons({
	postId,
	focussedPostId,
	commentTreeState,
	setCommentTreeState,
	showInformedProbability,
	isCollapsedState,
	setIsCollapsedState,
}: {
	postId: number
	focussedPostId: number
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

	const upClass = postState.voteState.vote == Direction.Up ? '' : 'opacity-30'
	const downClass =
		postState.voteState.vote == Direction.Down ? '' : 'opacity-30'

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

	const responsiveSize = 'text-[30px] sm:text-lg'
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
					title={'Upvote'}
					className={`${upClass} + ${responsiveSize}`}
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
					title={'Downvote'}
					className={`${downClass} + ${responsiveSize} mt-[-3px]`}
					onClick={async () => await submitVote(Direction.Down)}
				>
					<Icon name="thick-arrow-down" />
				</button>
				<div className="mt-auto">
					{childrenHidden ? (
						<button
							title="Expand this comment"
							className={responsiveSize}
							onClick={toggleHideChildren}
						>
							<Icon name="chevron-right" />
						</button>
					) : (
						<button
							title="Collapse this comment"
							className={responsiveSize}
							onClick={toggleHideChildren}
						>
							<Icon name="chevron-down" />
						</button>
					)}
				</div>
			</div>
		</>
	)
}
