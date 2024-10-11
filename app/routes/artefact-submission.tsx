import { useNavigate } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type Artefact } from '#app/modules/claims/claim-types.ts'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'

interface OEmbedResponse {
	html: string
	// Add other properties if needed
}

export default function SubmitArtefactPage() {
	const navigate = useNavigate()

	const [originUrlState, setOriginUrlState] = useState<string>('')

	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

	const [urlError, setUrlError] = useState<boolean>(
		() => (!isValidUrl(originUrlState) && !(originUrlState == '')) || false,
	)

	async function handleSubmitArtefact(originUrl: string) {
		setIsSubmitting(true)
		try {
			const payload = {
				url: originUrl,
			}
			const response = await fetch('/submit-artefact', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const {
				artefact: _,
				navigateTo,
			}: {
				artefact: Artefact
				navigateTo: string
			} = (await response.json()) as {
				artefact: Artefact
				navigateTo: string
			}
			navigate(navigateTo)
		} finally {
			setIsSubmitting(false)
		}
	}

	const [embedHtml, setEmbedHtml] = useState<string | undefined>(undefined)
	const [cache, setCache] = useState<{ [key: string]: string }>({})
	const [isFetching, setIsFetching] = useState<boolean>(false)

	const embedContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isValidTweetUrl(originUrlState)) {
			setEmbedHtml(undefined) // Reset embedHtml when URL changes
			if (cache[originUrlState]) {
				setEmbedHtml(cache[originUrlState])
			} else {
				setIsFetching(true)
				fetch(`/oembed?url=${encodeURIComponent(originUrlState)}`)
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
							[originUrlState]: data.html,
						}))
						setEmbedHtml(data.html)
					})
					.catch(error => {
						console.error('Error fetching oEmbed data:', error)
						setEmbedHtml('') // Ensure embedHtml is falsy on error
					})
					.finally(() => {
						setIsFetching(false)
					})
			}
		} else {
			setEmbedHtml(undefined) // Reset embedHtml when URL is invalid
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [originUrlState])

	useEffect(() => {
		if (embedHtml) {
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
		}
	}, [embedHtml])

	const infoText = `
## Submit an Artefact

An artefact is a document on the Internet where you found something you want to fact-check or discuss.
Please enter a URL to submit an artefact.
`

	return (
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			<div className="mb-4">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>
			<Markdown deactivateLinks={false}>
				**Where you found it (must be a valid URL)**
			</Markdown>
			<Textarea
				placeholder="https://www.example.com"
				name="origin-url"
				value={originUrlState}
				onChange={event => {
					setOriginUrlState(event.target.value)
					isValidUrl(event.target.value)
						? setUrlError(false)
						: setUrlError(true)
				}}
				className={
					'mb-2 h-4 w-full ' +
					(urlError && originUrlState !== '' ? 'border-2 border-red-500' : '')
				}
			/>
			{urlError && originUrlState !== '' && (
				<div className="text-sm text-red-500">Please enter a valid URL.</div>
			)}
			<div className="mb-6 flex flex-row">
				<button
					title="Submit artefact"
					disabled={isSubmitting}
					className="ml-auto rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
					onClick={e => {
						e.preventDefault()
						handleSubmitArtefact(originUrlState)
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
			{isFetching && <div>Fetching tweet...</div>}
			{embedHtml && (
				<div className="flex flex-col items-center">
					<div
						ref={embedContainerRef}
						dangerouslySetInnerHTML={{ __html: embedHtml }}
					/>
				</div>
			)}
		</div>
	)
}

function isValidUrl(url: string): boolean {
	try {
		new URL(url)
		return true
	} catch (_) {
		return false
	}
}
