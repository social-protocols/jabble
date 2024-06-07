import { useNavigate } from '@remix-run/react'
import { Markdown } from '#app/components/markdown.tsx'
import { Truncate } from './truncate.tsx'

export function PostContent({
	content,
	maxLines,
	linkTo,
	deactivateLinks,
}: {
	content: string
	maxLines?: number
	deactivateLinks: boolean
	linkTo?: string
}) {
	const navigate = useNavigate()

	return (
		<div
			style={{ cursor: 'pointer' }}
			onClick={() => linkTo && navigate(linkTo)}
		>
			<Truncate lines={maxLines}>
				<Markdown deactivateLinks={deactivateLinks}>{content}</Markdown>
			</Truncate>
		</div>
	)
}
