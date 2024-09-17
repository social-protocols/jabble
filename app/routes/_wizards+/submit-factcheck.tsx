import { Markdown } from "#app/components/markdown.tsx"
import { Icon } from "#app/components/ui/icon.tsx"
import { ChangeEvent, useState } from "react"
import { useDebounce } from '#app/utils/misc.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_DOCUMENT } from '#app/constants.ts'
import { type ClaimList } from '#app/repositories/fact-checking.ts'
import { useOptionalUser } from "#app/utils/user.ts"
import { PollType } from "#app/types/api-types.ts"
import { Link } from "@remix-run/react"

export default function SubmitFactCheckWizard() {

	const infoText = `
## Submit a Request

Paste anything you want to fact-check or discuss here.
We use an LLM to extract the claims made in the statement.
You can then decide which ones you want to post as fact-check or discussion polls.
`

	const [showClaimExtractionForm, setShowClaimExtractionForm] =
		useState<boolean>(false)

	return(
			<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
				<div className="mb-4">
					<Markdown deactivateLinks={false}>{infoText}</Markdown>
				</div>
				<div className="text-md flex w-full">
					<button
						onClick={() => {
							setShowClaimExtractionForm(!showClaimExtractionForm)
							return false
						}}
						className="shrink-0 font-bold text-purple-700 dark:text-purple-200"
					>
						{showClaimExtractionForm ? (
							<Icon name="chevron-down">Start extracting claims</Icon>
						) : (
							<Icon name="chevron-right">Start extracting claims</Icon>
						)}
					</button>
					{showClaimExtractionForm && (
						<button
							className="ml-auto self-center pr-2"
							onClick={() => setShowClaimExtractionForm(false)}
						>
							✕
						</button>
					)}
				</div>
				{
					/* 
						This is a hack. The localStorage object is only accessible on the
						client-side, so we have to make sure this component is not rendered on
						the server. There are other ways to do this (which are also hacky), but
						for the time being, it's easiest to just hide this form and render it on
						click on a button.
					*/
					showClaimExtractionForm && <ClaimExtractionForm />
				}
			</div>
	)
}

function ClaimExtractionForm() {
	const statementValueStorageKey = 'claim-extraction-statement'
	const [statementValue, setStatementValue] = useState<string>(
		() => localStorage.getItem(statementValueStorageKey) ?? '',
	)
	const statementValueChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			localStorage.removeItem(claimsStorageKey)
			localStorage.setItem(statementValueStorageKey, event.target.value)
		},
		500,
	)

	const originValueStorageKey = 'claim-extraction-origin'
	const [originValue, setOriginValue] = useState<string>(
		() => localStorage.getItem(originValueStorageKey) ?? '',
	)
	const originValueChangeHandler = useDebounce(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			localStorage.setItem(originValueStorageKey, event.target.value)
		},
		500,
	)

	const claimsStorageKey = 'extracted-claims'
	const [claims, setClaims] = useState<ClaimList>(() => {
		const claimsFromLocalStorage = localStorage.getItem(claimsStorageKey)
		if (claimsFromLocalStorage == null) {
			return {
				claim_context: '',
				extracted_claims: [],
			}
		}
		return JSON.parse(claimsFromLocalStorage) as ClaimList
	})

	const [isExtractingClaims, setIsExtractingClaims] = useState(false)
	const [urlError, setUrlError] = useState<boolean>(
		() => (!isValidUrl(originValue) && !(originValue == '')) || false,
	)

	async function handleExtractClaims() {
		setIsExtractingClaims(true)
		try {
			const payload = {
				content: statementValue,
			}
			const response = await fetch('/extract-claims', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const newExtractedClaims = (await response.json()) as ClaimList
			setClaims(newExtractedClaims)
			localStorage.setItem(claimsStorageKey, JSON.stringify(newExtractedClaims))
		} finally {
			setIsExtractingClaims(false)
		}
	}

	const disclaimer = `
Press **Ctrl + Enter** to extract claims.  
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<>
			<Textarea
				placeholder="A statement to extract claims from."
				name="content"
				value={statementValue}
				maxLength={MAX_CHARS_PER_DOCUMENT}
				onChange={event => {
					statementValueChangeHandler(event)
					setStatementValue(event.target.value)
				}}
				className="mb-2 min-h-[150px] w-full"
				onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
					if (event.ctrlKey && event.key === 'Enter') {
						event.preventDefault() // Prevent default behavior if needed
						handleExtractClaims()
					}
				}}
			/>
			<Textarea
				placeholder="URL (optional, where the statement was made)"
				name="origin-url"
				value={originValue}
				onChange={event => {
					originValueChangeHandler(event)
					setOriginValue(event.target.value)
					isValidUrl(event.target.value)
						? setUrlError(false)
						: setUrlError(true)
				}}
				className={
					'mb-2 h-4 w-full ' +
					(urlError && originValue !== '' ? 'border-2 border-red-500' : '')
				}
				onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
					if (event.ctrlKey && event.key === 'Enter') {
						event.preventDefault() // Prevent default behavior if needed
						handleExtractClaims()
					}
				}}
			/>
			{urlError && originValue !== '' && (
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
						handleExtractClaims()
					}}
				>
					{isExtractingClaims ? 'Extracting Claims...' : 'Extract Claims'}
				</button>
			</div>
			{/*<ExtractedClaimList claims={claims} origin={originValue} />*/}
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
			<div className="mt-6">
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

