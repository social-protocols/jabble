import { useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { ClaimList } from '#app/utils/claim-extraction.ts'
import { Link } from '@remix-run/react'

export default function ClaimExtraction() {

	const [textAreaValue, setTextAreaValue] = useState<string>('')
	const [isExtractingClaims, setIsExtractingClaims] = useState(false)

	const [claims, setClaims] = useState<ClaimList>({ extracted_claims: [] })

	async function handleExtractClaims() {
		setIsExtractingClaims(true)
		try {
			const payload = {
				content: textAreaValue,
			}
			const response = await fetch('/extractClaims', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const newExtractedClaims = await response.json() as ClaimList
			setClaims(newExtractedClaims)
		} finally {
			setIsExtractingClaims(false)
		}
	}

	const infoText = `
## Jabble Claim Extractor

Copy and paste something you want to fact-check here.
We'll do our best to extract claims that you can fact-check from it.
You can then decide if you want to post them for discussion.
`

	const disclaimer = `
Press **Ctrl + Enter** to extract claims.  
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<div>
			<div className="flex flex-col mb-4 space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
				<div className="mb-4">
					<Markdown deactivateLinks={false}>{infoText}</Markdown>
				</div>
				<Textarea
					placeholder="Something you want claims to be extracted from."
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 min-h-[150px] w-full"
					onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
						if (event.ctrlKey && event.key === 'Enter') {
							event.preventDefault() // Prevent default behavior if needed
							handleExtractClaims()
						}
					}}
				/>
				<div className="flex flex-row mb-6">
					<div className="mr-auto self-end text-gray-500">
						<Markdown deactivateLinks={false}>{disclaimer}</Markdown>
					</div>
					<button
						title="Ctrl + Enter"
						disabled={isExtractingClaims}
						className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black dark:bg-yellow-200"
						onClick={e => {
							e.preventDefault()
							handleExtractClaims()
						}}
					>
						{isExtractingClaims ? 'Extracting Claims...' : 'Extract Claims'}
					</button>
				</div>
			</div>
			<ExtractedClaimList claims={claims}/>
		</div>
	)
}

type ClaimDTO = {
	claim: string
	context: string
	fact_or_opinion: string
	verifiable_or_debatable: string
	contains_judgment: boolean
}

function ExtractedClaimList({
	claims,
}: {
	claims: ClaimList
}) {
	return claims.extracted_claims.length == 0 ? (
		<></>
	) : (
		<>
			<div className="px-4">
				<Markdown deactivateLinks={false}>{"## Extracted Claims"}</Markdown>
			</div>
			<div className="mt-5">
				{claims.extracted_claims.map(claim => {
					return <ExtractedClaim claim={claim} />
				})}
			</div>
		</>
	)
}

function ExtractedClaim({
	claim,
} : {
	claim: ClaimDTO
}) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [submitted, setSubmitted] = useState<boolean>(false)
	const [newSubmissionPostId, setNewSubmissionPostId] = useState<number | null>(null)

	async function handleSubmit(claim: ClaimDTO) {
		setIsSubmitting(true)
		try {
			const payload = {
				claim: claim.claim,
				context: claim.context,
				factOrOpinion: claim.fact_or_opinion,
				verifiableOrDebatable: claim.verifiable_or_debatable,
				containsJudgment: String(claim.contains_judgment),
			}
			const response = await fetch('/createPostFromClaim', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const newPostId = await response.json() as number
			setSubmitted(true)
			setNewSubmissionPostId(newPostId)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="flex flex-col mb-5 border-2 border-solid p-4 rounded-xl">
			<div>{claim.claim}</div>
			<div className="flex flex-row w-full">
				{!submitted && (
					<button
						title="Ctrl + Enter"
						disabled={isSubmitting}
						className="rounded bg-purple-200 ml-auto px-4 py-2 mt-2 text-base font-bold text-black dark:bg-yellow-200"
						onClick={e => {
							e.preventDefault()
							handleSubmit(claim)
						}}
					>
						{isSubmitting ? 'Submitting...' : 'Create Fact Check'}
					</button>
				)}
				{submitted && (
					<Link className="ml-auto px-4 py-2 mt-2 rounded hover:underline hover:bg-post" to={`/post/${newSubmissionPostId}`}>Go to discussion</Link>
				)}
			</div>
		</div>
	)
}
