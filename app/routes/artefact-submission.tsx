import { useNavigate } from '@remix-run/react'
import { type ChangeEvent, useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_QUOTE } from '#app/constants.ts'
import { type Artefact, type Quote } from '#app/types/api-types.ts'
import { useDebounce } from '#app/utils/misc.tsx'

export default function SubmitArtefactPage() {
	const navigate = useNavigate()

	const quoteStateStorageKey = 'claim-extraction-statement'
	const claimsStorageKey = 'extracted-claims'
	const originUrlStorageKey = 'claim-extraction-origin'

	const [quoteState, setQuoteState] = useState<string>('')
	const [originUrlState, setOriginUrlState] = useState<string>('')
	const [descriptionState, setDescriptionState] = useState<string>('')

	const [isExtractingClaims, setIsExtractingClaims] = useState<boolean>(false)

	const quoteStateChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			localStorage.removeItem(claimsStorageKey)
			localStorage.setItem(quoteStateStorageKey, event.target.value)
		},
		500,
	)

	const originUrlChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			localStorage.setItem(originUrlStorageKey, event.target.value)
		},
		500,
	)

	const [urlError, setUrlError] = useState<boolean>(
		() => (!isValidUrl(originUrlState) && !(originUrlState == '')) || false,
	)

	async function handleSubmitArtefact(
		originUrl: string,
		description: string | null,
		quoteContent: string,
	) {
		setIsExtractingClaims(true)
		try {
			const payload = {
				url: originUrl,
				description: description,
				quote: quoteContent,
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
			setIsExtractingClaims(false)
		}
	}

	const infoText = `
## Submit an Artefact

Paste anything you want to fact-check or discuss here.
We use an LLM to extract the claims made in the statement.
You can then decide which ones you want to post as fact-check or discussion polls.
`

	const disclaimer = `
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			<div className="mb-4">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>
			<Markdown deactivateLinks={false}>
				**Something someone said on the Internet**
			</Markdown>
			<Textarea
				placeholder="Paste something here you want to analyze and potentially fact-check"
				name="quote"
				value={quoteState}
				maxLength={MAX_CHARS_PER_QUOTE}
				onChange={event => {
					quoteStateChangeHandler(event)
					setQuoteState(event.target.value)
				}}
				className="mb-2 min-h-[150px] w-full"
			/>
			<Markdown deactivateLinks={false}>
				**Where you found it (must be a valid URL)**
			</Markdown>
			<Textarea
				placeholder="https://www.example.com"
				name="origin-url"
				value={originUrlState}
				onChange={event => {
					originUrlChangeHandler(event)
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
			<Markdown deactivateLinks={false}>
				**Short description of the source (optional)**
			</Markdown>
			<Textarea
				placeholder="An example site, for illustrative purposes"
				name="description"
				value={descriptionState}
				onChange={event => {
					originUrlChangeHandler(event)
					setDescriptionState(event.target.value)
				}}
				className="mb-2 min-h-[70px] w-full"
			/>
			<div className="mb-6 flex flex-row">
				<div className="mr-auto self-end text-gray-500">
					<Markdown deactivateLinks={false}>{disclaimer}</Markdown>
				</div>
				<button
					title="Submit artefact"
					disabled={isExtractingClaims}
					className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
					onClick={e => {
						e.preventDefault()
						handleSubmitArtefact(originUrlState, descriptionState, quoteState)
					}}
				>
					{isExtractingClaims ? 'Submitting...' : 'Submit'}
				</button>
			</div>
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
