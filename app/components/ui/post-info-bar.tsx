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
				<span className="opacity-50">-</span>
				<span className="opacity-50">{post.oSize} votes</span>
				{voteHereIndicator && (
					<span
						title="Take a position here to give your vote above more weight"
						className="rounded bg-blue-100 px-1 text-blue-500 dark:bg-[#2c333e] dark:text-[#7dcfff]"
					>
						Vote here
					</span>
				)}
			</div>
		</>
	)
}
