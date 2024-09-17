import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { Markdown } from '#app/components/markdown.tsx'
import PollResult from '#app/components/ui/poll-result.tsx'
import { PostContent } from '#app/components/ui/post-content.tsx'
import { db } from '#app/db.ts'
import { getChronologicalPolls } from '#app/repositories/ranking.ts'
import { type FrontPagePost } from '#app/types/api-types.ts'

export async function loader() {
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalPolls(trx)
	})
	return { feed }
}

export default function ClaimExtraction() {
	const { feed } = useLoaderData<typeof loader>()

	return (
		<div>
			<div>
				<div className="mb-5 px-4">
					<Markdown deactivateLinks={false}>{'## Recent Polls'}</Markdown>
				</div>
				{feed.map((post, index) => {
					return <PollPost key={'fact-check-' + String(index)} post={post} />
				})}
			</div>
		</div>
	)
}

function PollPost({
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
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					<div className="mt-2 text-sm opacity-50">
						<Link to={`/post/${post.id}`}>
							{post.nTransitiveComments} {commentString}
						</Link>
					</div>
				</div>
				<PollResult
					postId={post.id}
					pCurrent={post.p || NaN}
					voteCount={post.oSize}
					pollType={post.pollType}
				/>
			</div>
		</div>
	)
}
