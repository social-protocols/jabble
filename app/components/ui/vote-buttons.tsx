import { Direction, type VoteState } from '#app/vote.ts'

export function VoteButtons({
	postId,
	vote,
	nVotes,
	voteHereIndicator,
	needsVoteOnCriticalComment,
}: {
	postId: number
	vote: VoteState
	nVotes: number
	voteHereIndicator: boolean
	needsVoteOnCriticalComment: boolean
}) {
	const upClass = vote.vote == Direction.Up ? '' : 'opacity-30'
	const downClass = vote.vote == Direction.Down ? '' : 'opacity-30'

	const textColorClass = needsVoteOnCriticalComment ? 'text-yellow-600' : ''
	const borderClass = voteHereIndicator
		? 'border-blue-500'
		: 'border-transparent'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			<div
				className={
					'flex flex-col items-center rounded-sm border-2 border-solid text-xl' +
					' ' +
					borderClass
				}
			>
				<button
					name="direction"
					value="Up"
					className={upClass + ' ' + textColorClass}
				>
					▲
				</button>
				<p className={'text-sm opacity-50'}>{nVotes}</p>
				<button
					name="direction"
					value="Down"
					className={downClass + ' ' + textColorClass}
				>
					▼
				</button>
			</div>
		</>
	)
}
