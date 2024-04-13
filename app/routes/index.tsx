import { type DataFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { PostContent } from '#app/components/ui/post.tsx'
import * as rankingTs from '#app/ranking.ts'

export default function Index() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	let data = useLoaderData<typeof loader>()

	return <FrontpageFeed feed={data.feed} tag="global" />
}

export async function loader({}: DataFunctionArgs) {
	const feed = await rankingTs.getChronologicalToplevelPosts('gobal')
	return { feed }
}

export function FrontpageFeed({
	feed,
	tag,
}: {
	feed: rankingTs.ScoredPost[]
	tag: string
}) {
	return (
		<div className="container">
			<div className="mx-auto w-full">
				{feed.map(post => {
					return (
						<div key={post.id} className="flex-1 items-stretch">
							<div className="flex-1">
								<TopLevelPost post={post} tag={tag} />
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}

export function TopLevelPost({
	post,
	tag,
}: {
	post: rankingTs.ScoredPost
	tag: string
}) {
	const nRepliesString =
		post.nReplies === 1 ? '1 reply' : `${post.nReplies} replies`

	let informedProbabilityString = Math.round(post.p * 100) / 100
	const ageString = moment(post.createdAt).fromNow()

	return (
		<div className="mb-5 flex w-full flex-row space-x-4 rounded-lg bg-post px-5 pb-5">
			<div className="postteaser flex w-full min-w-0 flex-col">
				<div className="mt-1 text-right text-sm opacity-50">{ageString}</div>

				<PostContent
					content={post.content}
					maxLines={3}
					deactivateLinks={false}
				/>

				<div className="mt-2 flex w-full text-sm">
					<Link to={`/tags/${tag}/stats/${post.id}`} className="hyperlink">
						{informedProbabilityString}%
					</Link>
					<Link to={`/tags/${tag}/posts/${post.id}`} className="hyperlink ml-2">
						{nRepliesString}
					</Link>
				</div>
			</div>
		</div>
	)
}
