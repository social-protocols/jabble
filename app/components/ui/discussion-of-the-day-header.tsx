import { Markdown } from '#app/components/markdown.tsx'

export function DiscussionOfTheDayHeader({ className }: { className?: string }) {
	return (
		<div className={`markdown mb-4 mt-8 text-center ${className ?? ''}`}>
			<Markdown deactivateLinks={false}>## 🔥 Discussion of the Day 🔥</Markdown>
		</div>
	)
}
