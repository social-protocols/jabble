import { Markdown } from "#app/components/markdown.tsx"
import { PostForm } from "#app/components/ui/post-form.tsx"

export default function OpenDiscussionSubmissionPage() {
	const infoText = `
# Jabble Discussions

What would you like to discuss today?
`.trim()

	return (
		<div className="mb-4 flex flex-col space-y-2 rounded-xl border-2 border-solid border-gray-200 p-4 text-sm dark:border-gray-700">
			<div className="mb-4">
				<Markdown deactivateLinks={false}>{infoText}</Markdown>
			</div>
			<PostForm />
		</div>
	)
}
