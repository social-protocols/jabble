import { Markdown } from '#app/components/markdown.tsx'

export function InfoText({ className }: { className?: string }) {
	const infoText = `
### Hey, you are part of our early experiments! 🚀

Jabble is a fact-checking platform where everyone can participate.
Comments are ranked by how convincing they are (🔥), so make sure to provide short, clear, and strong arguments.
The more you vote on comments, the more impact your vote has on the final score.
Comments and votes are anonymous to avoid bias.

Everything you see here is a work in progress.
We would love to hear your feedback!
Join our [Zulip Chat](https://social-protocols.zulipchat.com/join/vfypnwc6nmr32l7nxjjhymnj/) and don't hesitate to ask any questions or present your ideas.
You can also contact us at <mailto:mail@social-protocols.org> or open [GitHub issues](https://github.com/social-protocols/jabble/issues).
	`

	return (
		<div
			className={
				'mb-4 rounded-xl border-2 border-dashed border-gray-500 p-4 text-sm ' +
				(className ?? '')
			}
		>
			<Markdown deactivateLinks={false}>{infoText}</Markdown>
		</div>
	)
}
