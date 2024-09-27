import { Link } from '@remix-run/react'
import { PollType } from '#app/modules/posts/post-types.ts'

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
		pollType == PollType.FactCheck ? 'Accuracy estimate' : 'Informed agreement'

	const pollTypeString =
		pollType == PollType.FactCheck ? 'fact check' : 'opinion'

	return (
		<div className="border-l-solid ml-2 min-w-32 space-y-1 border-l-2 pl-2 opacity-50">
			<span className="italic text-purple-700 dark:text-purple-200">
				{pollTypeString}
			</span>
			<div className="text-5xl">
				<Link title={probabilityTitleString} to={`/stats/${postId}`}>
					{pCurrentString}
				</Link>
			</div>
			<div className="text-xs">{probabilityDescriptionString}</div>
			<div title="Number of votes this result is based on" className="text-xs">
				based on{' '}
				<span className="text-purple-700 dark:text-purple-200">
					{voteCount} {voteCount == 1 ? 'vote' : 'votes'}
				</span>
			</div>
		</div>
	)
}
