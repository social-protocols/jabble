import MarkdownImpl from 'markdown-to-jsx'

const DeactivatedLink = ({ children, ...props }) => (
	<span {...props}>{children}</span>
)

// Wrapper around the Markdown component with deactiveateLinks option, that
// causes <a> elements to be rendered as (non-clickable) <span> elements. Use
// this if Markdown is being rendered inside of a <a> to prevent links inside
// of links.
export function Markdown({
	children,
	deactivateLinks,
	...props
}: {
	children: any
	deactivateLinks: boolean
}) {
	// Render links as Spans.
	let options = deactivateLinks
		? {
				overrides: {
					a: {
						component: DeactivatedLink,
					},
				},
		  }
		: {}

	return (
		<MarkdownImpl options={options} {...props}>
			{children}
		</MarkdownImpl>
	)
}
