import { useEffect, useRef, useState } from 'react'
import { matchIntegration } from '#app/integrations/integrations.ts'
import { Icon } from '../ui/icon.tsx'

interface OEmbedResponse {
	html: string
	// Add other properties if needed
}

export function EmbeddedContent({ url }: { url: string }) {
	const [embedHtml, setEmbedHtml] = useState<string | undefined>(undefined)
	const [cache, setCache] = useState<{ [key: string]: string }>({})
	const [isFetching, setIsFetching] = useState<boolean>(false)
	const [isLoaded, setIsLoaded] = useState<boolean>(false)
	const [fetchError, setFetchError] = useState<string | null>(null)

	const embedContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const integration = matchIntegration(url)
		if (integration !== undefined) {
			setEmbedHtml(undefined) // Reset embedHtml when URL changes
			setFetchError(null)
			if (cache[url]) {
				setEmbedHtml(cache[url])
			} else {
				setIsFetching(true)
				fetch(`/oembed?url=${encodeURIComponent(url)}`)
					.then(async response => {
						if (!response.ok) {
							if (response.status === 404) {
								throw new Error('URL not found')
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
	}, [url])

	useEffect(() => {
		const integration = matchIntegration(url)
		if (integration !== undefined && embedHtml) {
			setIsLoaded(false)
			integration.loadContent(embedContainerRef, () => setIsLoaded(true))
		}
	}, [embedHtml, url])

	return (
		<>
			{fetchError && <div style={{ color: 'red' }}>× {fetchError}</div>}
			{(isFetching || !isLoaded) && (
				<div>
					Loading
					<Icon name="update" className="ml-2 animate-spin" />
				</div>
			)}
			{embedHtml && (
				<div
					style={{
						position: 'relative',
						display: isLoaded ? 'block' : 'none',
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
