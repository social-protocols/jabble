import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { Markdown } from '#app/components/markdown.tsx'
import { ClaimList } from '#app/utils/claim-extraction.ts'

export default function ClaimExtraction() {

	const [textAreaValue, setTextAreaValue] = useState<string>('')
	const [isAnalyzing, setIsAnalyzing] = useState(false)

	const [claims, setClaims] = useState<ClaimList>({ extracted_claims: [] })

	const replyFetcher = useFetcher<{ newPostId: number }>()

	async function handleExtractClaims() {
		setIsAnalyzing(true)
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
			setIsAnalyzing(false)
		}
	}

	const disclaimer = `
Press **Ctrl + Enter** to extract claims.  
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<div>
			<div className="mb-4 space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
				<replyFetcher.Form
					id="extract-claims"
					method="post"
					action="/extractClaims"
					onSubmit={handleExtractClaims}
				>
					<div className="flex flex-col">
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
								disabled={isAnalyzing}
								className="rounded bg-purple-200 px-4 py-2 text-base font-bold text-black dark:bg-yellow-200"
								onClick={e => {
									e.preventDefault()
									handleExtractClaims()
								}}
							>
								{isAnalyzing ? 'Extracting Claims...' : 'Extract Claims'}
							</button>
						</div>
						<ExtractedClaims claims={claims}/>
					</div>
				</replyFetcher.Form>
			</div>
		</div>
	)
}

function ExtractedClaims({
	claims,
}: {
	claims: ClaimList
}) {
	return claims.extracted_claims.length == 0 ? (
		<></>
	) : (
		<>
			<Markdown deactivateLinks={false}>{"## Extracted Claims"}</Markdown>
			{claims.extracted_claims.map(claim => {
				return (
					<div className="mb-5 border-2 border-solid p-2 rounded-md">
						<div><span className="font-bold">Claim: </span>{claim.claim}</div>
						<div><span className="font-bold">Context: </span>{claim.context}</div>
						<div>Fact or Opinion: {claim.fact_or_opinion}</div>
						<div>Verifiable or Debatable: {claim.verifiable_or_debatable}</div>
						<div>Contains Judgment: {String(claim.contains_judgment)}</div>
					</div>
				)
			})}
		</>
	)
}
