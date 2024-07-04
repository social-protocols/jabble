import { Markdown } from '#app/components/markdown.tsx'

export default function AboutRoute() {
	const aboutText = `
# About

**Jabble** is a new kind of conversation platform, designed to make conversations on the Internet more productive and less polarized.
It ranks content not only by how many votes it received, but according to **how convincing** it is. Convincingness is determined by analyzing votes. The more you vote, the more accurate the convincingness score becomes.
([learn more](https://github.com/social-protocols/social-network#readme)).

Everything you see here is work in progress.
**We would love to hear your feedback**!
Just use [this feedback form](https://forms.gle/dzJtsTJwPSsBihPUA) or submit a [GitHub issue](https://github.com/social-protocols/jabble/issues).

If you'd like to receive updates on our progress, [signup here](https://social-protocols.org/social-network/) to get notified about launches and updates.
	`

	return (
		<div className="text-body-sm">
			<Markdown deactivateLinks={false}>{aboutText}</Markdown>
		</div>
	)
}
