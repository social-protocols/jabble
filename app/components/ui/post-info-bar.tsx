import moment from 'moment'
import { type ScoredPost } from '#app/ranking.js'

export function PostInfoBar({
	post,
	isConvincing,
	voteHereIndicator,
}: {
	post: ScoredPost
	isConvincing: boolean
	voteHereIndicator: boolean
}) {
	const ageString = moment(post.createdAt).fromNow()

	return (
		<>
			<div className="flex w-full space-x-2 text-sm">
				{isConvincing && (
					<span title="Convincing" className="">
						💡
					</span>
				)}
				<span className="opacity-50">{ageString}</span>
				{voteHereIndicator && (
					<span className="rounded bg-blue-100 px-1 italic text-blue-600">
						Take a position to give your vote more weight
					</span>
				)}
			</div>
		</>
	)
}
