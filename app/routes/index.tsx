// import { Link, useLocation } from '@remix-run/react'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'

import { type DataFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { LocationType, type Location } from '#app/attention.ts'
import { PostDetails } from '#app/components/ui/post.tsx'
import {
	getDefaultFeed,
	getUserFeed,
	type RankedPost,
	type TagPreview,
} from '#app/ranking.ts'
import { getUserId } from '#app/utils/auth.server.ts'
import { Direction } from '#app/vote.ts'
// export async function loader() {
// }

export default function Index() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	let data = useLoaderData<typeof loader>()

	return <UserFeed feed={data.feed} />
}

export async function loader({ request }: DataFunctionArgs) {
	const userId = await getUserId(request)

	console.log('userId', userId)

	let feed: TagPreview[] = []

	if (userId) {
		feed = await getUserFeed(userId)
	} else {
		feed = await getDefaultFeed()
	}

	return { feed }
}

export function UserFeed({ feed }: { feed: TagPreview[] }) {
	console.log('user feed is', feed)
	return (
		<div className="container">
			<h1 className="mb-5 text-3xl">Home</h1>
			{feed.map(tagPreview => {
				let posts = tagPreview.posts
				let tag = tagPreview.tag
				let positions = tagPreview.positions

				let p = new Map<number, Direction>()
				for (let position of positions) {
					p.set(position.postId, position.direction)
				}

				console.log('Tag preview', tag)

				return (
					<div key={tag} className="mx-auto w-full">
						<h2 className="mb-3 text-lg">
							Top posts in{' '}
							<span className="font-bold">
								<Link to={`/tags/${tag}`}>#{tag}</Link>
							</span>
						</h2>
						<div className="flex flex-col place-items-start items-stretch">
							<ul>
								{posts.map((post: RankedPost, i: number) => {
									let position = p.get(post.id) || Direction.Neutral
									let notePosition: Direction =
										(post.note && p.get(post.note.id)) || Direction.Neutral

									let randomLocation: Location | null = post.random
										? {
												oneBasedRank: i + 1,
												locationType: LocationType.TagPage,
										  }
										: null

									return (
										<div className="flex-1 items-stretch">
											<li key={post.id}>
												<div className="w-full flex-1 justify-self-center">
													<PostDetails
														post={post}
														note={post.note}
														tag={tag}
														teaser={true}
														randomLocation={randomLocation}
														position={position}
														notePosition={notePosition}
													/>
												</div>
											</li>
										</div>
									)
								})}
							</ul>
						</div>
					</div>
				)
			})}
		</div>
	)
}
