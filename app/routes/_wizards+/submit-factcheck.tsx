import { Markdown } from "#app/components/markdown.tsx"
import { ChangeEvent, Dispatch, SetStateAction, useEffect, useState } from "react"
import { useDebounce } from '#app/utils/misc.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_DOCUMENT } from '#app/constants.ts'
import { type ClaimList } from '#app/repositories/fact-checking.ts'
import { useOptionalUser } from "#app/utils/user.ts"
import { PollType } from "#app/types/api-types.ts"
import { Link } from "@remix-run/react"

export default function SubmitFactCheckWizard() {
	const quoteStateStorageKey = 'claim-extraction-statement'
	const claimsStorageKey = 'extracted-claims'
	const originUrlStorageKey = 'claim-extraction-origin'

	const [submissionStepState, setSubmissionStepState] = useState<number>(0)

	const [quoteState, setQuoteState] = useState<string>('')
	const [originUrlState, setOriginUrlState] = useState<string>('')

	const [claimsState, setClaimsState] = useState<ClaimList>({
		claim_context: '',
		extracted_claims: [],
	})

	useEffect(() => {
		const storedQuoteState = localStorage.getItem(quoteStateStorageKey)
		if (storedQuoteState !== null) {
			setQuoteState(storedQuoteState)
		}

		const storedOriginValue = localStorage.getItem(originUrlStorageKey)
		if (storedOriginValue !== null) {
			setOriginUrlState(storedOriginValue)
		}

		const storedClaimsState = localStorage.getItem(claimsStorageKey)
		if (storedClaimsState !== null) {
			setClaimsState(JSON.parse(storedClaimsState) as ClaimList)
		}
	}, [])

	return(
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			{(submissionStepState == 0) && (
				<ClaimExtractionForm
					quoteState={quoteState}
					setQuoteState={setQuoteState}
					quoteStateStorageKey={quoteStateStorageKey}
					originUrlState={originUrlState}
					setOriginUrlState={setOriginUrlState}
					originUrlStorageKey={originUrlStorageKey}
					claimsStorageKey={claimsStorageKey}
					setClaimsState={setClaimsState}
				/>
			)}
			{(submissionStepState == 1) && (
				<ExtractedClaimList claims={claimsState} origin={originUrlState} />
			)}
		</div>
	)
}

function ClaimExtractionForm({
	quoteState,
	setQuoteState,
	quoteStateStorageKey,
	originUrlState,
	setOriginUrlState,
	originUrlStorageKey,
	claimsStorageKey,
	setClaimsState,
}: {
	quoteState: string
	setQuoteState: Dispatch<SetStateAction<string>>
	quoteStateStorageKey: string
	originUrlState: string
	setOriginUrlState: Dispatch<SetStateAction<string>>
	originUrlStorageKey: string
	claimsStorageKey: string
	setClaimsState: Dispatch<SetStateAction<ClaimList>>
}) {
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

	const [isExtractingClaims, setIsExtractingClaims] = useState(false)

	async function handleExtractClaims(quote: string) {
		setIsExtractingClaims(true)
		try {
			const payload = {
				quote: quote,
			}
			const response = await fetch('/extract-claims', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const newExtractedClaims = (await response.json()) as ClaimList
			setClaimsState(newExtractedClaims)
			localStorage.setItem(claimsStorageKey, JSON.stringify(newExtractedClaims))
		} finally {
			setIsExtractingClaims(false)
		}
	}

	const infoText = `
## Submit a Request

Paste anything you want to fact-check or discuss here.
We use an LLM to extract the claims made in the statement.
You can then decide which ones you want to post as fact-check or discussion polls.
`

	const disclaimer = `
Press **Ctrl + Enter** to extract claims.  
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<>
			<div className="mb-4">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>
			<Textarea
				placeholder="Something on the Internet you want fact-checked"
				name="content"
				value={quoteState}
				maxLength={MAX_CHARS_PER_DOCUMENT}
				onChange={event => {
					quoteStateChangeHandler(event)
					setQuoteState(event.target.value)
				}}
				className="mb-2 min-h-[150px] w-full"
				onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
					if (event.ctrlKey && event.key === 'Enter') {
						event.preventDefault() // Prevent default behavior if needed
						handleExtractClaims(quoteState)
					}
				}}
			/>
			<Textarea
				placeholder="Where you found it (URL, optional)"
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
				onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
					if (event.ctrlKey && event.key === 'Enter') {
						event.preventDefault() // Prevent default behavior if needed
						handleExtractClaims(quoteState)
					}
				}}
			/>
			{urlError && originUrlState !== '' && (
				<div className="text-sm text-red-500">Please enter a valid URL.</div>
			)}
			<div className="mb-6 flex flex-row">
				<div className="mr-auto self-end text-gray-500">
					<Markdown deactivateLinks={false}>{disclaimer}</Markdown>
				</div>
				<button
					title="Ctrl + Enter"
					disabled={isExtractingClaims}
					className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
					onClick={e => {
						e.preventDefault()
						handleExtractClaims(quoteState)
					}}
				>
					{isExtractingClaims ? 'Extracting Claims...' : 'Extract Claims'}
				</button>
			</div>
		</>
	)
}

function ExtractedClaimList({
	claims,
	origin,
}: {
	claims: ClaimList
	origin?: string
}) {
	return claims.extracted_claims.length == 0 ? (
		<></>
	) : (
		<>
			<div>
				<Markdown deactivateLinks={false}>{'## Extracted Claims'}</Markdown>
				<div className="mt-4">
					<Markdown deactivateLinks={false}>
						{'**Context:** ' + claims.claim_context}
					</Markdown>
				</div>
			</div>
			<div className="mt-5">
				{claims.extracted_claims.map((claim, index) => {
					return (
						<ExtractedClaim
							key={'claim-' + String(index)}
							claim={claim}
							context={claims.claim_context}
							origin={origin}
						/>
					)
				})}
			</div>
		</>
	)
}

type Claim = {
	claim: string
	claim_without_indirection: string
	normative_or_descriptive: string
}

function ExtractedClaim({
	claim,
	context,
	origin,
}: {
	claim: Claim
	context: string
	origin?: string
}) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [submitted, setSubmitted] = useState<boolean>(false)
	const [newSubmissionPostId, setNewSubmissionPostId] = useState<number | null>(
		null,
	)

	const user = useOptionalUser()

	async function handleSubmit(
		claim: Claim,
		context: string,
		pollType: PollType,
	) {
		setIsSubmitting(true)
		try {
			const payload = {
				context: context,
				claim: claim.claim_without_indirection,
				origin: origin,
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
			setIsSubmitting(false)
		}
	}

	return (
		<div className="mb-5 flex flex-col rounded-xl border-2 border-solid bg-post p-4 dark:border-gray-700">
			<div>{claim.claim_without_indirection}</div>
			{user && (
				<div className="flex w-full flex-row">
					{!submitted && (
						<button
							disabled={isSubmitting}
							className="ml-auto mt-2 rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
							onClick={e => {
								e.preventDefault()
								handleSubmit(claim, context, PollType.FactCheck)
							}}
						>
							{isSubmitting ? 'Submitting...' : 'Create Fact Check'}
						</button>
					)}
					{!submitted && (
						<button
							disabled={isSubmitting}
							className="ml-2 mt-2 rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
							onClick={e => {
								e.preventDefault()
								handleSubmit(claim, context, PollType.Opinion)
							}}
						>
							{isSubmitting ? 'Submitting...' : 'Create Opinion Poll'}
						</button>
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

function isValidUrl(url: string): boolean {
	try {
		new URL(url)
		return true
	} catch (_) {
		return false
	}
}

