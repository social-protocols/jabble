import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import PollResult from '#app/components/building-blocks/poll-result.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { db } from '#app/db.ts'
import { getChronologicalPolls } from '#app/modules/scoring/ranking-service.ts'
import {
	type Artefact,
	type Quote,
	type PollPagePost,
} from '#app/types/api-types.ts'

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
					return <PollPost key={'poll-' + String(index)} post={post} />
				})}
			</div>
		</div>
	)
}

function PollPost({
	post,
	className,
}: {
	post: PollPagePost
	className?: string
}) {
	const ageString = moment(post.createdAt).fromNow()
	const commentString = post.nTransitiveComments == 1 ? 'comment' : 'comments'

	const [showPollPostContext, setShowPollPostContext] = useState<boolean>(false)

	return (
		<div
			className={
				'mb-2 w-full min-w-0 rounded-xl border-2 border-solid border-gray-200 bg-post px-3 py-2 dark:border-gray-700 ' +
				(className || '')
			}
		>
			<div className="flex">
				<div className="flex w-full flex-col">
					<div className="mb-2">
						<span className="text-sm opacity-50">{ageString}</span>
					</div>
					<PostContent
						content={post.content}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					{showPollPostContext && post.context && (
						<PollPostClaimContext
							artefact={post.context.artefact}
							quote={post.context.quote}
						/>
					)}
					<div className="mt-auto flex flex-wrap space-x-4 text-sm opacity-50">
						{post.context && (
							<div>
								<button
									onClick={() => {
										setShowPollPostContext(!showPollPostContext)
										return false
									}}
									className="shrink-0"
								>
									{showPollPostContext ? (
										<Icon name="chevron-up">Hide context</Icon>
									) : (
										<Icon name="chevron-right">Show context</Icon>
									)}
								</button>
							</div>
						)}
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

function PollPostClaimContext({
	artefact,
	quote,
}: {
	artefact: Artefact
	quote: Quote | null
}) {
	const artefactSubmissionDate = new Date(artefact.createdAt)

	return (
		<div className="my-2 flex flex-col rounded-lg border-2 border-solid bg-background p-4">
			{quote && (
				<>
					<Icon name="quote" size="xl" className="mb-2 mr-auto" />
					<div>{quote.quote}</div>
				</>
			)}
			<div className="mt-2 flex flex-col">
				<span className="font-bold">Retrieved:</span>
				<span className="italic">
					from{' '}
					<Link to={artefact.url} className="text-blue-500 underline">
						{artefact.url}
					</Link>
				</span>
				<span className="italic">
					on {artefactSubmissionDate.toDateString()}
				</span>
			</div>
		</div>
	)
}
