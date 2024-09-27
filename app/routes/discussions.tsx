import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/db.ts'
import { type FrontPagePost } from '#app/modules/posts/post-types.ts'
import { getChronologicalToplevelPosts } from '#app/modules/posts/scoring/ranking-service.ts'
import { getUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId: string | null = await getUserId(request)
	const loggedIn = userId !== null
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalToplevelPosts(trx)
	})
	return { loggedIn, feed }
}

export default function Explore() {
	// due to the loader, this component will never be rendered, but we'll return
	// the error boundary just in case.
	let data = useLoaderData<typeof loader>()

	return <FrontpageFeed feed={data.feed} />
}

export function FrontpageFeed({ feed }: { feed: FrontPagePost[] }) {
	return (
		<div className="flex w-full flex-col">
			<div className="mb-4 flex items-center">
				<div className="mr-2 px-4">
					<Markdown deactivateLinks={false}># Discussions</Markdown>
				</div>
				<Link
					className="ml-auto rounded bg-blue-200 px-4 py-2 text-base font-bold text-black hover:bg-blue-300"
					to={'/discussion-submission'}
				>
					start a discussion
				</Link>
			</div>
			<PostList feed={feed} />
		</div>
	)
}

function PostList({ feed }: { feed: FrontPagePost[] }) {
	const filteredFeed = feed.filter(post => !post.isPrivate)
	return filteredFeed.map(post => {
		return <TopLevelPost key={post.id} post={post} className="flex-1" />
	})
}

export function TopLevelPost({
	post,
	className,
}: {
	post: FrontPagePost
	className?: string
}) {
	const ageString = moment(post.createdAt).fromNow()
	const commentString = post.nTransitiveComments == 1 ? 'comment' : 'comments'

	return (
		<div
			className={
				'mb-2 w-full min-w-0 rounded-xl border-2 border-solid border-gray-200 bg-post px-3 py-2 dark:border-gray-700 ' +
				(className || '')
			}
		>
			<div className="flex">
				<div className="flex w-full flex-col">
					<div className="mb-2 text-sm opacity-50">{ageString}</div>
					<PostContent
						content={post.content}
						maxLines={2}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					<div className="mt-auto text-sm opacity-50">
						<Link to={`/post/${post.id}`}>
							{post.nTransitiveComments} {commentString}
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}
