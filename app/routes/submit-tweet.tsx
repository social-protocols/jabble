import { useNavigate } from '@remix-run/react'
import { useState, useEffect, useRef } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Artefact, type Quote } from '#app/types/kysely-types.ts'

declare global {
	interface Window {
		twttr?: {
			widgets: {
				load: () => void
			}
		}
	}
}

interface OEmbedResponse {
	html: string
	// Add other properties if needed
}

export default function SubmitTweetPage() {
	const navigate = useNavigate()

	const [url, setUrl] = useState('')
	const [embedHtml, setEmbedHtml] = useState<string | undefined>(undefined)
	const [cache, setCache] = useState<{ [key: string]: string }>({})
	const [isValidUrl, setIsValidUrl] = useState<boolean>(false)
	const [isFetching, setIsFetching] = useState<boolean>(false)
	const [isTweetLoaded, setIsTweetLoaded] = useState<boolean>(false)
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	const embedContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isValidTweetUrl(url)) {
			setIsValidUrl(true)
			setFetchError(null)
			setEmbedHtml(undefined) // Reset embedHtml when URL changes
			if (cache[url]) {
				setEmbedHtml(cache[url])
			} else {
				setIsFetching(true)
				fetch(`/oembed?url=${encodeURIComponent(url)}`)
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
							[url]: data.html,
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
	}, [url])

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

	function isValidTweetUrl(url: string): boolean {
		const regex =
			/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/
		return regex.test(url)
	}

	async function handleSubmitTweet(url: string) {
		setIsSubmitting(true)
		try {
			const payload = {
				url: url,
				quote: 'TWEET',
			}

			const response = await fetch('/submit-artefact', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const {
				artefact,
				quote,
			}: {
				artefact: Artefact
				quote: Quote
			} = (await response.json()) as {
				artefact: Artefact
				quote: Quote
			}
			navigate(`/artefact/${artefact.id}/quote/${quote.id}`)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			<div className="mb-4">
				<Markdown deactivateLinks={false}>## Submit Tweet</Markdown>
			</div>
			<div className="form-group">
				<label htmlFor="tweetUrl" className="font-bold">
					Tweet URL
				</label>
				<Textarea
					id="tweetUrl"
					placeholder="https://x.com/Username/status/1234567890"
					value={url}
					onChange={e => setUrl(e.target.value)}
					className={'mb-2 mt-2 h-4 w-full'}
				/>
			</div>
			{url && (
				<div className="flex items-center justify-between">
					{isValidUrl ? (
						fetchError ? (
							<div style={{ color: 'red' }}>× {fetchError}</div>
						) : (
							<div style={{ color: 'green' }}>✓ Valid tweet URL</div>
						)
					) : (
						<div style={{ color: 'red' }}>Invalid tweet URL</div>
					)}
					<button
						title="Submit Tweet"
						disabled={!embedHtml || isSubmitting}
						className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300 disabled:bg-gray-300"
						onClick={e => {
							e.preventDefault()
							handleSubmitTweet(url)
						}}
					>
						{isSubmitting ? (
							<>
								Submitting
								<Icon name="update" className="ml-2 animate-spin" />
							</>
						) : (
							<>Submit</>
						)}
					</button>
				</div>
			)}
			{isFetching && <div>Fetching tweet...</div>}
			{embedHtml && (
				<div style={{ position: 'relative', marginTop: '16px' }}>
					{!isTweetLoaded && (
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								bottom: 0,
								backgroundColor: 'white',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								zIndex: 1,
							}}
						>
							Loading tweet...
						</div>
					)}
					<div
						ref={embedContainerRef}
						dangerouslySetInnerHTML={{ __html: embedHtml }}
					/>
				</div>
			)}
		</div>
	)
}
