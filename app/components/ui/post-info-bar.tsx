import { Link } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import invariant from 'tiny-invariant'
import { effectSizeOnTarget } from '#app/repositories/ranking.ts'
import { type PostState, type Post } from '#app/types/api-types.ts'
import { type FallacyDetection } from '#app/utils/fallacy_detection.ts'

const effectSizeThresholds: number[] = [0.1, 0.3, 0.5, 0.7, 0.9]

function convincingnessScale(effectSize: number): string {
	let numberOfFlames = 0

	for (let i = 0; i < effectSizeThresholds.length; i++) {
		const threshold = effectSizeThresholds[i]
		invariant(threshold !== undefined)
		if (effectSize < threshold) {
			break
		}
		numberOfFlames++
	}

	return '🔥'.repeat(numberOfFlames)
}

export function PostInfoBar({
	post,
	fallacyDetection,
	postState,
}: {
	post: Post
	fallacyDetection: FallacyDetection | null
	postState: PostState
}) {
	const ageString = moment(post.createdAt).fromNow()
	const effectSize = effectSizeOnTarget(postState.effectOnTargetPost)

	invariant(effectSizeThresholds[0] !== undefined)
	const fallacies = (fallacyDetection?.detected_fallacies || []).filter(
		f => f.probability >= 0.7,
	)

	const [showDetails, setShowDetails] = useState(false)

	return (
		<>
			<div className="mb-1 flex w-full items-center gap-2 text-xs sm:items-baseline">
				{effectSize > effectSizeThresholds[0] && (
					<span title="Convincingness Score. How much this post changed people's opinion on the target post.">
						<span className="opacity-50">convincing:</span>{' '}
						{convincingnessScale(effectSize)}
					</span>
				)}
				<span className="opacity-50">
					{postState.voteCount} {postState.voteCount == 1 ? 'vote' : 'votes'}
				</span>
				<span className="opacity-50">{ageString}</span>
				{fallacies.map(f => (
					<span
						className="cursor-pointer rounded-lg bg-yellow-400 px-2"
						key={f.name}
						onClick={() => setShowDetails(!showDetails)}
					>
						{f.name}
					</span>
				))}
			</div>
			{showDetails && (
				<div className="mb-4 text-sm">
					{fallacies.map(f => (
						<div key={f.name}>
							<span className="rounded-lg bg-yellow-400 px-2">{f.name}</span>
							<div>{f.analysis}</div>
						</div>
					))}
				</div>
			)}
		</>
	)
}
