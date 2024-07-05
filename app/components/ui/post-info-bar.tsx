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
			<div className="mb-1 flex w-full items-center gap-2 text-xs sm:items-baseline">
				{postState.effectOnTargetPost !== null && (
					<span title="Convincingness Score. How much this post changed people's opinion on the target post.">
						<span className="opacity-50">{(effectSize * 100).toFixed(0)}%</span>{' '}
						{convincingnessScale(effectSize)}
					</span>
				)}
				<span className="opacity-50">{ageString}</span>
				<span className="opacity-50">{postState.voteCount} votes</span>
			</div>
		</>
	)
}

function convincingnessScale(effectSize: number): string {
	if (effectSize < 0.1) {
		return ''
	} else if (effectSize < 0.3) {
		return '🔥'
	} else if (effectSize < 0.5) {
		return '🔥🔥'
	} else if (effectSize < 0.7) {
		return '🔥🔥🔥'
	} else if (effectSize < 0.9) {
		return '🔥🔥🔥🔥'
	} else {
		return '🔥🔥🔥🔥🔥'
	}
}
