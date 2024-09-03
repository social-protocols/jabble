import { useFetcher } from '@remix-run/react'
import { Dispatch, SetStateAction, useState } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { PlaygroundPost } from '#app/types/api-types.js'

export function AnalyzeForm({
	setPlaygroundPosts,
	className
}: {
	setPlaygroundPosts: Dispatch<SetStateAction<PlaygroundPost[]>>
	className?: string }) {
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
			setPlaygroundPosts((await response.json()) as PlaygroundPost[])
			setTextAreaValue('')
		} finally {
			setIsAnalyzing(false)
		}
	}

	return (
		<replyFetcher.Form
			id="analyze-post"
			method="post"
			action="/analyze"
			onSubmit={handleAnalyze}
		>
			<div className={`flex flex-col items-end ${className || ''}`}>
				<Textarea
					placeholder="Something you want to be analyzed for fallacies."
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 w-full"
				/>
				<div className={'flex w-full flex-row'}>
					<button
						disabled={isAnalyzing}
						className="mr-auto rounded bg-yellow-200 px-4 py-2 text-base font-bold text-black dark:bg-yellow-200"
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

