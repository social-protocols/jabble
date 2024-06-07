import moment from 'moment'
import { type ScoredPost } from '#app/ranking.js'

export function PostInfoBar({
	post,
	isConvincing,
	needsVoteOnCriticalComment,
	voteHereIndicator,
}: {
	post: ScoredPost
	isConvincing: boolean
	needsVoteOnCriticalComment: boolean
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
				{needsVoteOnCriticalComment && (
					<span
						title="Your vote will count as informed, once you voted on the most convincing comments."
						className="rounded bg-yellow-100 px-1 italic text-yellow-600 dark:bg-[#4a3c3c] dark:text-[#ff9e64]"
					>
						Your vote is uninformed
					</span>
				)}
				{voteHereIndicator && (
					<span className="rounded bg-blue-100 px-1 italic text-blue-500 dark:bg-[#2c333e] dark:text-[#7dcfff]">
						Vote here
					</span>
				)}
			</div>
		</>
	)
}
