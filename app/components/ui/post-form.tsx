import { useFetcher } from '@remix-run/react'
import { type ChangeEvent, useState, type FormEvent } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import {
	type FallacyList,
	FallacyListSchema,
} from '#app/utils/fallacy_detection.ts'
import { RenderFallacyList } from './post-info-bar.tsx'

export function PostForm({ className }: { className?: string }) {
	const [textAreaValue, setTextAreaValue] = useState<string>('')
	const [analysis, setAnalysis] = useState<FallacyList | null>(null)
	const [isAnalyzing, setIsAnalyzing] = useState(false)

	const [isPrivate, setIsPrivate] = useState<number>(0)

	const replyFetcher = useFetcher<{ newPostId: number }>()
	const handleSubmit = function (event: FormEvent<HTMLFormElement>) {
		replyFetcher.submit(event.currentTarget)
		setTextAreaValue('')
	}

	function handleCheckboxChange(event: ChangeEvent<HTMLInputElement>) {
		setIsPrivate(Number(event.target.checked))
	}

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

			setAnalysis(FallacyListSchema.parse(await response.json()))
		} finally {
			setIsAnalyzing(false)
		}
	}

	return (
		<replyFetcher.Form
			id="create-post"
			method="post"
			action="/createPost"
			onSubmit={handleSubmit}
		>
			<div className={`flex flex-col ${className || ''}`}>
				<Textarea
					placeholder="Something that can be voted to be true or false."
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 w-full"
				/>
				<div className={'flex w-full flex-row'}>
					<button
						disabled={isAnalyzing}
						className=" mr-auto rounded  bg-yellow-200 px-4 py-2 text-base font-bold  text-black dark:bg-yellow-200"
						onClick={e => {
							e.preventDefault()
							handleAnalyze()
						}}
					>
						{isAnalyzing ? 'Analyzing...' : 'Analyze'}
					</button>
					<div
						className="mr-2 mt-2"
						title="If you check this box, your discussion will not appear on the discussion feed."
					>
						<input type="hidden" name="isPrivate" value={isPrivate} />
						<input
							className={'mr-2'}
							type="checkbox"
							name="isPrivateCheckbox"
							onChange={handleCheckboxChange}
						/>
						<label className={'text-gray-700'} htmlFor="isPrivate">
							unlisted
						</label>
					</div>
					<button
						disabled={replyFetcher.state !== 'idle'}
						className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700"
					>
						{replyFetcher.state === 'idle'
							? 'Create Fact-Check'
							: 'submitting...'}
					</button>
				</div>
				{analysis && (
					<RenderFallacyList className="mb-4 mt-4" fallacies={analysis} />
				)}
			</div>
		</replyFetcher.Form>
	)
}
