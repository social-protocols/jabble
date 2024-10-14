import { Link, useLoaderData } from '@remix-run/react'
import { PollPostPreview } from '#app/components/building-blocks/poll-post-preview.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { db } from '#app/database/db.ts'
import { getChronologicalPolls } from '#app/modules/posts/scoring/ranking-service.ts'

export async function loader() {
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalPolls(trx)
	})
	return { feed }
}

export default function PollsPage() {
	const { feed } = useLoaderData<typeof loader>()

	return (
		<div>
			<div className="flex flex-col">
				<div className="mb-4 flex items-center">
					<div className="mr-2 px-4">
						<Markdown deactivateLinks={false}>{'## Polls'}</Markdown>
					</div>
					<Link
						className="ml-auto rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
						to={'/artefact-submission'}
					>
						submit an artefact
					</Link>
				</div>
				{feed.map((post, index) => {
					return <PollPostPreview key={'poll-' + String(index)} post={post} />
				})}
			</div>
		</div>
	)
}
