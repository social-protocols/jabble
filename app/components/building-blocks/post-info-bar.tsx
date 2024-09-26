import moment from 'moment'
import { useState } from 'react'
import { type FallacyList } from '#app/modules/fallacies/fallacy-types.ts'
import { type PostState, type Post } from '#app/types/api-types.ts'

export function PostInfoBar({
	post,
	fallacyList,
	postState,
}: {
	post: Post
	fallacyList: FallacyList
	postState: PostState
}) {
	const ageString = moment(post.createdAt).fromNow()

	const isRootPost = post.parentId === null

	const fallacies = fallacyList
		.filter(f => f.probability >= 0.5)
		.sort((a, b) => b.probability - a.probability)

	const [showDetails, setShowDetails] = useState(false)

	return (
		<>
			<div className="mb-1 flex w-full flex-wrap items-start gap-2 text-xs">
				{!isRootPost && (
					<span className="opacity-50">
						{postState.voteCount} {postState.voteCount == 1 ? 'vote' : 'votes'}
					</span>
				)}
				<span className="opacity-50">{ageString}</span>
				{fallacies.map(f => (
					<span
						className={`cursor-pointer ${fallacyLabelClassNames}`}
						key={f.name}
						title={`Probability: ${(f.probability * 100).toFixed(0)}%`}
						onClick={() => setShowDetails(!showDetails)}
					>
						{f.name}
					</span>
				))}
			</div>
			{showDetails && (
				<>
					<RenderFallacyList fallacies={fallacies} className="mb-4 text-sm" />
				</>
			)}
		</>
	)
}

const fallacyLabelClassNames =
	'rounded-full bg-yellow-200 px-2 text-black dark:bg-yellow-200'
export function RenderFallacyList({
	fallacies,
	className,
}: {
	fallacies: { name: string; analysis: string; probability: number }[]
	className?: string
}) {
	return (
		<div className={`${className || ''}`}>
			<div className="my-2">
				Detected{' '}
				<a
					href="https://en.wikipedia.org/wiki/Fallacy"
					target="_blank"
					rel="noreferrer"
					className="underline"
				>
					Fallacies
				</a>
				:
			</div>
			<ul className="ml-4 list-disc">
				{fallacies.map(f => (
					<li key={f.name}>
						<span className={fallacyLabelClassNames}>{f.name}</span>
						<span className="ml-2">{(f.probability * 100).toFixed(0)}%</span>
						<div className="mb-4 mt-1">{f.analysis}</div>
					</li>
				))}
				{fallacies.length == 0 && (
					<p className="py-6">No fallacies detected.</p>
				)}
			</ul>
		</div>
	)
}
