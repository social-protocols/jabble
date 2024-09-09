import { Link } from '@remix-run/react'
import { PollType } from '#app/types/api-types.ts'

export default function PollResult({
	postId,
	pCurrent,
	voteCount,
	pollType,
}: {
	postId: number
	pCurrent: number
	voteCount: number
	pollType: PollType | null
}) {
	const pCurrentString: string = (pCurrent * 100).toFixed(0) + '%'

	// TODO: handle else case properly
	const probabilityTitleString: string =
		pollType == PollType.FactCheck
			? 'Probability of the claim being true'
			: 'Informed consensus'

	// TODO: handle else case properly
	const probabilityDescriptionString: string =
		pollType == PollType.FactCheck ? 'Accuracy estimate' : 'Informed consensus'

	return (
		<div className="mx-2 min-w-32 space-y-1 opacity-50">
			<div className="text-sm">{probabilityDescriptionString}</div>
			<div className="text-5xl">
				<Link title={probabilityTitleString} to={`/stats/${postId}`}>
					{pCurrentString}
				</Link>
			</div>
			<div title="Number of votes this result is based on" className="text-sm">
				{voteCount} {voteCount == 1 ? 'vote' : 'votes'}
			</div>
		</div>
	)
}
