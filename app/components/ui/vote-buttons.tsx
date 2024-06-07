import { Direction, type VoteState } from '#app/vote.ts'

export function VoteButtons({
	postId,
	vote,
	pCurrent,
	needsVoteOnCriticalComment,
}: {
	postId: number
	vote: VoteState
	pCurrent: number,
	needsVoteOnCriticalComment: boolean
}) {
	const buttonColorClass = needsVoteOnCriticalComment
		? 'text-yellow-500 dark:text-[#ff9e64]'
		: ''

	const upClass = vote.vote == Direction.Up ? buttonColorClass : 'opacity-30'
	const downClass =
		vote.vote == Direction.Down ? buttonColorClass : 'opacity-30'


	const pCurrentString: String = (pCurrent * 100).toFixed(0) + '%'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			<div
				className={'flex flex-col items-centertext-xl'}
			>
				<button name="direction" value="Up" className={upClass + ' my-[-5px]'}>
					▲
				</button>
				<p className={'text-xs opacity-50'}>{pCurrentString}</p>
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
