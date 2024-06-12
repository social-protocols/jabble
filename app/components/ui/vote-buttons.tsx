import { Link } from '@remix-run/react'
import { type Dispatch, type SetStateAction } from 'react'
import { type CommentTreeState } from '#app/ranking.js'
import { Direction, defaultVoteState } from '#app/vote.ts'

export function VoteButtons({
	postId,
	focussedPostId,
	needsVoteOnCriticalComment,
	postDataState,
	setPostDataState,
}: {
	postId: number
	focussedPostId: number
	needsVoteOnCriticalComment: boolean
	postDataState: CommentTreeState
	setPostDataState: Dispatch<SetStateAction<CommentTreeState>>
}) {
	const buttonColorClass = needsVoteOnCriticalComment
		? 'text-blue-500 dark:text-[#7dcfff]'
		: ''

	const currentVoteState =
		postDataState[postId]?.voteState || defaultVoteState(postId)

	const upClass =
		currentVoteState.vote == Direction.Up ? buttonColorClass : 'opacity-30'
	const downClass =
		currentVoteState.vote == Direction.Down ? buttonColorClass : 'opacity-30'

	const pCurrent: number = postDataState[postId]?.p || NaN
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
		const newPostDataState = (await response.json()) as CommentTreeState
		setPostDataState(newPostDataState)
	}

	return (
		<>
			<div key={`vote-buttons-${focussedPostId}-${postId}`} className={'items-centertext-xl flex w-[32px] flex-col'}>
				<button
					className={upClass + ' my-[-5px]'}
					onClick={async () => await submitVote(Direction.Up)}
				>
					▲
				</button>
				<Link to={`/stats/${postId}`} className={'text-xs opacity-50'}>
					{pCurrentString}
				</Link>
				<button
					className={downClass + ' my-[-5px]'}
					onClick={async () => await submitVote(Direction.Down)}
				>
					▼
				</button>
			</div>
		</>
	)
}
