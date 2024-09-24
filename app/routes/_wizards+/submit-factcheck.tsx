import { Link } from '@remix-run/react'
import {
	type ChangeEvent,
	type Dispatch,
	type SetStateAction,
	useEffect,
	useState,
} from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_QUOTE } from '#app/constants.ts'
import { type FallacyList } from '#app/repositories/fallacy-detection.ts'
import { Artefact, PollType, type CandidateClaim } from '#app/types/api-types.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#app/components/ui/tabs.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

enum SubmitFactCheckWizardStep {
	QuoteInput = 0,
	ClaimSubmission = 1,
}

export default function SubmitFactCheckWizard() {
	const quoteStateStorageKey = 'claim-extraction-statement'
	const claimsStorageKey = 'extracted-claims'
	const originUrlStorageKey = 'claim-extraction-origin'

	const [submissionStepState, setSubmissionStepState] =
		useState<SubmitFactCheckWizardStep>(SubmitFactCheckWizardStep.QuoteInput)

	const [quoteState, setQuoteState] = useState<string>('')
	const [originUrlState, setOriginUrlState] = useState<string>('')

	const [claimsState, setClaimsState] = useState<CandidateClaim[]>([])
	const [fallaciesState, setFallaciesState] = useState<
		FallacyList | undefined
	>()
	const [artefactState, setArtefactState] = useState<Artefact | undefined>()

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
			setClaimsState(JSON.parse(storedClaimsState) as CandidateClaim[])
		}
	}, [])

	return (
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			{submissionStepState == SubmitFactCheckWizardStep.QuoteInput && (
				<QuoteInputStep
					quoteState={quoteState}
					setQuoteState={setQuoteState}
					quoteStateStorageKey={quoteStateStorageKey}
					originUrlState={originUrlState}
					setOriginUrlState={setOriginUrlState}
					originUrlStorageKey={originUrlStorageKey}
					claimsStorageKey={claimsStorageKey}
					setClaimsState={setClaimsState}
					setSubmissionStepState={setSubmissionStepState}
					setFallaciesState={setFallaciesState}
					setArtefactState={setArtefactState}
				/>
			)}
			{submissionStepState == SubmitFactCheckWizardStep.ClaimSubmission && artefactState && (
				<SubmitFactChecksAndFallaciesStep artefact={artefactState} quote={quoteState} claims={claimsState} fallacies={fallaciesState} />
			)}
		</div>
	)
}

function QuoteInputStep({
	quoteState,
	setQuoteState,
	quoteStateStorageKey,
	originUrlState,
	setOriginUrlState,
	originUrlStorageKey,
	claimsStorageKey,
	setClaimsState,
	setSubmissionStepState,
	setFallaciesState,
	setArtefactState,
}: {
	quoteState: string
	setQuoteState: Dispatch<SetStateAction<string>>
	quoteStateStorageKey: string
	originUrlState: string
	setOriginUrlState: Dispatch<SetStateAction<string>>
	originUrlStorageKey: string
	claimsStorageKey: string
	setClaimsState: Dispatch<SetStateAction<CandidateClaim[]>>
	setSubmissionStepState: Dispatch<SetStateAction<SubmitFactCheckWizardStep>>
	setFallaciesState: Dispatch<SetStateAction<FallacyList | undefined>>
	setArtefactState: Dispatch<SetStateAction<Artefact | undefined>>
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

	async function handleExtractClaims(quote: string, originUrl: string) {
		const description = null // TODO: argument to this function, optional submission

		setIsExtractingClaims(true)
		try {
			const payload = {
				url: originUrl,
				description: description,
				quote: quote,
			}
			const response = await fetch('/analyze-artefact', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const { artefact, detectedFallacies, candidateClaims } =
				(await response.json()) as {
					artefact: Artefact
					detectedFallacies: FallacyList
					candidateClaims: CandidateClaim[]
				}
			setClaimsState(candidateClaims)
			setFallaciesState(detectedFallacies)
			setArtefactState(artefact)
			localStorage.setItem(claimsStorageKey, JSON.stringify(candidateClaims))
		} finally {
			setIsExtractingClaims(false)
			setSubmissionStepState(SubmitFactCheckWizardStep.ClaimSubmission)
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
				maxLength={MAX_CHARS_PER_QUOTE}
				onChange={event => {
					quoteStateChangeHandler(event)
					setQuoteState(event.target.value)
				}}
				className="mb-2 min-h-[150px] w-full"
				onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
					if (event.ctrlKey && event.key === 'Enter') {
						event.preventDefault() // Prevent default behavior if needed
						handleExtractClaims(quoteState, originUrlState)
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
						handleExtractClaims(quoteState, originUrlState)
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
						handleExtractClaims(quoteState, originUrlState)
					}}
				>
					{isExtractingClaims ? 'Extracting Claims...' : 'Extract Claims'}
				</button>
			</div>
		</>
	)
}

function SubmitFactChecksAndFallaciesStep({
	artefact,
	quote,
	claims,
	fallacies,
}: {
	artefact: Artefact
	quote: string
	claims: CandidateClaim[],
	fallacies: FallacyList | undefined,
}) {

	return claims.length == 0 ? (
		<></>
	) : (
		<>
			<div className="mb-2">
				<div className="flex flex-col p-4 bg-post rounded-xl">
					<Icon name="quote" size="xl" className="mr-auto mb-2" />
					{quote}
					<div className="mt-2 ml-auto">
						<Link to={artefact.url} className="text-blue-500 underline">Go to source</Link>
					</div>
				</div>
			</div>
			<Tabs defaultValue="fallacies" className="w-full">
				<TabsList className="w-full">
					<TabsTrigger value="fallacies" className="w-full">Detected Fallacies</TabsTrigger>
					<TabsTrigger value="claims" className="w-full">Extracted Claims</TabsTrigger>
				</TabsList>
				<TabsContent value="fallacies">
					{fallacies && <DetectedFallacies fallacies={fallacies}/>}
				</TabsContent>
				<TabsContent value="claims">
					<div className="mt-5">
						{claims.map((claim, index) => {
							return <ExtractedClaim key={'claim-' + String(index)} claim={claim} />
						})}
					</div>
				</TabsContent>
			</Tabs>
			<Link
				to="/polls"
				className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300 text-center"
			>
				Finish
			</Link>
		</>
	)
}

function DetectedFallacies({ fallacies }: { fallacies: FallacyList }) {
	const fallacyLabelClassNames =
		'rounded-full bg-yellow-200 px-2 text-black dark:bg-yellow-200'

	return (
		<div>
			<ul className="ml-4 list-disc">
				{fallacies.map(f => (
					<li key={f.name}>
						<span className={fallacyLabelClassNames}>{f.name}</span>
						<span className="ml-2">{(f.probability * 100).toFixed(0)}%</span>
						<div className="mb-4 mt-1">{f.analysis}</div>
					</li>
				))}
				{fallacies.length == 0 && (
					<p className="py-6">No fallacies detected.</p>
				)}
			</ul>
		</div>
	)
}

function ExtractedClaim({ claim }: { claim: CandidateClaim }) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [submitted, setSubmitted] = useState<boolean>(false)
	const [newSubmissionPostId, setNewSubmissionPostId] = useState<number | null>(
		null,
	)

	const user = useOptionalUser()

	async function handleSubmit(claim: CandidateClaim, pollType: PollType) {
		setIsSubmitting(true)
		try {
			const payload = {
				candidateClaimId: claim.id,
				artefactId: claim.artefactId,
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
			<div>{claim.claim}</div>
			{user && (
				<div className="flex w-full flex-row">
					{!submitted && (
						<button
							disabled={isSubmitting}
							className="ml-auto mt-2 rounded bg-purple-200 px-4 py-2 text-base font-bold text-black hover:bg-purple-300"
							onClick={e => {
								e.preventDefault()
								handleSubmit(claim, PollType.FactCheck)
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
								handleSubmit(claim, PollType.Opinion)
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
