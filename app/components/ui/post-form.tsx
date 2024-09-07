import { useFetcher } from '@remix-run/react'
import { type ChangeEvent, useState, type FormEvent } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'
import { MAX_CHARS_PER_POST } from '#app/constants.ts'

export function PostForm({ className }: { className?: string }) {
	const [textAreaValue, setTextAreaValue] = useState<string>('')

	const [isPrivate, setIsPrivate] = useState<number>(0)

	const replyFetcher = useFetcher<{ newPostId: number }>()
	const handleSubmit = function (event: FormEvent<HTMLFormElement>) {
		replyFetcher.submit(event.currentTarget)
		setTextAreaValue('')
	}

	function handleCheckboxChange(event: ChangeEvent<HTMLInputElement>) {
		setIsPrivate(Number(event.target.checked))
	}

	return (
		<replyFetcher.Form
			id="create-post"
			method="post"
			action="/createPost"
			onSubmit={handleSubmit}
		>
			<div className={`flex flex-col items-end ${className || ''}`}>
				<Textarea
					placeholder="What would you like to discuss?"
					name="content"
					value={textAreaValue}
					maxLength={MAX_CHARS_PER_POST}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 min-h-[150px] w-full"
				/>
				<div className={'flex flex-row'}>
					<div
						className="mr-2 mt-2"
						title="If you check this box, your discussion will not appear on the discussion feed. Anyone with the link can still join the discussion."
					>
						<input type="hidden" name="isPrivate" value={isPrivate} />
						<input
							className={'mr-2'}
							type="checkbox"
							name="isPrivateCheckbox"
							onChange={handleCheckboxChange}
						/>
						<label htmlFor="isPrivate">unlisted</label>
					</div>
					<button
						disabled={replyFetcher.state !== 'idle'}
						className="rounded bg-blue-200 px-4 py-2 text-base font-bold text-black hover:bg-blue-300"
					>
						{replyFetcher.state === 'idle' ? 'Discuss' : 'Submitting...'}
					</button>
				</div>
			</div>
		</replyFetcher.Form>
	)
}
