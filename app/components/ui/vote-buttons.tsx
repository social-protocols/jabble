import { Link } from '@remix-run/react'
import { Direction, type VoteState } from '#app/vote.ts'

export function VoteButtons({
	postId,
	focussedPostId,
	vote,
	pCurrent,
	needsVoteOnCriticalComment,
}: {
	postId: number
	focussedPostId: number
	vote: VoteState
	pCurrent: number
	needsVoteOnCriticalComment: boolean
}) {
	const buttonColorClass = needsVoteOnCriticalComment
		? 'text-blue-500 dark:text-[#7dcfff]'
		: ''

	const upClass = vote.vote == Direction.Up ? buttonColorClass : 'opacity-30'
	const downClass =
		vote.vote == Direction.Down ? buttonColorClass : 'opacity-30'

	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="focussedPostId" value={focussedPostId} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			<div className={'items-centertext-xl flex w-[32px] flex-col'}>
				<button name="direction" value="Up" className={upClass + ' my-[-5px]'}>
					▲
				</button>
				<Link to={`/stats/${postId}`} className={'text-xs opacity-50'}>
					{pCurrentString}
				</Link>
				<button
					name="direction"
					value="Down"
					className={downClass + ' my-[-5px]'}
				>
					▼
				</button>
			</div>
		</>
	)
}
