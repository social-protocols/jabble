import { Button } from '#app/components/ui/button.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'

export function PostForm({ tag }: { tag: string }) {
	return (
		<div className="w-full rounded-lg bg-primary-foreground p-5">
			<form id="create-post" method="post">
				<input type="hidden" name="tag" value={`${tag}`} />
				<Textarea name="newPostContent" placeholder="What's on your mind?" />
				<Button className="mt-2">Post</Button>
			</form>
		</div>
	)
}
