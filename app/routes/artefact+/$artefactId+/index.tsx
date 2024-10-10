import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, useNavigate } from '@remix-run/react'
import { type ChangeEvent, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { z } from 'zod'
import { PostContent } from '#app/components/building-blocks/post-content.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { db } from '#app/db.ts'
import { getArtefact } from '#app/modules/claims/artefact-repository.ts'
import { type Artefact, type Quote } from '#app/modules/claims/claim-types.ts'
import { getQuotes } from '#app/modules/claims/quote-repository.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { isValidTweetUrl } from '#app/utils/twitter-utils.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { EmbeddedTweet } from '#app/components/building-blocks/embedded-integration.tsx'

const artefactIdSchema = z.coerce.number()

export async function loader({ params }: LoaderFunctionArgs) {
	const artefactId = artefactIdSchema.parse(params.artefactId)
	const {
		artefact,
		quotes,
	}: {
		artefact: Artefact
		quotes: Quote[]
	} = await db.transaction().execute(async trx => {
		const artefact = await getArtefact(trx, artefactId)
		const quotes = await getQuotes(trx, artefactId)
		return {
			artefact: artefact,
			quotes: quotes,
		}
	})

	return json({ artefact, quotes })
}

export default function ArtefactPage() {
	const { artefact, quotes } = useLoaderData<typeof loader>()
	const artefactSubmissionDate = new Date(artefact.createdAt)
	const isTweet = isValidTweetUrl(artefact.url)

	return (
		<>
			<div className="mb-6">
				<Markdown
					deactivateLinks={false}
				>{`## Artefact #${artefact.id}`}</Markdown>
				<div className="mt-2 flex flex-col">
					<span className="italic">
						url:{' '}
						<Link to={artefact.url} className="text-blue-500 underline">
							{artefact.url}
						</Link>
					</span>
					<span className="italic">
						submitted on: {artefactSubmissionDate.toDateString()}
					</span>
				</div>
				{isTweet ? (
					<>
						<Link to={`/artefact/${artefact.id}/quote/${quotes[0]!.id}`} className="underline">Go to quote page</Link>
						<EmbeddedTweet tweetUrl={artefact.url} />
					</>
				) : (
					<NonExhaustiveQuoteListPreview artefact={artefact} quotes={quotes} />
				)}
			</div>
		</>
	)
}

function NonExhaustiveQuoteListPreview({
	artefact,
	quotes,
}: {
	artefact: Artefact
	quotes: Quote[]
}) {
	const user = useOptionalUser()
	const [showSubmissionForm, setShowSubmissionForm] = useState<boolean>(false)

	return (
		<div className="space-y-4">
			<Markdown deactivateLinks={false}>### Quotes</Markdown>
			{user && (
				<>
					<div className="flex w-full">
						<button
							onClick={() => {
								setShowSubmissionForm(!showSubmissionForm)
								return false
							}}
							className="shrink-0 font-bold text-purple-700"
						>
							{showSubmissionForm ? (
								<Icon name="chevron-down" className="mt-[-0.1em]" />
							) : (
								<Icon name="chevron-right" className="mt-[-0.1em]" />
							)}
							<span className="ml-2">Submit new quote</span>
						</button>
					</div>
					{showSubmissionForm && (
						<SubmitQuoteForm artefactId={artefact.id} />
					)}
				</>
			)}
			<div>
				{quotes.map(quote => {
					return (
						<QuotePreview
							artefact={artefact}
							quote={quote}
							key={`quote-${quote.id}`}
						/>
					)
				})}
			</div>
		</div>
	)
}

function SubmitQuoteForm({ artefactId }: { artefactId: number }) {
	const storageKey = `current-quote-for-artefact-${artefactId}`

	const navigate = useNavigate()

	const [contentState, setContentState] = useState<string>(
		// read backup from localstorage
		() => localStorage.getItem(storageKey) ?? '',
	)

	const debouncedChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			// backup text in localstorage to be robust against reloads and collapses
			localStorage.setItem(storageKey, event.target.value)
		},
		500,
	)

	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

	const handleQuoteSubmit = async function (
		artefactId: number,
		quoteContent: string,
	) {
		setIsSubmitting(true)
		try {
			const payload = {
				artefactId: artefactId,
				quoteContent: quoteContent,
			}
			const response = await fetch('/submit-quote', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: {
					'Content-Type': 'application/json',
				},
			})
			const persistedQuote = (await response.json()) as Quote
			// after successful submission, remove from localstorage
			localStorage.removeItem(storageKey)
			navigate(`/artefact/${artefactId}/quote/${persistedQuote.id}`)
		} finally {
			setIsSubmitting(false)
		}
	}

	const infoText = `
Visit the artefact URL and paste any quote from that URL that you want to discuss or fact-check here.
	`

	const disclaimer = `
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<div className="mt-2 flex flex-col">
			<div className="mb-4">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>
			<TextareaAutosize
				name="content"
				className="mb-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-input-invalid"
				style={{
					resize: 'vertical',
				}}
				autoFocus={true}
				placeholder="Enter a quote from the artefact"
				value={contentState}
				maxLength={MAX_CHARS_PER_POST}
				onChange={event => {
					debouncedChangeHandler(event)
					const value = event.currentTarget.value
					setContentState(value)
				}}
			/>
			<div className="mb-6 flex w-full flex-row">
				<div className="mr-auto self-end text-sm text-gray-500">
					<Markdown deactivateLinks={false}>{disclaimer}</Markdown>
				</div>
				<button
					className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
					onClick={e => {
						e.preventDefault()
						handleQuoteSubmit(artefactId, contentState)
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
		</div>
	)
}

function QuotePreview({
	artefact,
	quote,
}: {
	artefact: Artefact
	quote: Quote
}) {
	const artefactSubmissionDate = new Date(artefact.createdAt)
	return (
		<div className="mb-2">
			<div className="flex flex-col rounded-xl border-2 border-solid bg-post p-4">
				<Icon name="quote" size="xl" className="mb-2 mr-auto" />
				<PostContent
					content={quote.quote}
					deactivateLinks={false}
					linkTo={`/artefact/${artefact.id}/quote/${quote.id}`}
				/>
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
	)
}
