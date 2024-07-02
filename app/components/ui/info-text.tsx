import { Markdown } from '#app/components/markdown.tsx'

export default function InfoText({ className }: { className?: string }) {
	const infoText = `
### Hey, you are part of our early experiments! 🚀

This platform ranks content not only by how many votes it received, but
according to **how convincing** it is
([learn more](https://github.com/social-protocols/social-network#readme)).
Everything you see here is work in progress.
We would love to hear your feedback!

Use [this feedback form](https://forms.gle/dzJtsTJwPSsBihPUA) or submit a [GitHub issue](https://github.com/social-protocols/jabble/issues).
	`

	return (
		<div className={"text-sm border-dashed border-2 border-gray-500 p-4 rounded-xl mb-4 " + (className ?? "")}>
			<Markdown deactivateLinks={false}>{infoText}</Markdown>
		</div>
	)
}


