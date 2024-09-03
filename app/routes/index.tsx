import { useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { AnalyzeForm } from '#app/components/ui/analyze-form.tsx'
import { PostContent } from '#app/components/ui/post-content.tsx'
import { RenderFallacyList } from '#app/components/ui/post-info-bar.tsx'
import { db } from '#app/db.ts'
import { getNLatestPlaygroundPosts } from '#app/repositories/playground-post.ts'
import { type PlaygroundPost } from '#app/types/api-types.ts'

export async function loader() {
	const latestPlaygroundPosts = await db
		.transaction()
		.execute(async trx => await getNLatestPlaygroundPosts(trx, 5))
	return { latestPlaygroundPosts }
}

export default function BullShredder() {
	const { latestPlaygroundPosts } = useLoaderData<typeof loader>()

	const [playgroundPostFeed, setPlaygroundPostFeed] = useState<
		PlaygroundPost[]
	>(latestPlaygroundPosts)

	const infoText = `
# Welcome to Jabble!

Post something you want analyzed for rhetorical fallacies.  
**Disclaimer**: We use the OpenAI api to analyze posts.
If you don't want your post to be sent to OpenAI, please don't post.
	`

	return (
		<div className="space-y-2">
			<Markdown deactivateLinks={false}>{infoText}</Markdown>
			<AnalyzeForm
				setPlaygroundPosts={setPlaygroundPostFeed}
				className="mb-6"
			/>
			<div className="space-y-7">
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
						className="mb-4"
					/>
				)}
			</div>
		</>
	)
}
