import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useEffect, useRef, useState } from 'react'
import PollResult from '#app/components/building-blocks/poll-result.tsx'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { db } from '#app/db.ts'
import { type Artefact, type Quote } from '#app/modules/claims/claim-types.ts'
import { type PollPagePost } from '#app/modules/posts/post-types.ts'
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

	const isTweet = isValidTweetUrl(artefact.url)

	return (
		<div className="my-2 flex flex-col rounded-lg border-2 border-solid bg-background p-4">
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

interface OEmbedResponse {
	html: string
	// Add other properties if needed
}

function EmbeddedTweet({ tweetUrl }: { tweetUrl: string }) {

	const [embedHtml, setEmbedHtml] = useState<string | undefined>(undefined)
	const [cache, setCache] = useState<{ [key: string]: string }>({})
	const [isValidUrl, setIsValidUrl] = useState<boolean>(false)
	const [isFetching, setIsFetching] = useState<boolean>(false)
	const [isTweetLoaded, setIsTweetLoaded] = useState<boolean>(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	const embedContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isValidTweetUrl(tweetUrl)) {
			setIsValidUrl(true)
			setFetchError(null)
			setEmbedHtml(undefined) // Reset embedHtml when URL changes
			if (cache[tweetUrl]) {
				setEmbedHtml(cache[tweetUrl])
			} else {
				setIsFetching(true)
				fetch(`/oembed?url=${encodeURIComponent(tweetUrl)}`)
					.then(async response => {
						if (!response.ok) {
							if (response.status === 404) {
								throw new Error('Tweet not found')
							} else {
								throw new Error('Failed to fetch oEmbed data')
							}
						}
						const data = (await response.json()) as OEmbedResponse
						if (!data.html) {
							throw new Error('Invalid oEmbed data')
						}
						setCache(prevCache => ({
							...prevCache,
							[tweetUrl]: data.html,
						}))
						setEmbedHtml(data.html)
					})
					.catch(error => {
						console.error('Error fetching oEmbed data:', error)
						setEmbedHtml('') // Ensure embedHtml is falsy on error
						setFetchError(error.message)
					})
					.finally(() => {
						setIsFetching(false)
					})
			}
		} else {
			setIsValidUrl(false)
			setEmbedHtml(undefined) // Reset embedHtml when URL is invalid
			setFetchError(null)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tweetUrl])

	useEffect(() => {
		if (embedHtml) {
			setIsTweetLoaded(false)

			const loadTwitterScript = () => {
				if (window.twttr && window.twttr.widgets) {
					window.twttr.widgets.load()
				} else {
					const script = document.createElement('script')
					script.src = 'https://platform.twitter.com/widgets.js'
					script.async = true
					script.onload = () => {
						if (window.twttr && window.twttr.widgets) {
							window.twttr.widgets.load()
						}
					}
					document.body.appendChild(script)
				}
			}
			loadTwitterScript()

			const checkTweetLoaded = () => {
				const embedContainer = embedContainerRef.current
				if (!embedContainer) return

				// Check if the tweet iframe is loaded
				const iframe = embedContainer.querySelector('iframe')
				if (iframe) {
					iframe.addEventListener('load', () => {
						setIsTweetLoaded(true)
					})
				} else {
					// If iframe is not found immediately, observe for its addition
					const observer = new MutationObserver(() => {
						const iframe = embedContainer.querySelector('iframe')
						if (iframe) {
							iframe.addEventListener('load', () => {
								setIsTweetLoaded(true)
							})
							observer.disconnect()
						}
					})
					observer.observe(embedContainer, { childList: true, subtree: true })
				}
			}

			checkTweetLoaded()
		}
	}, [embedHtml])

	return (
		<>
			{(isFetching || !isTweetLoaded) && (
				<div>
					Loading
					<Icon name="update" className="ml-2 animate-spin" />
				</div>
			)}
			{embedHtml && (
				<div style={{ position: 'relative' }}>
					<div
						ref={embedContainerRef}
						dangerouslySetInnerHTML={{ __html: embedHtml }}
					/>
				</div>
			)}
		</>
	)
}

function isValidTweetUrl(url: string): boolean {
	const regex =
		/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
	return regex.test(url)
}

