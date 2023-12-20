import { Textarea } from '#app/components/ui/textarea.tsx'

export function PostForm({
	tag,
	className,
}: {
	tag: string
	className: string
}) {
	return (
		<form id="create-post" method="post">
			<div className={'flex flex-col items-end ' + className}>
				<input type="hidden" name="tag" value={`${tag}`} />
				<Textarea
					className="mb-1 w-full"
					name="newPostContent"
					placeholder="What's on your mind?"
				/>
				<button className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700">
					Post
				</button>
			</div>
		</form>
	)
}
