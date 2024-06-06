import { Direction, type VoteState } from '#app/vote.ts'

export function VoteButtons({
	postId,
	vote,
}: {
	postId: number
	vote: VoteState
}) {
	const upClass = vote.vote == Direction.Up ? '' : 'opacity-30'
	const downClass = vote.vote == Direction.Down ? '' : 'opacity-30'

	return (
		<>
			<input type="hidden" name="postId" value={postId} />
			<input type="hidden" name="state" value={Direction[vote.vote]} />

			<div className="flex flex-col text-xl">
				<button name="direction" value="Up" className={upClass}>
					▲
				</button>
				<button name="direction" value="Down" className={downClass}>
					▼
				</button>
			</div>
		</>
	)
}
