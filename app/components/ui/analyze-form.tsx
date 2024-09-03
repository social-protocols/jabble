import { useFetcher } from '@remix-run/react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { type PlaygroundPost } from '#app/types/api-types.ts'
import { Markdown } from '../markdown.tsx'

export function AnalyzeForm({
	setPlaygroundPosts,
	setCurrentAnalysis,
	className,
}: {
	setPlaygroundPosts: Dispatch<SetStateAction<PlaygroundPost[]>>
	setCurrentAnalysis: Dispatch<SetStateAction<PlaygroundPost | null>>
	className?: string
}) {
	const [textAreaValue, setTextAreaValue] = useState<string>('')
	const [isAnalyzing, setIsAnalyzing] = useState(false)

	const replyFetcher = useFetcher<{ newPostId: number }>()

	async function handleAnalyze() {
		setIsAnalyzing(true)
		try {
			const payload = {
				content: textAreaValue,
			}
			const response = await fetch('/analyze', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' },
			})
			const responseJson = await response.json() as { newPlaygroundPost: PlaygroundPost, nLatestPlaygroundPosts: PlaygroundPost[] }
			setPlaygroundPosts(responseJson.nLatestPlaygroundPosts)
			setCurrentAnalysis(responseJson.newPlaygroundPost)
		} finally {
			setIsAnalyzing(false)
		}
	}

	const disclaimer = `
Press **Ctrl + Enter** to analyze.  
**Disclaimer**: Your text will be sent to the OpenAI API for analysis.
`

	return (
		<replyFetcher.Form
			id="analyze-post"
			method="post"
			action="/analyze"
			onSubmit={handleAnalyze}
		>
			<div className={`flex flex-col ${className || ''}`}>
				<Textarea
					placeholder="Something you want to be analyzed for fallacies."
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 w-full min-h-[150px]"
					onKeyDown={
						(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
							if (event.ctrlKey && event.key === 'Enter') {
								event.preventDefault(); // Prevent default behavior if needed
								handleAnalyze();
							}
						}
					}
				/>
				<div className={'flex flex-row'}>
					<div className="text-gray-500 mr-auto self-end">
						<Markdown deactivateLinks={false}>{disclaimer}</Markdown>
					</div>
					<button
						title="Ctrl + Enter"
						disabled={isAnalyzing}
						className="rounded bg-yellow-200 px-4 py-2 text-base font-bold text-black dark:bg-yellow-200"
						onClick={e => {
							e.preventDefault()
							handleAnalyze()
						}}
					>
						{isAnalyzing ? 'Analyzing...' : 'Analyze'}
					</button>
				</div>
			</div>
		</replyFetcher.Form>
	)
}
