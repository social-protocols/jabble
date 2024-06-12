import { useFetcher } from '@remix-run/react'
import { type ChangeEvent, useState, type FormEvent } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'

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
					placeholder="What's on your mind?"
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 w-full"
				/>
				<div className={'flex flex-row'}>
					<div className="mr-2 mt-2">
						<input type="hidden" name="isPrivate" value={isPrivate} />
						<input
							className={'mr-2'}
							type="checkbox"
							name="isPrivateCheckbox"
							onChange={handleCheckboxChange}
						/>
						<label className={'text-gray-700'} htmlFor="isPrivate">
							private
						</label>
					</div>
					<button
						disabled={replyFetcher.state !== 'idle'}
						className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700"
					>
						{replyFetcher.state === 'idle' ? 'Post' : 'submitting...'}
					</button>
				</div>
			</div>
		</replyFetcher.Form>
	)
}
