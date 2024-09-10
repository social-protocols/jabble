import { Link, useLoaderData } from '@remix-run/react'
import moment from 'moment'
import { useState } from 'react'
import { Markdown } from '#app/components/markdown.tsx'
import PollResult from '#app/components/ui/poll-result.tsx'
import { PostContent } from '#app/components/ui/post-content.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'
import { db } from '#app/db.ts'
import { type ClaimList } from '#app/repositories/fact-checking.ts'
import { getChronologicalPolls } from '#app/repositories/ranking.ts'
import { PollType, type FrontPagePost } from '#app/types/api-types.ts'
import { useOptionalUser } from '#app/utils/user.ts'

export async function loader() {
	const feed = await db.transaction().execute(async trx => {
		return await getChronologicalPolls(trx)
	})
	return { feed }
}

export default function ClaimExtraction() {
	const { feed } = useLoaderData<typeof loader>()

	const [statementValue, setStatementValue] = useState<string>('')
	const [originValue, setOriginValue] = useState<string>('')
	const [isExtractingClaims, setIsExtractingClaims] = useState(false)
	const [claims, setClaims] = useState<ClaimList>({
		claim_context: '',
		extracted_claims: [],
	})
	const [urlError, setUrlError] = useState<boolean>(false)

	async function handleExtractClaims() {
		setIsExtractingClaims(true)
		try {
			const payload = {
				content: statementValue,
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
## Jabble Polls

You can create either **opinion polls** (*agree/disagree*) or **fact check polls** (*true/false*).

Copy and paste something you want to fact-check or discuss here.
We use an LLM to extract claims that you can post as opinion or fact-check polls.
You can then decide which ones you want to post.
You can also add an origin (for example a URL) to give context to where you found the statement.
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
					placeholder="A statement to extract claims from."
					name="content"
					value={statementValue}
					maxLength={MAX_CHARS_PER_POST}
					onChange={event => setStatementValue(event.target.value)}
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
				<ExtractedClaimList claims={claims} origin={originValue} />
			</div>
			<div>
				<div className="mb-5 px-4">
					<Markdown deactivateLinks={false}>{'## Recent Polls'}</Markdown>
				</div>
				{feed.map((post, index) => {
					return <PollPost key={'fact-check-' + String(index)} post={post} />
				})}
			</div>
		</div>
	)
}

type Claim = {
	claim: string
	claim_without_indirection: string
	normative_or_descriptive: string
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
			const response = await fetch('/createPoll', {
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

function PollPost({
	post,
	className,
}: {
	post: FrontPagePost
	className?: string
}) {
	const ageString = moment(post.createdAt).fromNow()
	const commentString = post.nTransitiveComments == 1 ? 'comment' : 'comments'

	return (
		<div
			className={
				'mb-2 w-full min-w-0 rounded-xl border-2 border-solid border-gray-200 bg-post px-3 py-2 dark:border-gray-700 ' +
				(className || '')
			}
		>
			<div className="flex">
				<div className="flex w-full flex-col">
					<div className="mb-2 text-sm opacity-50">{ageString}</div>
					<PostContent
						content={post.content}
						deactivateLinks={false}
						linkTo={`/post/${post.id}`}
					/>
					<div className="mt-2 text-sm opacity-50">
						<Link to={`/post/${post.id}`}>
							{post.nTransitiveComments} {commentString}
						</Link>
					</div>
				</div>
				<PollResult
					postId={post.id}
					pCurrent={post.p || NaN}
					voteCount={post.oSize}
					pollType={post.pollType}
				/>
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
