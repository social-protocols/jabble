import { Link, useLoaderData } from '@remix-run/react'
import { OpenDiscussionPreview } from '#app/components/building-blocks/open-discussion-preview.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/database/db.ts'
import { getChronologicalToplevelPosts } from '#app/modules/posts/ranking/ranking-service.ts'

export async function loader() {
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalToplevelPosts(trx)
	})
	return { feed }
}

export default function OpenDiscussions() {
	let { feed } = useLoaderData<typeof loader>()
	const filteredFeed = feed.filter(post => !post.isPrivate)

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
			{filteredFeed.map(post => {
				return (
					<OpenDiscussionPreview key={post.id} post={post} className="flex-1" />
				)
			})}
		</div>
	)
}
