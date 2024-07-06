import { Markdown } from '#app/components/markdown.tsx'

export function InfoText({ className }: { className?: string }) {
	const infoText = `
### Hey, you are part of our early experiments! 🚀

Jabble is designed to make conversations on the Internet more intelligent and less polarized. 
It does this by ranking content not only by how many votes it received, but according to **how convincing** (🔥) it is. 
The more you comment and vote in the conversation under a post, the more influence your votes will have ([learn more](https://github.com/social-protocols/social-network#readme)).

Everything you see here is work in progress.
We would love to hear your feedback!
Please use [this feedback form](https://forms.gle/dzJtsTJwPSsBihPUA) or submit a [GitHub issue](https://github.com/social-protocols/jabble/issues).
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
