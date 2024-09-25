import { useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { AnalyzeForm } from '#app/components/building-blocks/analyze-form.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { RenderFallacyList } from '#app/components/building-blocks/post-info-bar.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/db.ts'
import { getNLatestPlaygroundPosts } from '#app/repositories/playground-post.ts'
import { type PlaygroundPost } from '#app/types/api-types.ts'

export async function loader() {
	const latestPlaygroundPosts = await db
		.transaction()
		.execute(async trx => await getNLatestPlaygroundPosts(trx, 10))
	return { latestPlaygroundPosts }
}

export default function BullShredder() {
	const { latestPlaygroundPosts } = useLoaderData<typeof loader>()

	const [playgroundPostFeed, setPlaygroundPostFeed] = useState<
		PlaygroundPost[]
	>(latestPlaygroundPosts)

	const infoText = `
# Jabble Fallacy Detection

This tool analyzes your posts for [rhetorical fallacies](https://en.wikipedia.org/wiki/Fallacy).
You can use it to review your own social media posts or to detect whether someone else is trying to manipulate you.
	`

	const [currentAnalysis, setCurrentAnalysis] = useState<PlaygroundPost | null>(
		null,
	)

	return (
		<div>
			<div className="mb-4 space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
				<AnalyzeForm
					setPlaygroundPosts={setPlaygroundPostFeed}
					setCurrentAnalysis={setCurrentAnalysis}
					className="mb-6"
				/>
				{currentAnalysis && (
					<div>
						<div className="mb-1 flex w-full flex-wrap items-start gap-2">
							<RenderFallacyList
								fallacies={currentAnalysis.detection}
								className="mb-4"
							/>
						</div>
					</div>
				)}
			</div>
			<div className="p-4">
				<Markdown deactivateLinks={true}>{'## Recent Fallacy Checks'}</Markdown>
				<div className="mt-3 space-y-7">
					{playgroundPostFeed.map(post => {
						return (
							<FrontpagePlaygroundPost
								key={`playground-post-` + post.id}
								playgroundPost={post}
							/>
						)
					})}
				</div>
			</div>
		</div>
	)
}

function FrontpagePlaygroundPost({
	playgroundPost,
}: {
	playgroundPost: PlaygroundPost
}) {
	return (
		<div>
			<PlaygroundPostInfoBar playgroundPost={playgroundPost} />
			<PostContent content={playgroundPost.content} deactivateLinks={true} />
		</div>
	)
}

function PlaygroundPostInfoBar({
	playgroundPost,
}: {
	playgroundPost: PlaygroundPost
}) {
	const ageString = moment(playgroundPost.createdAt).fromNow()
	const [showDetails, setShowDetails] = useState(false)
	const fallacyLabelClassNames =
		'rounded-full bg-yellow-200 px-2 text-black dark:bg-yellow-200'

	return (
		<>
			<div className="mb-1 flex w-full flex-wrap items-start gap-2 text-xs">
				<span className="opacity-50">{ageString}</span>
				{playgroundPost.detection.map(f => (
					<span
						className={`cursor-pointer ${fallacyLabelClassNames}`}
						key={f.name}
						title={`Probability: ${(f.probability * 100).toFixed(0)}%`}
						onClick={() => setShowDetails(!showDetails)}
					>
						{f.name}
					</span>
				))}
				{showDetails && (
					<RenderFallacyList
						fallacies={playgroundPost.detection}
						className="mb-4 text-sm"
					/>
				)}
			</div>
		</>
	)
}
