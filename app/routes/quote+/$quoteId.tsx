import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { z } from 'zod'
import { EmbeddedTweet } from '#app/components/building-blocks/embedded-integration.tsx'
import PollResult from '#app/components/building-blocks/poll-result.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.tsx'
import { db } from '#app/database/db.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import { getClaims } from '#app/modules/claims/claim-repository.ts'
import {
	type Claim,
	type Artefact,
	type Quote,
	type QuoteFallacy,
} from '#app/modules/claims/claim-types.ts'
import { getQuoteFallacies } from '#app/modules/claims/quote-fallacy-repository.ts'
import { getQuote } from '#app/modules/claims/quote-repository.ts'
import { getFrontPagePoll } from '#app/modules/posts/polls/poll-repository.ts'
import { type FrontPagePoll, PollType } from '#app/modules/posts/post-types.ts'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'
import { useOptionalUser } from '#app/utils/user.ts'

const quoteIdSchema = z.coerce.number()

export async function loader({ params }: LoaderFunctionArgs) {
	const quoteId = quoteIdSchema.parse(params.quoteId)

	const {
		artefact,
		quote,
		claims,
		posts,
		quoteFallacies,
	}: {
		artefact: Artefact
		quote: Quote
		claims: Claim[]
		posts: FrontPagePoll[]
		quoteFallacies: QuoteFallacy[]
	} = await db.transaction().execute(async trx => {
		const claims = await getClaims(trx, quoteId)
		const submittedClaimsPostIds = claims
			.filter(claim => claim.postId !== null)
			.map(claim => claim.postId!) // eslint-disable-line @typescript-eslint/no-non-null-assertion
		const posts = await Promise.all(
			submittedClaimsPostIds.map(
				async postId => await getFrontPagePoll(trx, postId),
			),
		)
		const quoteFallacies = await getQuoteFallacies(trx, quoteId)
		const quote = await getQuote(trx, quoteId)
		const artefact = await getArtefact(trx, quote.artefactId)
		return {
			artefact: artefact,
			quote: quote,
			claims: claims,
			posts: posts,
			quoteFallacies: quoteFallacies,
		}
	})

	return json({
		artefact,
		quote,
		claims,
		posts,
		quoteFallacies,
	})
}

export default function ArtefactQuoteEditingPage() {
	const { artefact, quote, claims, posts, quoteFallacies } =
		useLoaderData<typeof loader>()

	const artefactSubmissionDate = new Date(artefact.createdAt)

	const unsubmittedClaims = claims.filter(claim => claim.postId == null)

	const isTweet = isValidTweetUrl(artefact.url)

	return (
		<div className="mb-4 flex flex-col space-y-2 text-sm">
			<div className="mb-2">
				<div className="flex flex-col rounded-xl border-2 border-solid bg-post p-4 dark:border-gray-700">
					{isTweet ? (
						<div className="flex flex-col items-center">
							<EmbeddedTweet tweetUrl={artefact.url} />
						</div>
					) : (
						<QuoteFallback quote={quote} />
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
			</div>
			<Tabs defaultValue="polls" className="w-full">
				<TabsList className="my-4 w-full">
					<TabsTrigger value="polls" className="w-full">
						Polls
					</TabsTrigger>
					<TabsTrigger value="claims" className="w-full">
						Extracted Claims
					</TabsTrigger>
					<TabsTrigger value="fallacies" className="w-full">
						Rhetorical Analysis
					</TabsTrigger>
				</TabsList>
				<TabsContent value="polls">
					<div>
						{posts.map(post => {
							return <QuotePollPost key={`poll-post-${post.id}`} post={post} />
						})}
					</div>
				</TabsContent>
				<TabsContent value="claims">
					<div className="mt-5">
						{claims.length == 0 ? (
							<div>No claims extracted</div>
						) : (
							<>
								{unsubmittedClaims.map((claim, index) => {
									return (
										<ExtractedClaim
											key={'claim-' + String(index)}
											claim={claim}
										/>
									)
								})}
							</>
						)}
					</div>
				</TabsContent>
				<TabsContent value="fallacies">
					{quoteFallacies && <DetectedFallacies fallacies={quoteFallacies} />}
				</TabsContent>
			</Tabs>
		</div>
	)
}

function QuoteFallback({ quote }: { quote: Quote }) {
	return (
		<>
			<Icon name="quote" size="xl" className="mb-2 mr-auto" />
			{quote.quote}
		</>
	)
}

function DetectedFallacies({ fallacies }: { fallacies: QuoteFallacy[] }) {
	const fallacyLabelClassNames =
		'rounded-full bg-yellow-200 px-2 text-black dark:bg-yellow-200'

	return (
		<div>
			<ul className="ml-4 list-disc">
				{fallacies.map(f => (
					<li key={f.name}>
						<span className={fallacyLabelClassNames}>{f.name}</span>
						<span className="ml-2">{(f.probability * 100).toFixed(0)}%</span>
						<div className="mb-4 mt-1">{f.rationale}</div>
					</li>
				))}
				{fallacies.length == 0 && (
					<p className="py-6">No fallacies detected.</p>
				)}
			</ul>
		</div>
	)
}

function ExtractedClaim({ claim }: { claim: Claim }) {
	const [isSubmittingFactCheck, setIsSubmittingFactCheck] =
		useState<boolean>(false)
	const [isSubmittingOpinionPoll, setIsSubmittingOpinionPoll] =
		useState<boolean>(false)
	const [submitted, setSubmitted] = useState<boolean>(false)
	const [newSubmissionPostId, setNewSubmissionPostId] = useState<number | null>(
		null,
	)

	const user = useOptionalUser()

	async function handleSubmit(claim: Claim, pollType: PollType) {
		if (pollType == PollType.FactCheck) {
			setIsSubmittingFactCheck(true)
		} else {
			setIsSubmittingOpinionPoll(true)
		}
		try {
			const payload = {
				claimId: claim.id,
				pollType: pollType,
			}
			const response = await fetch('/create-poll', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const newPostId = (await response.json()) as number
			setSubmitted(true)
			setNewSubmissionPostId(newPostId)
		} finally {
			if (pollType == PollType.FactCheck) {
				setIsSubmittingFactCheck(false)
			} else {
				setIsSubmittingOpinionPoll(false)
			}
		}
	}

	return (
		<div className="mb-5 flex rounded-xl border-2 border-solid bg-post p-4 dark:border-gray-700">
			<div className="w-full">{claim.claim}</div>
			{user && (
				<div className="border-l-solid ml-auto flex min-w-32 flex-col border-l-2 pl-2">
					{!submitted && (
						<div className="space-y-2">
							<button
								disabled={isSubmittingFactCheck}
								className="flex w-full rounded bg-purple-200 px-2 py-1 text-sm font-bold text-black hover:bg-purple-300"
								onClick={e => {
									e.preventDefault()
									handleSubmit(claim, PollType.FactCheck)
								}}
							>
								{isSubmittingFactCheck ? (
									<>
										Submitting
										<Icon name="update" className="ml-2 animate-spin" />
									</>
								) : (
									<>Fact Check</>
								)}
							</button>
							<button
								disabled={isSubmittingOpinionPoll}
								className="flex w-full rounded bg-purple-200 px-2 py-1 text-sm font-bold text-black hover:bg-purple-300"
								onClick={e => {
									e.preventDefault()
									handleSubmit(claim, PollType.Opinion)
								}}
							>
								{isSubmittingOpinionPoll ? (
									<>
										Submitting
										<Icon name="update" className="ml-2 animate-spin" />
									</>
								) : (
									<>Opinion Poll</>
								)}
							</button>
						</div>
					)}
					{submitted && (
						<Link
							className="ml-auto mt-2 rounded px-4 py-2 hover:bg-post hover:underline"
							to={`/post/${newSubmissionPostId}`}
						>
							Go to discussion
						</Link>
					)}
				</div>
			)}
			{!user && (
				<div className="mt-2">
					<Link className="underline" to="/login">
						Login
					</Link>{' '}
					or{' '}
					<Link className="underline" to="/signup">
						signup
					</Link>{' '}
					to submit fact checks
				</div>
			)}
		</div>
	)
}

function QuotePollPost({
	post,
	className,
}: {
	post: FrontPagePoll
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
					<div className="mb-2">
						<span className="text-sm opacity-50">{ageString}</span>
					</div>
					<PostContent
						content={post.content}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					<div className="mt-auto flex flex-wrap space-x-4 text-sm opacity-50">
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
