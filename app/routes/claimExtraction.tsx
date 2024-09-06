import { Link, useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { db } from '#app/db.ts'
import { getChronologicalFactCheckPosts } from '#app/repositories/ranking.ts'
import { type ClaimList } from '#app/utils/claim-extraction.ts'
import { TopLevelPost } from './discuss.tsx'

export async function loader() {
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalFactCheckPosts(trx)
	})
	return { feed }
}

export default function ClaimExtraction() {
	const { feed } = useLoaderData<typeof loader>()

	const [textAreaValue, setTextAreaValue] = useState<string>('')
	const [isExtractingClaims, setIsExtractingClaims] = useState(false)

	const [claims, setClaims] = useState<ClaimList>({
		claim_context: '',
		extracted_claims: [],
	})

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
			const newExtractedClaims = (await response.json()) as ClaimList
			setClaims(newExtractedClaims)
		} finally {
			setIsExtractingClaims(false)
		}
	}

	const infoText = `
## Jabble Fact Checking

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
			<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
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
				<div className="mb-6 flex flex-row">
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
			<ExtractedClaimList claims={claims} />
			<div>
				{feed.map((post, index) => {
					return (
						<TopLevelPost key={'fact-check-' + String(index)} post={post} />
					)
				})}
			</div>
		</div>
	)
}

type Claim = {
	claim: string
	fact_or_opinion: string
	verifiable_or_debatable: string
	contains_judgment: boolean
}

function ExtractedClaimList({ claims }: { claims: ClaimList }) {
	return claims.extracted_claims.length == 0 ? (
		<></>
	) : (
		<>
			<div className="px-4">
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
						/>
					)
				})}
			</div>
		</>
	)
}

function ExtractedClaim({ claim, context }: { claim: Claim; context: string }) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
	const [submitted, setSubmitted] = useState<boolean>(false)
	const [newSubmissionPostId, setNewSubmissionPostId] = useState<number | null>(
		null,
	)

	async function handleSubmit(claim: Claim, context: string) {
		setIsSubmitting(true)
		try {
			const payload = {
				context: context,
				claim: claim.claim,
				factOrOpinion: claim.fact_or_opinion,
				verifiableOrDebatable: claim.verifiable_or_debatable,
				containsJudgment: String(claim.contains_judgment),
			}
			const response = await fetch('/createPostFromClaim', {
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
		<div className="mb-5 flex flex-col rounded-xl border-2 border-solid p-4">
			<div>{claim.claim}</div>
			<div className="flex w-full flex-row">
				{!submitted && (
					<button
						title="Ctrl + Enter"
						disabled={isSubmitting}
						className="ml-auto mt-2 rounded bg-purple-200 px-4 py-2 text-base font-bold text-black dark:bg-yellow-200"
						onClick={e => {
							e.preventDefault()
							handleSubmit(claim, context)
						}}
					>
						{isSubmitting ? 'Submitting...' : 'Create Fact Check'}
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
		</div>
	)
}
