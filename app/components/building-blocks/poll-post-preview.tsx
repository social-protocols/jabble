import { Link } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { type Artefact, type Quote } from '#app/modules/claims/claim-types.ts'
import { type Poll } from '#app/modules/posts/post-types.ts'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'
import { Icon } from '../ui/icon.tsx'
import { EmbeddedTweet } from './embedded-integration.tsx'
import PollResult from './poll-result.tsx'
import { PostContent } from './post-content.tsx'

export function PollPostPreview({
	post,
	className,
}: {
	post: Poll
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

	const isTweet = isValidTweetUrl(artefact.url)

	return (
		<div className="my-2 flex flex-col rounded-lg border-2 border-solid bg-background p-4 dark:border-gray-700">
			{quote && (
				<>
					{isTweet && <EmbeddedTweet tweetUrl={artefact.url} />}
					{!isTweet && (
						<>
							<Icon name="quote" size="xl" className="mb-2 mr-auto" />
							<PostContent content={quote.quote} deactivateLinks={true} />
						</>
					)}
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
