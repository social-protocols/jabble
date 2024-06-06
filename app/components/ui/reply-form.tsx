import { Textarea } from '#app/components/ui/textarea.tsx'
import { type ScoredPost } from '#app/ranking.ts'

export function ReplyForm({
	post,
	isPrivate,
	className,
}: {
	post: ScoredPost
	isPrivate: boolean
	className: string
}) {
	return (
		<div className={'flex flex-col items-end ' + className}>
			<input type="hidden" name="parentId" value={post.id} />
			<input type="hidden" name="isPrivate" value={Number(isPrivate)} />

			<Textarea
				name="content"
				className="mb-2 w-full"
				style={{
					resize: 'vertical',
				}}
				autoFocus={true}
				placeholder="Enter your reply"
			/>

			<div>
				<button className="rounded bg-blue-500 px-4 py-2 text-base font-bold text-white hover:bg-blue-700">
					Reply
				</button>
			</div>
		</div>
	)
}
