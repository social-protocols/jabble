import MarkdownImpl from 'markdown-to-jsx'
import { type ReactNode } from 'react'

const DeactivatedLink: React.FC<{ children: ReactNode }> = ({
	children,
	...props
}) => <span {...props}>{children}</span>

// Wrapper around the Markdown component with deactiveateLinks option, that
// causes <a> elements to be rendered as (non-clickable) <span> elements. Use
// this if Markdown is being rendered inside of a <a> to prevent links inside
// of links.
export function Markdown({
	children,
	deactivateLinks,
	...props
}: {
	children: string
	deactivateLinks: boolean
}) {
	const overrides = deactivateLinks
		? {
				overrides: {
					a: {
						// Render links as Spans.
						component: DeactivatedLink,
					},
				},
		  }
		: {}

	const options = {
		...overrides,
		forceWrapper: true,
		forceBlock: true,
	}

	return (
		<MarkdownImpl options={options} {...props}>
			{children}
		</MarkdownImpl>
	)
}
