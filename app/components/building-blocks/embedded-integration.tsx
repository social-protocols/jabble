import { useEffect, useRef, useState } from 'react'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'
import { Icon } from '../ui/icon.tsx'

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

export function EmbeddedTweet({ tweetUrl }: { tweetUrl: string }) {
	const [embedHtml, setEmbedHtml] = useState<string | undefined>(undefined)
	const [cache, setCache] = useState<{ [key: string]: string }>({})
	const [isFetching, setIsFetching] = useState<boolean>(false)
	const [isTweetLoaded, setIsTweetLoaded] = useState<boolean>(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	const embedContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isValidTweetUrl(tweetUrl)) {
			setEmbedHtml(undefined) // Reset embedHtml when URL changes
			setFetchError(null)
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
						setFetchError(null)
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
			{fetchError && <div style={{ color: 'red' }}>× {fetchError}</div>}
			{(isFetching || !isTweetLoaded) && (
				<div>
					Loading
					<Icon name="update" className="ml-2 animate-spin" />
				</div>
			)}
			{embedHtml && (
				<div
					style={{
						position: 'relative',
						display: isTweetLoaded ? 'block' : 'none',
					}}
				>
					<div
						ref={embedContainerRef}
						dangerouslySetInnerHTML={{ __html: embedHtml }}
					/>
				</div>
			)}
		</>
	)
}