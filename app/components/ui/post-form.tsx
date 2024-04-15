import { useFetcher } from '@remix-run/react'
import { useState, type FormEvent } from 'react'
import { Textarea } from '#app/components/ui/textarea.tsx'

export function PostForm({
	tag,
	className,
}: {
	tag: string
	className?: string
}) {
	const [textAreaValue, setTextAreaValue] = useState<string>('')

	const replyFetcher = useFetcher<{ newPostId: number }>()
	const handleSubmit = function (event: FormEvent<HTMLFormElement>) {
		replyFetcher.submit(event.currentTarget)
		setTextAreaValue('')
	}

	return (
		<replyFetcher.Form
			id="create-post"
			method="post"
			action="/reply"
			onSubmit={handleSubmit}
		>
			<div className={`flex flex-col items-end ${className || ''}`}>
				<input type="hidden" name="tag" value={`${tag}`} />
				<Textarea
					placeholder="What's on your mind?"
					name="content"
					value={textAreaValue}
					onChange={event => setTextAreaValue(event.target.value)}
					className="mb-2 w-full"
				/>
				<button
					disabled={replyFetcher.state !== 'idle'}
					className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700"
				>
					{replyFetcher.state === 'idle' ? 'Post' : 'submitting...'}
				</button>
			</div>
		</replyFetcher.Form>
	)
}
