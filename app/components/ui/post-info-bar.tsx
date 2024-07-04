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
			<div className="flex w-full items-center space-x-2 text-xs sm:items-baseline">
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
	if (effectSize < 0.1) {
		return 'text-blue-200 dark:text-blue-900'
	} else if (effectSize < 0.2) {
		return 'text-blue-300 dark:text-blue-800'
	} else if (effectSize < 0.3) {
		return 'text-blue-400 dark:text-blue-700'
	} else if (effectSize < 0.5) {
		return 'text-blue-500 dark:text-blue-600'
	} else if (effectSize < 0.7) {
		return 'text-blue-600 dark:text-blue-500'
	} else {
		return 'text-blue-700 dark:text-blue-400'
	}
}
