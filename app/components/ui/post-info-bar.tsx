import moment from 'moment'
import { effectSizeOnTarget } from '#app/repositories/ranking.ts'
import { type PostState, type Post } from '#app/types/api-types.ts'

export function PostInfoBar({
	post,
	postState,
}: {
	post: Post
	postState: PostState
}) {
	const ageString = moment(post.createdAt).fromNow()
	const effectSize = effectSizeOnTarget(postState.effectOnTargetPost)

	return (
		<>
			<div className="flex w-full items-center space-x-2 text-xs sm:items-baseline pb-1">
				{postState.effectOnTargetPost !== null ? (
					<span
						title="How much this post changed people's view on the focussed post."
						className={`${scaleColorConvincing(effectSize)}`}
					>
						convincing: {effectSize.toFixed(2)}
					</span>
				) : (
					''
				)}
				<span className="opacity-50">{ageString}</span>
				<span className="opacity-50">{postState.voteCount} votes</span>
			</div>
		</>
	)
}

function scaleColorConvincing(effectSize: number): string {
	// Convert a numeric effect size (in bits) to a color class.
	// So far, the mapping is arbitrary, we can replace this with a more
	// sophisticated function once we know what values are common and once we get
	// a feeling for what values are large or small.
	const baseClass = 'border-solid border-2 px-1 rounded'
	if (effectSize < 0.1) {
		return `${baseClass} text-blue-200 border-blue-200 dark:text-blue-900 dark:border-blue-900`
	} else if (effectSize < 0.2) {
		return `${baseClass} text-blue-300 border-blue-300 dark:text-blue-800 dark:border-blue-800`
	} else if (effectSize < 0.3) {
		return `${baseClass} text-blue-400 border-blue-400 dark:text-blue-700 dark:border-blue-700`
	} else if (effectSize < 0.5) {
		return `${baseClass} text-blue-500 border-blue-500 dark:text-blue-600 dark:border-blue-600`
	} else if (effectSize < 0.7) {
		return `${baseClass} text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500`
	} else {
		return `${baseClass} text-blue-700 border-blue-700 dark:text-blue-400 dark:border-blue-400`
	}
}
