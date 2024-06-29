import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction } from 'react'
import { defaultVoteState } from '#app/repositories/vote.ts'
import { Direction, type CommentTreeState } from '#app/types/api-types.ts'
import { Icon } from './icon.tsx'

export function VoteButtons({
	postId,
	focussedPostId,
	needsVoteOnCriticalComment,
	commentTreeState,
	setCommentTreeState,
}: {
	postId: number
	focussedPostId: number
	needsVoteOnCriticalComment: boolean
	commentTreeState: CommentTreeState
	setCommentTreeState: Dispatch<SetStateAction<CommentTreeState>>
}) {
	const buttonColorClass = needsVoteOnCriticalComment
		? 'text-blue-500 dark:text-[#7dcfff]'
		: ''

	const currentVoteState =
		commentTreeState.posts[postId]?.voteState || defaultVoteState(postId)

	const upClass =
		currentVoteState.vote == Direction.Up ? buttonColorClass : 'opacity-30'
	const downClass =
		currentVoteState.vote == Direction.Down ? buttonColorClass : 'opacity-30'

	const pCurrent: number = commentTreeState.posts[postId]?.p || NaN
	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	const submitVote = async function (direction: Direction) {
		const payLoad = {
			postId: postId,
			focussedPostId: focussedPostId,
			direction: direction,
			currentVoteState: currentVoteState.vote,
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

	return (
		<>
			<div
				key={`vote-buttons-${focussedPostId}-${postId}`}
				className={'flex w-[32px] flex-col items-center'}
			>
				<button
					title="Upvote"
					className={upClass + ' ' + negMargin}
					onClick={async () => await submitVote(Direction.Up)}
				>
					<Icon name="thick-arrow-up" />
				</button>
				<Link to={`/stats/${postId}`} className={'text-xs opacity-50'}>
					{pCurrentString}
				</Link>
				<button
					title="Downvote"
					className={downClass + ' ' + negMargin}
					onClick={async () => await submitVote(Direction.Down)}
				>
					<Icon name="thick-arrow-down" />
				</button>
			</div>
		</>
	)
}
